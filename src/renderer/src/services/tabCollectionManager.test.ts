import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiTab, Collection } from '@/types/types'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { TabCollectionManager } from './tabCollectionManager'

// モック設定
vi.mock('@renderer/stores/collectionStore')
vi.mock('@renderer/stores/tabStore')

describe('TabCollectionManager', () => {
  let mockCollectionStore: any
  let mockTabStore: any

  beforeEach(() => {
    // モックストアの初期化
    mockCollectionStore = {
      collections: [],
      activeCollectionId: undefined,
      createCollection: vi.fn(),
      deleteCollection: vi.fn(),
      setActiveCollection: vi.fn(),
      getCollection: vi.fn(),
      addTabToCollection: vi.fn(),
      removeTabFromCollection: vi.fn(),
      setCollectionActiveTab: vi.fn(),
      updateCollection: vi.fn()
    }

    mockTabStore = {
      tabs: [],
      activeTabId: '',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setTabCollection: vi.fn(),
      setActiveTab: vi.fn(),
      getTab: vi.fn()
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    vi.mocked(useCollectionStore.getState).mockReturnValue(mockCollectionStore)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    vi.mocked(useTabStore.getState).mockReturnValue(mockTabStore)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(useTabStore.setState).mockImplementation(() => {})
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(useCollectionStore.setState).mockImplementation(() => {})
  })

  describe('moveTabsToUncollected', () => {
    it('指定されたコレクションのタブを未選択状態に移動できる', () => {
      const collectionId = 'collection-1'
      const tab1: ApiTab = {
        id: 'tab-1',
        title: 'Test Tab 1',
        collectionId,
        isActive: true,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      const tab2: ApiTab = {
        id: 'tab-2',
        title: 'Test Tab 2',
        collectionId,
        isActive: false,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-2',
          name: 'Test Request 2',
          url: 'https://example.com/api',
          method: 'POST',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      mockTabStore.tabs = [tab1, tab2]

      TabCollectionManager.moveTabsToUncollected(collectionId)

      // タブのcollectionIdがクリアされることを確認
      expect(mockTabStore.setTabCollection).toHaveBeenCalledWith('tab-1', undefined)
      expect(mockTabStore.setTabCollection).toHaveBeenCalledWith('tab-2', undefined)

      // コレクションからタブが削除されることを確認
      expect(mockCollectionStore.removeTabFromCollection).toHaveBeenCalledWith(
        collectionId,
        'tab-1'
      )
      expect(mockCollectionStore.removeTabFromCollection).toHaveBeenCalledWith(
        collectionId,
        'tab-2'
      )
    })

    it('指定されたコレクションにタブがない場合は何もしない', () => {
      const collectionId = 'collection-1'
      mockTabStore.tabs = []

      TabCollectionManager.moveTabsToUncollected(collectionId)

      expect(mockTabStore.setTabCollection).not.toHaveBeenCalled()
      expect(mockCollectionStore.removeTabFromCollection).not.toHaveBeenCalled()
    })
  })

  describe('setActiveCollectionSafely', () => {
    it('コレクション選択解除時に既存の未選択タブがある場合はそれをアクティブにする', () => {
      const previousCollectionId = 'collection-1'
      mockCollectionStore.activeCollectionId = previousCollectionId

      const collectionTab: ApiTab = {
        id: 'collection-tab-1',
        title: 'Collection Tab',
        collectionId: previousCollectionId,
        isActive: true,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      const uncollectedTab: ApiTab = {
        id: 'uncollected-tab-1',
        title: 'Uncollected Tab',
        collectionId: undefined,
        isActive: false,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-2',
          name: 'Uncollected Request',
          url: 'https://example.com/api',
          method: 'POST',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      mockTabStore.tabs = [collectionTab, uncollectedTab]

      // コレクション選択を解除
      TabCollectionManager.setActiveCollectionSafely(undefined)

      // 既存の未選択タブがアクティブになることを確認
      expect(mockTabStore.setActiveTab).toHaveBeenCalledWith('uncollected-tab-1')

      // 新しいタブは作成されない
      expect(mockTabStore.addTab).not.toHaveBeenCalled()

      // アクティブコレクションが変更されることを確認
      expect(mockCollectionStore.setActiveCollection).toHaveBeenCalledWith(undefined)
    })

    it('コレクション選択解除時に未選択タブがない場合は新しい未選択タブを作成する', () => {
      const previousCollectionId = 'collection-1'
      mockCollectionStore.activeCollectionId = previousCollectionId

      const tab1: ApiTab = {
        id: 'tab-1',
        title: 'Test Tab 1',
        collectionId: previousCollectionId,
        isActive: true,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      mockTabStore.tabs = [tab1] // コレクションタブのみ存在
      mockTabStore.addTab.mockReturnValue('new-tab-id')

      // コレクション選択を解除
      TabCollectionManager.setActiveCollectionSafely(undefined)

      // 新しい未選択タブが作成されることを確認
      expect(mockTabStore.addTab).toHaveBeenCalledWith(undefined)

      // アクティブコレクションが変更されることを確認
      expect(mockCollectionStore.setActiveCollection).toHaveBeenCalledWith(undefined)

      // 既存のコレクションタブは移動されない
      expect(mockTabStore.setTabCollection).not.toHaveBeenCalled()
      expect(mockCollectionStore.removeTabFromCollection).not.toHaveBeenCalled()
    })

    it('新しいコレクションを選択時にはタブ移動は行われない', () => {
      const newCollectionId = 'collection-2'
      mockCollectionStore.activeCollectionId = 'collection-1'

      TabCollectionManager.setActiveCollectionSafely(newCollectionId)

      // タブ移動は行われない
      expect(mockTabStore.setTabCollection).not.toHaveBeenCalled()
      expect(mockCollectionStore.removeTabFromCollection).not.toHaveBeenCalled()

      // アクティブコレクションが変更される
      expect(mockCollectionStore.setActiveCollection).toHaveBeenCalledWith(newCollectionId)
    })

    it('以前にアクティブなコレクションがない場合はタブ移動は行われない', () => {
      mockCollectionStore.activeCollectionId = undefined

      TabCollectionManager.setActiveCollectionSafely(undefined)

      // タブ移動は行われない
      expect(mockTabStore.setTabCollection).not.toHaveBeenCalled()
      expect(mockCollectionStore.removeTabFromCollection).not.toHaveBeenCalled()

      // アクティブコレクションが設定される
      expect(mockCollectionStore.setActiveCollection).toHaveBeenCalledWith(undefined)
    })
  })

  describe('validateState', () => {
    it('正常な状態の場合はバリデーションが成功する', () => {
      const collection: Collection = {
        id: 'collection-1',
        name: 'Test Collection',
        description: 'Test description',
        children: [],
        requests: [],
        tabs: ['tab-1'],
        activeTabId: 'tab-1',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }

      const tab: ApiTab = {
        id: 'tab-1',
        title: 'Test Tab',
        collectionId: 'collection-1',
        isActive: true,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      mockCollectionStore.collections = [collection]
      mockTabStore.tabs = [tab]

      const result = TabCollectionManager.validateState()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('存在しないコレクションを参照するタブがある場合はバリデーションが失敗する', () => {
      const tab: ApiTab = {
        id: 'tab-1',
        title: 'Test Tab',
        collectionId: 'non-existent-collection',
        isActive: true,
        response: null,
        isCustomTitle: false,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://example.com',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          bodyKeyValuePairs: [],
          type: 'rest'
        }
      }

      mockCollectionStore.collections = []
      mockTabStore.tabs = [tab]

      const result = TabCollectionManager.validateState()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Tab tab-1 references non-existent collection non-existent-collection'
      )
    })

    it('存在しないタブを参照するコレクションがある場合はバリデーションが失敗する', () => {
      const collection: Collection = {
        id: 'collection-1',
        name: 'Test Collection',
        description: 'Test description',
        children: [],
        requests: [],
        tabs: ['non-existent-tab'],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }

      mockCollectionStore.collections = [collection]
      mockTabStore.tabs = []

      const result = TabCollectionManager.validateState()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Collection collection-1 references non-existent tab non-existent-tab'
      )
    })
  })
})
