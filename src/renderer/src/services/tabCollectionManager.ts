import { v4 as uuidv4 } from 'uuid'
import { ApiTab, Collection } from '@/types/types'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'

/**
 * タブとコレクションの統一管理サービス
 * アトミックな操作と一貫性のあるデータ管理を提供
 */
export class TabCollectionManager {
  /**
   * コレクションに新しいタブを作成
   */
  static createTabInCollection(collectionId: string): string {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()

    // コレクションの存在確認
    const collection = collectionStore.getCollection(collectionId)
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`)
    }

    // 新しいタブを作成
    const newTabId = tabStore.addTab(collectionId)

    // コレクションにタブIDを追加
    collectionStore.addTabToCollection(collectionId, newTabId)
    collectionStore.setCollectionActiveTab(collectionId, newTabId)

    console.log(`Created tab ${newTabId} in collection ${collectionId}`)
    return newTabId
  }

  /**
   * タブを別のコレクションに移動
   */
  static moveTabToCollection(
    tabId: string,
    fromCollectionId: string | undefined,
    toCollectionId: string
  ): void {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()

    // タブの存在確認
    const tab = tabStore.tabs.find((t) => t.id === tabId)
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`)
    }

    // 移動先コレクションの存在確認
    const toCollection = collectionStore.getCollection(toCollectionId)
    if (!toCollection) {
      throw new Error(`Target collection not found: ${toCollectionId}`)
    }

    // 元のコレクションからタブを削除
    if (fromCollectionId) {
      collectionStore.removeTabFromCollection(fromCollectionId, tabId)
    }

    // タブのコレクション参照を更新
    tabStore.setTabCollection(tabId, toCollectionId)

    // 新しいコレクションにタブを追加
    collectionStore.addTabToCollection(toCollectionId, tabId)

    console.log(`Moved tab ${tabId} from ${fromCollectionId} to ${toCollectionId}`)
  }

  /**
   * タブを削除（関連するコレクション情報も更新）
   */
  static deleteTab(tabId: string): void {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()

    // タブの存在確認
    const tab = tabStore.tabs.find((t) => t.id === tabId)
    if (!tab) {
      console.warn(`Tab not found: ${tabId}`)
      return
    }

    // コレクションからタブを削除
    if (tab.collectionId) {
      collectionStore.removeTabFromCollection(tab.collectionId, tabId)
    }

    // タブを削除
    tabStore.closeTab(tabId)

    console.log(`Deleted tab ${tabId}`)
  }

  /**
   * コレクションを削除（関連するタブも削除）
   */
  static deleteCollection(collectionId: string): void {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()

    // コレクションの存在確認
    const collection = collectionStore.getCollection(collectionId)
    if (!collection) {
      console.warn(`Collection not found: ${collectionId}`)
      return
    }

    // コレクションに属するタブを削除
    const collectionTabs = tabStore.tabs.filter((tab) => tab.collectionId === collectionId)
    collectionTabs.forEach((tab) => {
      tabStore.closeTab(tab.id)
    })

    // コレクションを削除
    collectionStore.deleteCollection(collectionId)

    console.log(`Deleted collection ${collectionId} and ${collectionTabs.length} tabs`)
  }

  /**
   * 新しいコレクションを作成して初期タブも作成
   */
  static createCollectionWithTab(
    name: string,
    description?: string,
    parentId?: string
  ): { collectionId: string; tabId: string } {
    const collectionStore = useCollectionStore.getState()

    // コレクションを作成（初期タブ作成を無効化）
    const collectionId = collectionStore.createCollection(name, description, parentId)

    // 初期タブを作成
    const tabId = this.createTabInCollection(collectionId)

    console.log(`Created collection ${collectionId} with initial tab ${tabId}`)
    return { collectionId, tabId }
  }

  /**
   * すべてのタブとコレクションの同期を強制実行
   */
  static syncAllCollections(): void {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()

    console.log('Starting manual sync of all collections and tabs')

    // すべてのコレクションのタブリストを再計算
    collectionStore.collections.forEach((collection) => {
      const collectionTabs = tabStore.tabs
        .filter((tab) => tab.collectionId === collection.id)
        .map((tab) => tab.id)

      // タブリストが異なる場合は更新
      const currentTabs = collection.tabs || []
      const hasChanges =
        collectionTabs.length !== currentTabs.length ||
        collectionTabs.some((tabId) => !currentTabs.includes(tabId))

      if (hasChanges) {
        collectionStore.updateCollection(collection.id, {
          tabs: collectionTabs
        })
      }

      // アクティブタブの確認と修正
      if (collection.activeTabId && !collectionTabs.includes(collection.activeTabId)) {
        const newActiveTab = collectionTabs.length > 0 ? collectionTabs[0] : undefined
        collectionStore.setCollectionActiveTab(collection.id, newActiveTab)
      }
    })

    // 孤立したタブの処理
    const orphanedTabs = tabStore.tabs.filter((tab) => {
      if (!tab.collectionId) return false
      return !collectionStore.collections.some((collection) => collection.id === tab.collectionId)
    })

    orphanedTabs.forEach((tab) => {
      console.warn(`Found orphaned tab: ${tab.id}, clearing collection reference`)
      tabStore.setTabCollection(tab.id, undefined)
    })

    console.log(
      `Sync completed. Processed ${collectionStore.collections.length} collections, found ${orphanedTabs.length} orphaned tabs`
    )
  }

  /**
   * タブを追加モードでインポート（既存データを保持）
   */
  static importTabsWithMerge(importedTabs: ApiTab[]): void {
    const tabStore = useTabStore.getState()

    // 新しいIDを生成してコンフリクトを回避
    const processedTabs = importedTabs.map((tab) => ({
      ...tab,
      id: uuidv4(),
      isActive: false,
      request: {
        ...tab.request,
        id: uuidv4()
      }
    }))

    // 既存のタブと結合
    const updatedTabs = [
      ...tabStore.tabs.map((tab) => ({ ...tab, isActive: false })),
      ...processedTabs
    ]

    // 最初のインポートタブをアクティブに設定
    const firstImportedTab = processedTabs[0]
    if (firstImportedTab) {
      firstImportedTab.isActive = true
    }

    // タブストアを更新
    useTabStore.setState({
      tabs: updatedTabs,
      activeTabId: firstImportedTab?.id || tabStore.activeTabId
    })

    console.log(`Imported ${processedTabs.length} tabs with merge mode`)
  }

  /**
   * タブを置き換えモードでインポート（既存データを削除）
   */
  static importTabsWithReplace(importedTabs: ApiTab[]): void {
    // 新しいIDを生成
    const processedTabs = importedTabs.map((tab, index) => ({
      ...tab,
      id: uuidv4(),
      isActive: index === 0,
      request: {
        ...tab.request,
        id: uuidv4()
      }
    }))

    // タブストアを更新
    useTabStore.setState({
      tabs: processedTabs,
      activeTabId: processedTabs[0]?.id || ''
    })

    console.log(`Imported ${processedTabs.length} tabs with replace mode`)
  }

  /**
   * コレクションとタブを追加モードでインポート（既存データを保持）
   */
  static importCollectionsWithMerge(
    importedCollections: Collection[],
    importedTabs: ApiTab[]
  ): void {
    const tabStore = useTabStore.getState()

    // IDマッピングを作成（コンフリクト回避）
    const collectionIdMap = new Map<string, string>()
    const tabIdMap = new Map<string, string>()

    // 新しいコレクションID生成
    importedCollections.forEach((collection) => {
      collectionIdMap.set(collection.id, uuidv4())
    })

    // 新しいタブID生成
    importedTabs.forEach((tab) => {
      tabIdMap.set(tab.id, uuidv4())
    })

    // コレクション処理
    const processedCollections = importedCollections.map((collection) => {
      const newId = collectionIdMap.get(collection.id)!
      return {
        ...collection,
        id: newId,
        parentId: collection.parentId
          ? collectionIdMap.get(collection.parentId)
          : collection.parentId,
        tabs: (collection.tabs || []).map((tabId) => tabIdMap.get(tabId) || tabId),
        activeTabId: collection.activeTabId
          ? tabIdMap.get(collection.activeTabId)
          : collection.activeTabId
      }
    })

    // タブ処理
    const processedTabs = importedTabs.map((tab) => ({
      ...tab,
      id: tabIdMap.get(tab.id)!,
      isActive: false,
      collectionId: tab.collectionId ? collectionIdMap.get(tab.collectionId) : tab.collectionId,
      request: {
        ...tab.request,
        id: uuidv4()
      }
    }))

    // 既存データと結合
    const mergedCollections = [
      ...useCollectionStore.getState().collections,
      ...processedCollections
    ]
    const mergedTabs = [
      ...tabStore.tabs.map((tab) => ({ ...tab, isActive: false })),
      ...processedTabs
    ]

    // 最初のインポートタブをアクティブに設定
    const firstImportedTab = processedTabs[0]
    if (firstImportedTab) {
      firstImportedTab.isActive = true
    }

    // ストアを更新
    useCollectionStore.setState({ collections: mergedCollections })
    useTabStore.setState({
      tabs: mergedTabs,
      activeTabId: firstImportedTab?.id || tabStore.activeTabId
    })

    console.log(
      `Imported ${processedCollections.length} collections and ${processedTabs.length} tabs with merge mode`
    )
  }

  /**
   * コレクションとタブを置き換えモードでインポート（既存データを削除）
   */
  static importCollectionsWithReplace(
    importedCollections: Collection[],
    importedTabs: ApiTab[]
  ): void {
    // IDマッピングを作成
    const collectionIdMap = new Map<string, string>()
    const tabIdMap = new Map<string, string>()

    // 新しいコレクションID生成
    importedCollections.forEach((collection) => {
      collectionIdMap.set(collection.id, uuidv4())
    })

    // 新しいタブID生成
    importedTabs.forEach((tab) => {
      tabIdMap.set(tab.id, uuidv4())
    })

    // コレクション処理
    const processedCollections = importedCollections.map((collection) => {
      const newId = collectionIdMap.get(collection.id)!
      return {
        ...collection,
        id: newId,
        parentId: collection.parentId
          ? collectionIdMap.get(collection.parentId)
          : collection.parentId,
        tabs: (collection.tabs || []).map((tabId) => tabIdMap.get(tabId) || tabId),
        activeTabId: collection.activeTabId
          ? tabIdMap.get(collection.activeTabId)
          : collection.activeTabId
      }
    })

    // タブ処理
    const processedTabs = importedTabs.map((tab, index) => ({
      ...tab,
      id: tabIdMap.get(tab.id)!,
      isActive: index === 0,
      collectionId: tab.collectionId ? collectionIdMap.get(tab.collectionId) : tab.collectionId,
      request: {
        ...tab.request,
        id: uuidv4()
      }
    }))

    // ストアを完全に置き換え
    useCollectionStore.setState({ collections: processedCollections })
    useTabStore.setState({
      tabs: processedTabs,
      activeTabId: processedTabs[0]?.id || ''
    })

    // アクティブコレクションを設定
    if (processedCollections.length > 0) {
      useCollectionStore.getState().setActiveCollection(processedCollections[0].id)
    }

    console.log(
      `Imported ${processedCollections.length} collections and ${processedTabs.length} tabs with replace mode`
    )
  }

  /**
   * デバッグ用: 現在の状態を検証
   */
  static validateState(): { isValid: boolean; errors: string[] } {
    const tabStore = useTabStore.getState()
    const collectionStore = useCollectionStore.getState()
    const errors: string[] = []

    // タブとコレクションの整合性チェック
    tabStore.tabs.forEach((tab) => {
      if (tab.collectionId) {
        const collection = collectionStore.collections.find((c) => c.id === tab.collectionId)
        if (!collection) {
          errors.push(`Tab ${tab.id} references non-existent collection ${tab.collectionId}`)
        } else if (!collection.tabs?.includes(tab.id)) {
          errors.push(`Collection ${tab.collectionId} does not include tab ${tab.id}`)
        }
      }
    })

    // コレクションのタブ参照チェック
    collectionStore.collections.forEach((collection) => {
      collection.tabs?.forEach((tabId) => {
        const tab = tabStore.tabs.find((t) => t.id === tabId)
        if (!tab) {
          errors.push(`Collection ${collection.id} references non-existent tab ${tabId}`)
        } else if (tab.collectionId !== collection.id) {
          errors.push(
            `Tab ${tabId} collection reference mismatch: expected ${collection.id}, got ${tab.collectionId}`
          )
        }
      })

      // アクティブタブチェック
      if (collection.activeTabId) {
        const activeTab = tabStore.tabs.find((t) => t.id === collection.activeTabId)
        if (!activeTab) {
          errors.push(
            `Collection ${collection.id} has non-existent active tab ${collection.activeTabId}`
          )
        } else if (activeTab.collectionId !== collection.id) {
          errors.push(
            `Collection ${collection.id} active tab ${collection.activeTabId} belongs to different collection`
          )
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
