import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  Collection,
  CollectionStore,
  RequestExecutionHistory,
  ApiRequest,
  ApiResponse
} from '@/types/types'

type CollectionState = CollectionStore

interface CollectionActions {
  // アクティブコレクション管理
  setActiveCollection: (collectionId?: string) => void
  getActiveCollection: () => Collection | undefined

  // コレクション管理
  createCollection: (name: string, description?: string, parentId?: string) => string
  updateCollection: (id: string, updates: Partial<Omit<Collection, 'id'>>) => void
  deleteCollection: (id: string) => void
  moveCollection: (id: string, newParentId?: string) => void
  getCollection: (id: string) => Collection | undefined
  getCollectionsByParent: (parentId?: string) => Collection[]

  // リクエスト管理
  addRequestToCollection: (collectionId: string, requestId: string) => void
  removeRequestFromCollection: (collectionId: string, requestId: string) => void
  moveRequestBetweenCollections: (
    requestId: string,
    fromCollectionId: string,
    toCollectionId: string
  ) => void

  // タブ管理
  addTabToCollection: (collectionId: string, tabId: string) => void
  removeTabFromCollection: (collectionId: string, tabId: string) => void
  setCollectionActiveTab: (collectionId: string, tabId?: string) => void
  getCollectionTabs: (collectionId: string) => string[]
  getCollectionActiveTab: (collectionId: string) => string | undefined

  // 実行履歴管理
  addExecutionHistory: (
    request: ApiRequest,
    response: ApiResponse,
    duration: number,
    status: 'success' | 'error',
    errorMessage?: string
  ) => void
  clearExecutionHistory: () => void
  removeOldHistory: () => void
  getExecutionHistory: (limit?: number) => RequestExecutionHistory[]
  getExecutionHistoryByRequest: (requestId: string) => RequestExecutionHistory[]

  // 検索・フィルタ
  setSearchQuery: (query: string) => void
  setFilterOptions: (options: Partial<CollectionStore['filterOptions']>) => void
  clearFilters: () => void
  getFilteredHistory: () => RequestExecutionHistory[]

  // データ永続化
  saveToStorage: () => void
  loadFromStorage: () => void

  // タブとコレクション連携
  moveTabsToUncollected: (collectionId: string) => void
}

const initialState: CollectionState = {
  collections: [],
  executionHistory: [],
  maxHistorySize: 100,
  searchQuery: '',
  activeCollectionId: undefined,
  filterOptions: {}
}

export const useCollectionStore = create<CollectionState & CollectionActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // アクティブコレクション管理
      setActiveCollection: (collectionId?: string) => {
        set({ activeCollectionId: collectionId }, false, 'setActiveCollection')
      },

      getActiveCollection: () => {
        const state = get()
        return state.activeCollectionId
          ? state.collections.find((collection) => collection.id === state.activeCollectionId)
          : undefined
      },

      // コレクション管理
      createCollection: (name: string, description?: string, parentId?: string): string => {
        const id = uuidv4()
        const newCollection: Collection = {
          id,
          name,
          description,
          parentId,
          children: [],
          requests: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tabs: [],
          activeTabId: undefined
        }

        set(
          (state) => ({
            collections: [...state.collections, newCollection]
          }),
          false,
          'createCollection'
        )

        // 自動保存
        get().saveToStorage()

        return id
      },

      updateCollection: (id: string, updates: Partial<Omit<Collection, 'id'>>) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === id
                ? {
                    ...collection,
                    ...updates,
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'updateCollection'
        )
      },

      deleteCollection: (id: string) => {
        const state = get()
        const deletingCollection = state.collections.find((collection) => collection.id === id)

        // 削除するコレクションが存在しない場合は何もしない
        if (!deletingCollection) return

        set(
          (state) => ({
            collections: state.collections.filter((collection) => collection.id !== id)
          }),
          false,
          'deleteCollection'
        )

        // そのコレクションに属するタブのcollectionIdをクリア
        // この処理はアプリケーション層で定期的に実行されるクリーンアップで対応
        // または明示的にcleanupDeletedCollections()を呼び出すことで対応

        // アクティブなコレクションが削除されている場合はクリア
        if (state.activeCollectionId === id) {
          set({ activeCollectionId: undefined }, false, 'clearActiveCollection')
        }
      },

      moveCollection: (id: string, newParentId?: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === id
                ? {
                    ...collection,
                    parentId: newParentId,
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'moveCollection'
        )
      },

      getCollection: (id: string) => {
        const state = get()
        return state.collections.find((collection) => collection.id === id)
      },

      getCollectionsByParent: (parentId?: string) => {
        const state = get()
        return state.collections.filter((collection) => collection.parentId === parentId)
      },

      // リクエスト管理
      addRequestToCollection: (collectionId: string, requestId: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    requests: [...(collection.requests || []), requestId],
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'addRequestToCollection'
        )
      },

      removeRequestFromCollection: (collectionId: string, requestId: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    requests: (collection.requests || []).filter((id) => id !== requestId),
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'removeRequestFromCollection'
        )
      },

      moveRequestBetweenCollections: (
        requestId: string,
        fromCollectionId: string,
        toCollectionId: string
      ) => {
        const actions = get()
        actions.removeRequestFromCollection(fromCollectionId, requestId)
        actions.addRequestToCollection(toCollectionId, requestId)
      },

      // タブ管理
      addTabToCollection: (collectionId: string, tabId: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    tabs: [...(collection.tabs || []), tabId],
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'addTabToCollection'
        )
      },

      removeTabFromCollection: (collectionId: string, tabId: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    tabs: (collection.tabs || []).filter((id) => id !== tabId),
                    activeTabId:
                      collection.activeTabId === tabId ? undefined : collection.activeTabId,
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'removeTabFromCollection'
        )
      },

      setCollectionActiveTab: (collectionId: string, tabId?: string) => {
        set(
          (state) => ({
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    activeTabId: tabId,
                    updated: new Date().toISOString()
                  }
                : collection
            )
          }),
          false,
          'setCollectionActiveTab'
        )
      },

      getCollectionTabs: (collectionId: string) => {
        const state = get()
        const collection = state.collections.find((c) => c.id === collectionId)
        return collection?.tabs || []
      },

      getCollectionActiveTab: (collectionId: string) => {
        const state = get()
        const collection = state.collections.find((c) => c.id === collectionId)
        return collection?.activeTabId
      },

      // 実行履歴管理
      addExecutionHistory: (
        request: ApiRequest,
        response: ApiResponse,
        duration: number,
        status: 'success' | 'error',
        errorMessage?: string
      ) => {
        const historyItem: RequestExecutionHistory = {
          id: uuidv4(),
          request,
          response,
          timestamp: new Date().toISOString(),
          duration,
          status,
          errorMessage
        }

        set(
          (state) => {
            const newHistory = [historyItem, ...state.executionHistory]

            // 最大履歴数を超えた場合は古いものを削除
            const trimmedHistory = newHistory.slice(0, state.maxHistorySize)

            return {
              executionHistory: trimmedHistory
            }
          },
          false,
          'addExecutionHistory'
        )

        // 自動保存
        get().saveToStorage()
      },

      clearExecutionHistory: () => {
        set({ executionHistory: [] }, false, 'clearExecutionHistory')
        get().saveToStorage()
      },

      removeOldHistory: () => {
        set(
          (state) => ({
            executionHistory: state.executionHistory.slice(0, state.maxHistorySize)
          }),
          false,
          'removeOldHistory'
        )
      },

      getExecutionHistory: (limit?: number) => {
        const state = get()
        return limit ? state.executionHistory.slice(0, limit) : state.executionHistory
      },

      getExecutionHistoryByRequest: (requestId: string) => {
        const state = get()
        return state.executionHistory.filter((history) => history.request.id === requestId)
      },

      // 検索・フィルタ
      setSearchQuery: (query: string) => {
        set({ searchQuery: query }, false, 'setSearchQuery')
      },

      setFilterOptions: (options: Partial<CollectionStore['filterOptions']>) => {
        set(
          (state) => ({
            filterOptions: {
              ...state.filterOptions,
              ...options
            }
          }),
          false,
          'setFilterOptions'
        )
      },

      clearFilters: () => {
        set(
          {
            searchQuery: '',
            filterOptions: {}
          },
          false,
          'clearFilters'
        )
      },

      getFilteredHistory: () => {
        const state = get()
        let filtered = [...state.executionHistory]

        // 検索クエリでフィルタ
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          filtered = filtered.filter(
            (history) =>
              history.request.name.toLowerCase().includes(query) ||
              history.request.url.toLowerCase().includes(query) ||
              (history.errorMessage && history.errorMessage.toLowerCase().includes(query))
          )
        }

        // ステータスでフィルタ
        if (state.filterOptions.status) {
          filtered = filtered.filter((history) => history.status === state.filterOptions.status)
        }

        // HTTPメソッドでフィルタ
        if (state.filterOptions.method && state.filterOptions.method.length > 0) {
          filtered = filtered.filter((history) =>
            state.filterOptions.method!.includes(history.request.method)
          )
        }

        // 日付範囲でフィルタ
        if (state.filterOptions.dateRange) {
          const { start, end } = state.filterOptions.dateRange
          filtered = filtered.filter((history) => {
            const historyDate = new Date(history.timestamp)
            return historyDate >= new Date(start) && historyDate <= new Date(end)
          })
        }

        return filtered
      },

      // データ永続化
      saveToStorage: () => {
        const state = get()
        try {
          const data = {
            collections: state.collections,
            executionHistory: state.executionHistory,
            maxHistorySize: state.maxHistorySize,
            activeCollectionId: state.activeCollectionId,
            timestamp: Date.now()
          }
          localStorage.setItem('api-tester-collections', JSON.stringify(data))
        } catch (error) {
          console.error('Failed to save collection data to localStorage:', error)
        }
      },

      loadFromStorage: () => {
        try {
          const stored = localStorage.getItem('api-tester-collections')
          let collections: Collection[] = []
          let executionHistory: RequestExecutionHistory[] = []
          let maxHistorySize = 100
          let activeCollectionId: string | undefined = undefined

          if (stored) {
            const data = JSON.parse(stored) as {
              collections: Collection[]
              executionHistory: RequestExecutionHistory[]
              maxHistorySize: number
              activeCollectionId?: string
              timestamp: number
            }

            if (Array.isArray(data.collections) && Array.isArray(data.executionHistory)) {
              collections = data.collections
              executionHistory = data.executionHistory
              maxHistorySize = data.maxHistorySize || 100
              activeCollectionId = data.activeCollectionId
            }
          }

          // デフォルトフォルダが存在しない場合は作成
          if (collections.length === 0) {
            const defaultCollection: Collection = {
              id: uuidv4(),
              name: 'デフォルトフォルダ',
              description: 'デフォルトのリクエスト保存フォルダ',
              children: [],
              requests: [],
              tabs: [],
              created: new Date().toISOString(),
              updated: new Date().toISOString()
            }
            collections = [defaultCollection]

            // デフォルトフォルダをアクティブに設定
            activeCollectionId = defaultCollection.id
          }

          set(
            {
              collections,
              executionHistory,
              maxHistorySize,
              activeCollectionId
            },
            false,
            'loadFromStorage'
          )

          // 読み込み完了後にデータを保存（デフォルトフォルダが追加された場合）
          if (
            !stored ||
            (JSON.parse(stored || '{}') as { collections?: unknown[] }).collections?.length === 0
          ) {
            get().saveToStorage()
          }
        } catch (error) {
          console.error('Failed to load collection data from localStorage:', error)

          // エラー時もデフォルトフォルダを作成
          const defaultCollection: Collection = {
            id: uuidv4(),
            name: 'デフォルトフォルダ',
            description: 'デフォルトのリクエスト保存フォルダ',
            children: [],
            requests: [],
            tabs: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }

          set(
            {
              collections: [defaultCollection],
              executionHistory: [],
              maxHistorySize: 100,
              activeCollectionId: defaultCollection.id
            },
            false,
            'loadFromStorage'
          )

          // デフォルト状態を保存
          get().saveToStorage()
        }
      },

      // タブとコレクション連携
      moveTabsToUncollected: (collectionId: string) => {
        // この機能は外部から呼び出される想定（循環参照回避のため）
        // 実際の実装は TabCollectionManager で行う
        console.log(`moveTabsToUncollected called for collection: ${collectionId}`)
      }
    }),
    {
      name: 'collection-store'
    }
  )
)
