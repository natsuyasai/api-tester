import { useEffect } from 'react'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'

/**
 * タブとコレクションの自動同期機能を管理するカスタムフック
 */
export const useTabCollectionSync = () => {
  const tabStore = useTabStore()
  const collectionStore = useCollectionStore()

  useEffect(() => {
    // タブが追加・削除・変更されたときの同期処理
    const syncTabsWithCollections = () => {
      const tabs = tabStore.tabs
      const collections = collectionStore.collections

      // すべてのコレクションのタブリストを更新
      collections.forEach((collection) => {
        const collectionTabs = tabs
          .filter((tab) => tab.collectionId === collection.id)
          .map((tab) => tab.id)

        // 現在のタブリストと異なる場合のみ更新
        const currentTabs = collection.tabs || []
        const hasChanges =
          collectionTabs.length !== currentTabs.length ||
          collectionTabs.some((tabId) => !currentTabs.includes(tabId))

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
      const orphanedTabs = tabs.filter((tab) => {
        if (!tab.collectionId) return false
        return !collections.some((collection) => collection.id === tab.collectionId)
      })

      // 存在しないコレクションを参照しているタブのcollectionIdをクリア
      orphanedTabs.forEach((tab) => {
        tabStore.setTabCollection(tab.id, undefined)
      })
    }

    // 初回同期
    syncTabsWithCollections()

    // タブの変更を監視するためのポーリング（実際のアプリでは別の方法を検討）
    const interval = setInterval(syncTabsWithCollections, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [tabStore, collectionStore])

  // 手動同期用の関数
  const forcSync = () => {
    // タブとコレクションの強制同期
    const tabs = tabStore.tabs
    const collections = collectionStore.collections

    collections.forEach((collection) => {
      const collectionTabs = tabs
        .filter((tab) => tab.collectionId === collection.id)
        .map((tab) => tab.id)

      collectionStore.updateCollection(collection.id, {
        tabs: collectionTabs
      })
    })
  }

  return {
    forcSync
  }
}
