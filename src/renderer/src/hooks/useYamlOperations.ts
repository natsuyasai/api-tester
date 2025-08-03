import { useCallback } from 'react'
import { TabCollectionManager } from '@renderer/services/tabCollectionManager'
import { YamlService } from '@renderer/services/yamlService'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { showErrorDialog } from '@renderer/utils/errorUtils'
// import type { ApiTab, Collection } from '@/types/types'

export const useYamlOperations = () => {
  const { tabs } = useTabStore()

  const exportYaml = useCallback(() => {
    return YamlService.exportToYamlWithVariables(tabs)
  }, [tabs])

  const exportYamlRaw = useCallback(() => {
    return YamlService.exportToYaml(tabs)
  }, [tabs])

  const importTabsFromYaml = useCallback(
    async (yamlContent: string) => {
      const importedTabs = YamlService.importFromYaml(yamlContent)

      if (importedTabs.length === 0) {
        await showErrorDialog(
          'インポートエラー',
          'インポートできるタブが見つかりませんでした',
          'YAMLファイルにリクエストが含まれていません'
        )
        return
      }

      const currentTabs = tabs
      const hasExistingTabs = currentTabs.length > 0

      // 既存タブがある場合は確認ダイアログを表示
      if (hasExistingTabs) {
        const shouldReplace = await window.dialogAPI.showModalMessageBox({
          type: 'question',
          buttons: ['キャンセル', '追加', '置き換え'],
          defaultId: 1,
          title: 'インポート確認',
          message: `${importedTabs.length}個のタブをインポートします`,
          detail: `現在${currentTabs.length}個のタブが開いています。\n\n・追加: 既存タブに追加\n・置き換え: 既存タブを削除して置き換え`
        })

        if (shouldReplace.response === 0) {
          // キャンセル
          return
        }

        if (shouldReplace.response === 1) {
          // 追加モード
          TabCollectionManager.importTabsWithMerge(importedTabs)
        } else {
          // 置き換えモード
          TabCollectionManager.importTabsWithReplace(importedTabs)
        }
      } else {
        // 既存タブがない場合は直接インポート
        TabCollectionManager.importTabsWithReplace(importedTabs)
      }
    },
    [tabs]
  )

  const importCollectionsFromYaml = useCallback(
    async (yamlContent: string) => {
      const { collections: importedCollections, tabs: importedTabs } =
        YamlService.importCollectionsFromYaml(yamlContent)

      if (importedCollections.length === 0) {
        await showErrorDialog(
          'インポートエラー',
          'インポートできるコレクションが見つかりませんでした',
          'YAMLファイルにコレクションが含まれていません'
        )
        return
      }

      const { collections } = useCollectionStore.getState()
      const currentTabs = tabs
      const hasExistingData = collections.length > 0 || currentTabs.length > 0

      // 既存データがある場合は確認ダイアログを表示
      if (hasExistingData) {
        const shouldReplace = await window.dialogAPI.showModalMessageBox({
          type: 'question',
          buttons: ['キャンセル', '追加', '置き換え'],
          defaultId: 1,
          title: 'インポート確認',
          message: `${importedCollections.length}個のコレクションと${importedTabs.length}個のタブをインポートします`,
          detail: `現在${collections.length}個のコレクションと${currentTabs.length}個のタブがあります。\n\n・追加: 既存データに追加\n・置き換え: 既存データを削除して置き換え`
        })

        if (shouldReplace.response === 0) {
          // キャンセル
          return
        }

        if (shouldReplace.response === 1) {
          // 追加モード
          TabCollectionManager.importCollectionsWithMerge(importedCollections, importedTabs)
        } else {
          // 置き換えモード
          TabCollectionManager.importCollectionsWithReplace(importedCollections, importedTabs)
        }
      } else {
        // 既存データがない場合は直接インポート
        TabCollectionManager.importCollectionsWithReplace(importedCollections, importedTabs)
      }
    },
    [tabs]
  )

  const importYaml = useCallback(
    async (yamlContent: string) => {
      try {
        // v2.0形式（コレクション対応）をチェック
        const isV2Format =
          yamlContent.includes('version: "2.0"') || yamlContent.includes("version: '2.0'")

        if (isV2Format) {
          await importCollectionsFromYaml(yamlContent)
        } else {
          await importTabsFromYaml(yamlContent)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        void showErrorDialog(
          'YAML インポートエラー',
          'YAMLファイルのインポート中にエラーが発生しました',
          errorMessage
        )
        throw error
      }
    },
    [importCollectionsFromYaml, importTabsFromYaml]
  )

  const saveToFile = useCallback(async () => {
    try {
      const yamlContent = exportYaml()
      const result = await window.dialogAPI.showSaveDialog({
        title: 'Save API Collection',
        defaultPath: 'api-collection.yaml',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, yamlContent)
        if (!writeResult.success) {
          throw new Error(writeResult.error ?? 'Failed to save file')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'ファイル保存エラー',
        'ファイルの保存中にエラーが発生しました',
        errorMessage
      )
      throw error
    }
  }, [exportYaml])

  const loadFromFile = useCallback(async () => {
    try {
      const result = await window.dialogAPI.showOpenDialog({
        title: 'Load API Collection',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const readResult = await window.fileAPI.readFile(result.filePaths[0])
        if (!readResult.success) {
          throw new Error(readResult.error || 'Failed to read file')
        }

        if (readResult.data) {
          await importYaml(readResult.data)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'ファイル読み込みエラー',
        'ファイルの読み込み中にエラーが発生しました',
        errorMessage
      )
      throw error
    }
  }, [importYaml])

  return {
    exportYaml,
    exportYamlRaw,
    importYaml,
    saveToFile,
    loadFromFile
  }
}
