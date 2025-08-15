import { useEffect, useCallback } from 'react'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'

/**
 * タブとコレクションの自動同期機能を管理するカスタムフック
 * イベント駆動方式でリアルタイム同期を実現
 */
export const useTabCollectionSync = () => {
  const { tabs } = useTabStore()
  const { collections } = useCollectionStore()
  const collectionStore = useCollectionStore()
  const tabStore = useTabStore()

  // 同期処理を関数として分離
  const syncTabsWithCollections = useCallback(() => {
    const currentTabs = tabs
    const currentCollections = collections

    // すべてのコレクションのタブリストを更新
    currentCollections.forEach((collection) => {
      const collectionTabs = currentTabs
        .filter((tab) => tab.collectionId === collection.id)
        .map((tab) => tab.id)

      // 現在のタブリストと異なる場合のみ更新
      const currentTabIds = collection.tabs || []
      const hasChanges =
        collectionTabs.length !== currentTabIds.length ||
        collectionTabs.some((tabId) => !currentTabIds.includes(tabId))

      if (hasChanges) {
        collectionStore.updateCollection(collection.id, {
          tabs: collectionTabs
        })
      }

      // アクティブタブの同期
      if (collection.activeTabId) {
        const activeTabExists = collectionTabs.includes(collection.activeTabId)
        if (!activeTabExists) {
          // アクティブタブが存在しない場合、最初のタブをアクティブにする
          const newActiveTab = collectionTabs.length > 0 ? collectionTabs[0] : undefined
          collectionStore.setCollectionActiveTab(collection.id, newActiveTab)
        }
      }
    })

    // コレクションに属していないタブの処理
    const orphanedTabs = currentTabs.filter((tab) => {
      if (!tab.collectionId) return false
      return !currentCollections.some((collection) => collection.id === tab.collectionId)
    })

    // 存在しないコレクションを参照しているタブのcollectionIdをクリア
    orphanedTabs.forEach((tab) => {
      tabStore.setTabCollection(tab.id, undefined)
    })
  }, [tabs, collections, collectionStore, tabStore])

  // タブやコレクションの変更を監視してリアルタイム同期
  useEffect(() => {
    syncTabsWithCollections()
  }, [syncTabsWithCollections])

  // 手動同期用の関数
  const forceSync = useCallback(() => {
    syncTabsWithCollections()
  }, [syncTabsWithCollections])

  return {
    forceSync
  }
}
