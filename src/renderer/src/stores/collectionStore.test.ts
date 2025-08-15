import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ApiRequest, ApiResponse } from '@/types/types'
import { useCollectionStore } from './collectionStore'

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('CollectionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ストアを初期状態にリセット
    useCollectionStore.setState({
      collections: [],
      executionHistory: [],
      maxHistorySize: 100,
      searchQuery: '',
      activeCollectionId: undefined,
      filterOptions: {}
    })
  })

  describe('コレクション管理', () => {
    it('新しいコレクションを作成できる', () => {
      const { createCollection } = useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション', 'テスト用の説明')
      const state = useCollectionStore.getState()

      expect(state.collections).toHaveLength(1)
      expect(state.collections[0].id).toBe(collectionId)
      expect(state.collections[0].name).toBe('テストコレクション')
      expect(state.collections[0].description).toBe('テスト用の説明')
      expect(state.collections[0].parentId).toBeUndefined()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('親IDを指定してサブコレクションを作成できる', () => {
      const { createCollection } = useCollectionStore.getState()

      const parentId = createCollection('親コレクション')
      const childId = createCollection('子コレクション', undefined, parentId)

      const state = useCollectionStore.getState()
      const childCollection = state.collections.find((c) => c.id === childId)

      expect(childCollection?.parentId).toBe(parentId)
    })

    it('コレクションを更新できる', () => {
      const { createCollection, updateCollection } = useCollectionStore.getState()

      const collectionId = createCollection('元の名前')
      updateCollection(collectionId, { name: '更新後の名前', description: '更新後の説明' })

      const state = useCollectionStore.getState()
      const collection = state.collections.find((c) => c.id === collectionId)

      expect(collection?.name).toBe('更新後の名前')
      expect(collection?.description).toBe('更新後の説明')
      expect(collection?.updated).toBeDefined()
    })

    it('コレクションを削除できる', () => {
      const { createCollection, deleteCollection } = useCollectionStore.getState()

      const collectionId = createCollection('削除予定コレクション')
      deleteCollection(collectionId)

      const state = useCollectionStore.getState()
      expect(state.collections).toHaveLength(0)
    })

    it('コレクションを移動できる', () => {
      const { createCollection, moveCollection } = useCollectionStore.getState()

      const parentId = createCollection('親コレクション')
      const childId = createCollection('子コレクション')

      moveCollection(childId, parentId)

      const state = useCollectionStore.getState()
      const childCollection = state.collections.find((c) => c.id === childId)

      expect(childCollection?.parentId).toBe(parentId)
    })

    it('IDでコレクションを取得できる', () => {
      const { createCollection, getCollection } = useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      const collection = getCollection(collectionId)

      expect(collection?.id).toBe(collectionId)
      expect(collection?.name).toBe('テストコレクション')
    })

    it('親IDでコレクションをフィルタできる', () => {
      const { createCollection, getCollectionsByParent } = useCollectionStore.getState()

      const parentId = createCollection('親コレクション')
      createCollection('子コレクション1', undefined, parentId)
      createCollection('子コレクション2', undefined, parentId)
      createCollection('独立コレクション')

      const children = getCollectionsByParent(parentId)
      expect(children).toHaveLength(2)

      const topLevel = getCollectionsByParent()
      expect(topLevel).toHaveLength(2) // 親コレクションと独立コレクション
    })
  })

  describe('アクティブコレクション管理', () => {
    it('アクティブコレクションを設定できる', () => {
      const { createCollection, setActiveCollection, getActiveCollection } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      setActiveCollection(collectionId)

      const state = useCollectionStore.getState()
      expect(state.activeCollectionId).toBe(collectionId)

      const activeCollection = getActiveCollection()
      expect(activeCollection?.id).toBe(collectionId)
    })

    it('アクティブコレクションをクリアできる', () => {
      const { createCollection, setActiveCollection, getActiveCollection } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      setActiveCollection(collectionId)
      setActiveCollection()

      const state = useCollectionStore.getState()
      expect(state.activeCollectionId).toBeUndefined()

      const activeCollection = getActiveCollection()
      expect(activeCollection).toBeUndefined()
    })
  })

  describe('リクエスト管理', () => {
    it('コレクションにリクエストを追加できる', () => {
      const { createCollection, addRequestToCollection } = useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      addRequestToCollection(collectionId, 'request-1')

      const state = useCollectionStore.getState()
      const collection = state.collections.find((c) => c.id === collectionId)

      expect(collection?.requests).toContain('request-1')
    })

    it('コレクションからリクエストを削除できる', () => {
      const { createCollection, addRequestToCollection, removeRequestFromCollection } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      addRequestToCollection(collectionId, 'request-1')
      removeRequestFromCollection(collectionId, 'request-1')

      const state = useCollectionStore.getState()
      const collection = state.collections.find((c) => c.id === collectionId)

      expect(collection?.requests).not.toContain('request-1')
    })

    it('リクエストをコレクション間で移動できる', () => {
      const { createCollection, addRequestToCollection, moveRequestBetweenCollections } =
        useCollectionStore.getState()

      const fromCollectionId = createCollection('移動元コレクション')
      const toCollectionId = createCollection('移動先コレクション')

      addRequestToCollection(fromCollectionId, 'request-1')
      moveRequestBetweenCollections('request-1', fromCollectionId, toCollectionId)

      const state = useCollectionStore.getState()
      const fromCollection = state.collections.find((c) => c.id === fromCollectionId)
      const toCollection = state.collections.find((c) => c.id === toCollectionId)

      expect(fromCollection?.requests).not.toContain('request-1')
      expect(toCollection?.requests).toContain('request-1')
    })
  })

  describe('タブ管理', () => {
    it('コレクションにタブを追加できる', () => {
      const { createCollection, addTabToCollection, getCollectionTabs } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      addTabToCollection(collectionId, 'tab-1')

      const tabs = getCollectionTabs(collectionId)
      expect(tabs).toContain('tab-1')
    })

    it('コレクションからタブを削除できる', () => {
      const { createCollection, addTabToCollection, removeTabFromCollection, getCollectionTabs } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      addTabToCollection(collectionId, 'tab-1')
      removeTabFromCollection(collectionId, 'tab-1')

      const tabs = getCollectionTabs(collectionId)
      expect(tabs).not.toContain('tab-1')
    })

    it('アクティブタブを設定・取得できる', () => {
      const { createCollection, setCollectionActiveTab, getCollectionActiveTab } =
        useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      setCollectionActiveTab(collectionId, 'tab-1')

      const activeTab = getCollectionActiveTab(collectionId)
      expect(activeTab).toBe('tab-1')
    })

    it('アクティブタブを削除すると自動的にクリアされる', () => {
      const {
        createCollection,
        addTabToCollection,
        setCollectionActiveTab,
        removeTabFromCollection,
        getCollectionActiveTab
      } = useCollectionStore.getState()

      const collectionId = createCollection('テストコレクション')
      addTabToCollection(collectionId, 'tab-1')
      setCollectionActiveTab(collectionId, 'tab-1')
      removeTabFromCollection(collectionId, 'tab-1')

      const activeTab = getCollectionActiveTab(collectionId)
      expect(activeTab).toBeUndefined()
    })
  })

  describe('実行履歴管理', () => {
    const mockRequest: ApiRequest = {
      id: 'request-1',
      name: 'テストリクエスト',
      url: 'https://api.example.com',
      method: 'GET' as const,
      headers: [],
      params: [],
      body: '',
      bodyType: 'json' as const,
      type: 'rest' as const
    }

    const mockResponse: ApiResponse = {
      status: 200,
      statusText: 'OK',
      data: {
        type: 'text' as const,
        data: 'success'
      },
      headers: {},
      duration: 100,
      size: 1024,
      timestamp: new Date().toISOString()
    }

    it('実行履歴を追加できる', () => {
      const { addExecutionHistory, getExecutionHistory } = useCollectionStore.getState()

      addExecutionHistory(mockRequest, mockResponse, 100, 'success')

      const history = getExecutionHistory()
      expect(history).toHaveLength(1)
      expect(history[0].request.id).toBe('request-1')
      expect(history[0].status).toBe('success')
      expect(history[0].duration).toBe(100)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('エラー情報付きの実行履歴を追加できる', () => {
      const { addExecutionHistory, getExecutionHistory } = useCollectionStore.getState()

      addExecutionHistory(mockRequest, mockResponse, 0, 'error', 'Network error')

      const history = getExecutionHistory()
      expect(history[0].status).toBe('error')
      expect(history[0].errorMessage).toBe('Network error')
    })

    it('最大履歴数を超えると古い履歴が削除される', () => {
      useCollectionStore.setState({ maxHistorySize: 2 })
      const { addExecutionHistory, getExecutionHistory } = useCollectionStore.getState()

      // 3つの履歴を追加
      for (let i = 1; i <= 3; i++) {
        const request: ApiRequest = { ...mockRequest, id: `request-${i}` }
        addExecutionHistory(request, mockResponse, 100, 'success')
      }

      const history = getExecutionHistory()
      expect(history).toHaveLength(2)
      expect(history[0].request.id).toBe('request-3') // 最新が先頭
      expect(history[1].request.id).toBe('request-2')
    })

    it('実行履歴をクリアできる', () => {
      const { addExecutionHistory, clearExecutionHistory, getExecutionHistory } =
        useCollectionStore.getState()

      addExecutionHistory(mockRequest, mockResponse, 100, 'success')
      clearExecutionHistory()

      const history = getExecutionHistory()
      expect(history).toHaveLength(0)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('制限付きで実行履歴を取得できる', () => {
      const { addExecutionHistory, getExecutionHistory } = useCollectionStore.getState()

      // 5つの履歴を追加
      for (let i = 1; i <= 5; i++) {
        const request: ApiRequest = { ...mockRequest, id: `request-${i}` }
        addExecutionHistory(request, mockResponse, 100, 'success')
      }

      const limitedHistory = getExecutionHistory(3)
      expect(limitedHistory).toHaveLength(3)
    })

    it('リクエストIDで実行履歴をフィルタできる', () => {
      const { addExecutionHistory, getExecutionHistoryByRequest } = useCollectionStore.getState()

      const request1: ApiRequest = { ...mockRequest, id: 'request-1' }
      const request2: ApiRequest = { ...mockRequest, id: 'request-2' }

      addExecutionHistory(request1, mockResponse, 100, 'success')
      addExecutionHistory(request2, mockResponse, 100, 'success')
      addExecutionHistory(request1, mockResponse, 100, 'success')

      const request1History = getExecutionHistoryByRequest('request-1')
      expect(request1History).toHaveLength(2)
    })
  })

  describe('検索・フィルタ', () => {
    it('検索クエリを設定できる', () => {
      const { setSearchQuery } = useCollectionStore.getState()

      setSearchQuery('test query')

      const state = useCollectionStore.getState()
      expect(state.searchQuery).toBe('test query')
    })

    it('フィルタオプションを設定できる', () => {
      const { setFilterOptions } = useCollectionStore.getState()

      setFilterOptions({ status: 'success', method: ['GET', 'POST'] })

      const state = useCollectionStore.getState()
      expect(state.filterOptions.status).toBe('success')
      expect(state.filterOptions.method).toEqual(['GET', 'POST'])
    })

    it('フィルタをクリアできる', () => {
      const { setSearchQuery, setFilterOptions, clearFilters } = useCollectionStore.getState()

      setSearchQuery('test')
      setFilterOptions({ status: 'success' })
      clearFilters()

      const state = useCollectionStore.getState()
      expect(state.searchQuery).toBe('')
      expect(state.filterOptions).toEqual({})
    })

    it('検索クエリで履歴をフィルタできる', () => {
      const { addExecutionHistory, setSearchQuery, getFilteredHistory } =
        useCollectionStore.getState()

      const baseMockRequest: ApiRequest = {
        id: 'base-request',
        name: 'テストリクエスト',
        url: 'https://api.example.com',
        method: 'GET' as const,
        headers: [],
        params: [],
        body: '',
        bodyType: 'json' as const,
        type: 'rest' as const
      }

      const request1: ApiRequest = {
        ...baseMockRequest,
        id: 'request-1',
        name: 'ユーザー取得',
        url: 'https://api.example.com/users'
      }
      const request2: ApiRequest = {
        ...baseMockRequest,
        id: 'request-2',
        name: '商品取得',
        url: 'https://api.example.com/products'
      }
      const mockResponse: ApiResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          type: 'text' as const,
          data: 'test data'
        },
        headers: {},
        duration: 100,
        size: 1024,
        timestamp: new Date().toISOString()
      }

      addExecutionHistory(request1, mockResponse, 100, 'success')
      addExecutionHistory(request2, mockResponse, 100, 'success')

      setSearchQuery('ユーザー')
      const filtered = getFilteredHistory()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].request.name).toBe('ユーザー取得')
    })

    it('ステータスで履歴をフィルタできる', () => {
      const { addExecutionHistory, setFilterOptions, getFilteredHistory } =
        useCollectionStore.getState()

      const mockResponse: ApiResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          type: 'text' as const,
          data: 'test data'
        },
        headers: {},
        duration: 100,
        size: 1024,
        timestamp: new Date().toISOString()
      }

      const baseMockRequest: ApiRequest = {
        id: 'base-request',
        name: 'テストリクエスト',
        url: 'https://api.example.com',
        method: 'GET' as const,
        headers: [],
        params: [],
        body: '',
        bodyType: 'json' as const,
        type: 'rest' as const
      }

      const successRequest: ApiRequest = {
        ...baseMockRequest,
        id: 'success-request'
      }
      const errorRequest: ApiRequest = {
        ...baseMockRequest,
        id: 'error-request'
      }

      addExecutionHistory(successRequest, mockResponse, 100, 'success')
      addExecutionHistory(errorRequest, mockResponse, 0, 'error', 'エラー')

      setFilterOptions({ status: 'success' })
      const filtered = getFilteredHistory()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('success')
    })
  })

  describe('データ永続化', () => {
    it('データを保存できる', () => {
      const { createCollection, saveToStorage } = useCollectionStore.getState()

      createCollection('テストコレクション')
      saveToStorage()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'api-tester-collections',
        expect.stringContaining('テストコレクション')
      )
    })

    it('保存エラーをハンドリングできる', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { saveToStorage } = useCollectionStore.getState()
      saveToStorage()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save collection data to localStorage:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('データを読み込める', () => {
      const mockData = {
        collections: [
          {
            id: 'test-id',
            name: 'テストコレクション',
            children: [],
            requests: [],
            tabs: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        ],
        executionHistory: [],
        maxHistorySize: 50,
        timestamp: Date.now()
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      const { loadFromStorage } = useCollectionStore.getState()
      loadFromStorage()

      const state = useCollectionStore.getState()
      expect(state.collections).toHaveLength(1)
      expect(state.collections[0].name).toBe('テストコレクション')
      expect(state.maxHistorySize).toBe(50)
    })

    it('データが存在しない場合はデフォルトフォルダを作成する', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { loadFromStorage } = useCollectionStore.getState()
      loadFromStorage()

      const state = useCollectionStore.getState()
      expect(state.collections).toHaveLength(1)
      expect(state.collections[0].name).toBe('デフォルトフォルダ')
      expect(state.activeCollectionId).toBe(state.collections[0].id)
    })

    it('読み込みエラー時もデフォルトフォルダを作成する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { loadFromStorage } = useCollectionStore.getState()
      loadFromStorage()

      const state = useCollectionStore.getState()
      expect(state.collections).toHaveLength(1)
      expect(state.collections[0].name).toBe('デフォルトフォルダ')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
