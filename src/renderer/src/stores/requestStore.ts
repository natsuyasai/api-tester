import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ApiRequest, ApiResponse, KeyValuePair, HttpMethod, BodyType, ApiTab } from '@/types/types'
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
            headers: [...tab.request.headers, { key: '', value: '', enabled: false }]
          }
        }))
      },

      updateHeader: (tabId: string, index: number, headerUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            headers: tab.request.headers.map((header, i) =>
              i === index ? { ...header, ...headerUpdate } : header
            )
          }
        }))
      },

      removeHeader: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            headers: tab.request.headers.filter((_, i) => i !== index)
          }
        }))
      },

      addParam: (tabId: string) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: [...tab.request.params, { key: '', value: '', enabled: false }]
          }
        }))
      },

      updateParam: (tabId: string, index: number, paramUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: tab.request.params.map((param, i) =>
              i === index ? { ...param, ...paramUpdate } : param
            )
          }
        }))
      },

      removeParam: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            params: tab.request.params.filter((_, i) => i !== index)
          }
        }))
      },

      updateGraphQLVariables: (tabId: string, variables: Record<string, unknown>) => {
        get().updateRequest(tabId, { variables })
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
            bodyKeyValuePairs: [
              ...(tab.request.bodyKeyValuePairs || []),
              { key: '', value: '', enabled: false }
            ]
          }
        }))
      },

      updateBodyKeyValue: (tabId: string, index: number, keyValueUpdate: Partial<KeyValuePair>) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            bodyKeyValuePairs: (tab.request.bodyKeyValuePairs || []).map((keyValue, i) =>
              i === index ? { ...keyValue, ...keyValueUpdate } : keyValue
            )
          }
        }))
      },

      removeBodyKeyValue: (tabId: string, index: number) => {
        updateTabInStore(tabId, (tab) => ({
          ...tab,
          request: {
            ...tab.request,
            bodyKeyValuePairs: (tab.request.bodyKeyValuePairs || []).filter((_, i) => i !== index)
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
