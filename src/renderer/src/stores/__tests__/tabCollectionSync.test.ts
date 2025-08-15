import { describe, it, expect, beforeEach } from 'vitest'
import { useCollectionStore } from '../collectionStore'
import { useTabStore } from '../tabStore'

describe('タブとコレクションの同期テスト', () => {
  beforeEach(() => {
    // ストアをリセット
    useTabStore.getState().resetTabs()
    useCollectionStore.setState({
      collections: [],
      executionHistory: [],
      maxHistorySize: 100,
      searchQuery: '',
      activeCollectionId: undefined,
      filterOptions: {}
    })
  })

  describe('タブ作成時の同期', () => {
    it('コレクションIDを指定してタブを作成すると、コレクション側にもタブが追加される', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成（コレクションID指定）
      const tabId = tabStore.addTab(collectionId)

      // タブにcollectionIdが設定されていることを確認
      const tab = tabStore.getTab(tabId)
      expect(tab?.collectionId).toBe(collectionId)

      // コレクション側にもタブが追加されていることを確認
      const collection = collectionStore.getCollection(collectionId)
      expect(collection?.tabs).toContain(tabId)
    })

    it('コレクションIDを指定せずにタブを作成すると、どのコレクションにも属さない', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成（コレクションID未指定）
      const tabId = tabStore.addTab()

      // タブにcollectionIdが設定されていないことを確認
      const tab = tabStore.getTab(tabId)
      expect(tab?.collectionId).toBeUndefined()

      // コレクション側にもタブが追加されていないことを確認
      const collection = collectionStore.getCollection(collectionId)
      expect(collection?.tabs).not.toContain(tabId)
    })
  })

  describe('タブ削除時の同期', () => {
    it('コレクションに属するタブを削除すると、コレクション側からも削除される', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成
      const tabId1 = tabStore.addTab(collectionId)
      const tabId2 = tabStore.addTab(collectionId)

      // 最初の状態を確認
      expect(collectionStore.getCollection(collectionId)?.tabs).toEqual([tabId1, tabId2])

      // タブを削除
      tabStore.closeTab(tabId1)

      // タブストアから削除されていることを確認
      expect(tabStore.getTab(tabId1)).toBeUndefined()

      // コレクションからも削除されていることを確認
      expect(collectionStore.getCollection(collectionId)?.tabs).toEqual([tabId2])
    })

    it('コレクションに属さないタブを削除しても、コレクションには影響しない', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // コレクションに属するタブと属さないタブを作成
      const tabId1 = tabStore.addTab(collectionId)
      const tabId2 = tabStore.addTab() // コレクション未指定

      // 最初の状態を確認
      expect(collectionStore.getCollection(collectionId)?.tabs).toEqual([tabId1])

      // コレクションに属さないタブを削除
      tabStore.closeTab(tabId2)

      // コレクションの状態が変わっていないことを確認
      expect(collectionStore.getCollection(collectionId)?.tabs).toEqual([tabId1])
    })
  })

  describe('タブのコレクション変更時の同期', () => {
    it('タブのコレクションを変更すると、新旧コレクション両方で同期される', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // 2つのコレクションを作成
      const collectionId1 = collectionStore.createCollection('コレクション1')
      const collectionId2 = collectionStore.createCollection('コレクション2')

      // タブを作成（最初のコレクションに属させる）
      const tabId = tabStore.addTab(collectionId1)

      // 最初の状態を確認
      expect(collectionStore.getCollection(collectionId1)?.tabs).toContain(tabId)
      expect(collectionStore.getCollection(collectionId2)?.tabs).not.toContain(tabId)

      // タブのコレクションを変更
      tabStore.setTabCollection(tabId, collectionId2)

      // タブのcollectionIdが更新されていることを確認
      expect(tabStore.getTab(tabId)?.collectionId).toBe(collectionId2)

      // 元のコレクションから削除されていることを確認
      expect(collectionStore.getCollection(collectionId1)?.tabs).not.toContain(tabId)

      // 新しいコレクションに追加されていることを確認
      expect(collectionStore.getCollection(collectionId2)?.tabs).toContain(tabId)
    })

    it('タブをコレクションから除外すると、コレクション側からも削除される', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成
      const tabId = tabStore.addTab(collectionId)

      // 最初の状態を確認
      expect(collectionStore.getCollection(collectionId)?.tabs).toContain(tabId)

      // タブをコレクションから除外
      tabStore.setTabCollection(tabId, undefined)

      // タブのcollectionIdがクリアされていることを確認
      expect(tabStore.getTab(tabId)?.collectionId).toBeUndefined()

      // コレクションから削除されていることを確認
      expect(collectionStore.getCollection(collectionId)?.tabs).not.toContain(tabId)
    })
  })

  describe('コレクション削除時の同期', () => {
    it('コレクションを削除すると、関連するタブのcollectionIdがクリアされる', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成
      const tabId1 = tabStore.addTab(collectionId)
      const tabId2 = tabStore.addTab(collectionId)

      // 最初の状態を確認
      expect(tabStore.getTab(tabId1)?.collectionId).toBe(collectionId)
      expect(tabStore.getTab(tabId2)?.collectionId).toBe(collectionId)

      // コレクションを削除
      collectionStore.deleteCollection(collectionId)

      // クリーンアップ処理を実行
      tabStore.cleanupDeletedCollections()

      // タブのcollectionIdがクリアされていることを確認
      expect(tabStore.getTab(tabId1)?.collectionId).toBeUndefined()
      expect(tabStore.getTab(tabId2)?.collectionId).toBeUndefined()

      // コレクション自体が削除されていることを確認
      expect(collectionStore.getCollection(collectionId)).toBeUndefined()
    })

    it('存在しないコレクションIDを持つタブがある場合、クリーンアップでcollectionIdがクリアされる', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // コレクションを作成
      const collectionId = collectionStore.createCollection('テストコレクション')

      // タブを作成
      const tabId = tabStore.addTab(collectionId)

      // タブの状態を確認
      expect(tabStore.getTab(tabId)?.collectionId).toBe(collectionId)

      // コレクションを削除（直接削除してタブストアとの同期を避ける）
      useCollectionStore.setState({
        collections: collectionStore.collections.filter((c) => c.id !== collectionId)
      })

      // クリーンアップ処理を実行
      tabStore.cleanupDeletedCollections()

      // タブのcollectionIdがクリアされていることを確認
      expect(tabStore.getTab(tabId)?.collectionId).toBeUndefined()
    })
  })

  describe('複数操作の整合性', () => {
    it('複数のタブ操作を連続して実行しても、同期状態が保たれる', () => {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // 2つのコレクションを作成
      const collectionId1 = collectionStore.createCollection('コレクション1')
      const collectionId2 = collectionStore.createCollection('コレクション2')

      // 複数のタブを作成
      const tabId1 = tabStore.addTab(collectionId1)
      const tabId2 = tabStore.addTab(collectionId1)
      const tabId3 = tabStore.addTab(collectionId2)

      // 初期状態を確認
      expect(collectionStore.getCollection(collectionId1)?.tabs).toEqual([tabId1, tabId2])
      expect(collectionStore.getCollection(collectionId2)?.tabs).toEqual([tabId3])

      // タブの移動
      tabStore.setTabCollection(tabId2, collectionId2)

      // 移動後の状態を確認
      expect(collectionStore.getCollection(collectionId1)?.tabs).toEqual([tabId1])
      expect(collectionStore.getCollection(collectionId2)?.tabs).toEqual([tabId3, tabId2])

      // タブの削除
      tabStore.closeTab(tabId3)

      // 削除後の状態を確認
      expect(collectionStore.getCollection(collectionId2)?.tabs).toEqual([tabId2])

      // 残りの状態確認
      expect(tabStore.getTab(tabId1)?.collectionId).toBe(collectionId1)
      expect(tabStore.getTab(tabId2)?.collectionId).toBe(collectionId2)
      expect(tabStore.getTab(tabId3)).toBeUndefined()
    })
  })
})
