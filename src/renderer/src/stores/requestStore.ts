import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  ApiRequest,
  ApiResponse,
  KeyValuePair,
  HttpMethod,
  BodyType,
  ApiTab,
  AuthConfig,
  RequestSettings
} from '@/types/types'
import { KeyValuePairOperations } from '@renderer/utils/keyValueUtils'
import { useTabStore } from './tabStore'

interface RequestState {
  isLoading: boolean
}

interface RequestActions {
  updateRequest: (tabId: string, request: Partial<ApiRequest>) => void
  updateUrl: (tabId: string, url: string) => void
  updateMethod: (tabId: string, method: HttpMethod) => void
  updateBody: (tabId: string, body: string) => void
  updateBodyType: (tabId: string, bodyType: BodyType) => void

  addHeader: (tabId: string) => void
  updateHeader: (tabId: string, index: number, header: Partial<KeyValuePair>) => void
  removeHeader: (tabId: string, index: number) => void

  addParam: (tabId: string) => void
  updateParam: (tabId: string, index: number, param: Partial<KeyValuePair>) => void
  removeParam: (tabId: string, index: number) => void

  updateGraphQLVariables: (tabId: string, variables: Record<string, unknown>) => void

  // 認証管理
  updateAuth: (tabId: string, auth: AuthConfig) => void

  // リクエスト設定管理
  updateSettings: (tabId: string, settings: RequestSettings) => void
  // ポストスクリプト管理
  updatePostScript: (tabId: string, postScript: string) => void

  // Body KeyValue管理
  addBodyKeyValue: (tabId: string) => void
  updateBodyKeyValue: (tabId: string, index: number, keyValue: Partial<KeyValuePair>) => void
  removeBodyKeyValue: (tabId: string, index: number) => void

  setResponse: (tabId: string, response: ApiResponse) => void
  clearResponse: (tabId: string) => void

  setLoading: (loading: boolean) => void
}

const updateTabInStore = (tabId: string, updater: (tab: ApiTab) => ApiTab) => {
  const tabStore = useTabStore.getState()
  const currentTabs = tabStore.tabs
  const updatedTabs = currentTabs.map((tab) => (tab.id === tabId ? updater(tab) : tab))
  useTabStore.setState({ tabs: updatedTabs })
}

const initialState: RequestState = {
  isLoading: false
}

export const useRequestStore = create<RequestState & RequestActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      updateRequest: (tabId: string, requestUpdate: Partial<ApiRequest>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: { ...tab.request, ...requestUpdate }
        }))
      },

      updateUrl: (tabId: string, url: string) => {
        get().updateRequest(tabId, { url })
      },

      updateMethod: (tabId: string, method: HttpMethod) => {
        get().updateRequest(tabId, { method })
      },

      updateBody: (tabId: string, body: string) => {
        get().updateRequest(tabId, { body })
      },

      updateBodyType: (tabId: string, bodyType: BodyType) => {
        get().updateRequest(tabId, { bodyType })
      },

      addHeader: (tabId: string) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            headers: KeyValuePairOperations.add(tab.request.headers)
          }
        }))
      },

      updateHeader: (tabId: string, index: number, headerUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            headers: KeyValuePairOperations.update(tab.request.headers, index, headerUpdate)
          }
        }))
      },

      removeHeader: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            headers: KeyValuePairOperations.remove(tab.request.headers, index)
          }
        }))
      },

      addParam: (tabId: string) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: KeyValuePairOperations.add(tab.request.params)
          }
        }))
      },

      updateParam: (tabId: string, index: number, paramUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: KeyValuePairOperations.update(tab.request.params, index, paramUpdate)
          }
        }))
      },

      removeParam: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: KeyValuePairOperations.remove(tab.request.params, index)
          }
        }))
      },

      updateGraphQLVariables: (tabId: string, variables: Record<string, unknown>) => {
        get().updateRequest(tabId, { variables })
      },

      updateAuth: (tabId: string, auth: AuthConfig) => {
        get().updateRequest(tabId, { auth })
      },

      updateSettings: (tabId: string, settings: RequestSettings) => {
        get().updateRequest(tabId, { settings })
      },
      updatePostScript: (tabId: string, postScript: string) => {
        get().updateRequest(tabId, { postScript })
      },

      setResponse: (tabId: string, response: ApiResponse) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          response
        }))
      },

      clearResponse: (tabId: string) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          response: null
        }))
      },

      // Body KeyValue管理
      addBodyKeyValue: (tabId: string) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            bodyKeyValuePairs: KeyValuePairOperations.add(tab.request.bodyKeyValuePairs || [])
          }
        }))
      },

      updateBodyKeyValue: (tabId: string, index: number, keyValueUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            bodyKeyValuePairs: KeyValuePairOperations.update(
              tab.request.bodyKeyValuePairs || [],
              index,
              keyValueUpdate
            )
          }
        }))
      },

      removeBodyKeyValue: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            bodyKeyValuePairs: KeyValuePairOperations.remove(
              tab.request.bodyKeyValuePairs || [],
              index
            )
          }
        }))
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading }, false, 'setLoading')
      }
    }),
    {
      name: 'request-store'
    }
  )
)
