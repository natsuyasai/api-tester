import { useCallback } from 'react'
import { YamlService } from '@/services/yamlService'
import { useTabStore } from '@renderer/stores/tabStore'

export const useYamlOperations = () => {
  const { tabs } = useTabStore()

  const exportYaml = useCallback(() => {
    return YamlService.exportToYaml(tabs)
  }, [tabs])

  const importYaml = useCallback((yamlContent: string) => {
    try {
      const importedTabs = YamlService.importFromYaml(yamlContent)

      if (importedTabs.length > 0) {
        importedTabs[0].isActive = true
        useTabStore.setState({
          tabs: importedTabs,
          activeTabId: importedTabs[0].id
        })
      }
    } catch (error) {
      console.error('Failed to import YAML:', error)
      throw error
    }
  }, [])

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
          throw new Error(writeResult.error || 'Failed to save file')
        }
      }
    } catch (error) {
      console.error('Failed to save file:', error)
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
          importYaml(readResult.data)
        }
      }
    } catch (error) {
      console.error('Failed to load file:', error)
      throw error
    }
  }, [importYaml])

  return {
    exportYaml,
    importYaml,
    saveToFile,
    loadFromFile
  }
}
