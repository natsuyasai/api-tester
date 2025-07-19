import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { YamlService } from '@/services/yamlService'
import { ApiTab, ApiRequest, ApiResponse, KeyValuePair, HttpMethod, BodyType } from '@/types/types'

// ストアの状態の型定義
interface ApiState {
  tabs: ApiTab[]
  activeTabId: string
  isLoading: boolean
}

// ストアのアクションの型定義
interface ApiActions {
  // タブ関連
  addTab: () => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabTitle: (tabId: string, title: string) => void

  // リクエスト関連
  updateRequest: (tabId: string, request: Partial<ApiRequest>) => void
  updateUrl: (tabId: string, url: string) => void
  updateMethod: (tabId: string, method: HttpMethod) => void
  updateBody: (tabId: string, body: string) => void
  updateBodyType: (tabId: string, bodyType: BodyType) => void

  // ヘッダー/パラメータ関連
  addHeader: (tabId: string) => void
  updateHeader: (tabId: string, index: number, header: Partial<KeyValuePair>) => void
  removeHeader: (tabId: string, index: number) => void
  addParam: (tabId: string) => void
  updateParam: (tabId: string, index: number, param: Partial<KeyValuePair>) => void
  removeParam: (tabId: string, index: number) => void

  // GraphQL変数関連
  updateGraphQLVariables: (tabId: string, variables: Record<string, unknown>) => void

  // レスポンス関連
  setResponse: (tabId: string, response: ApiResponse) => void
  clearResponse: (tabId: string) => void

  // 状態管理
  setLoading: (loading: boolean) => void

  // データ操作
  exportConfig: () => string
  importConfig: (configJson: string) => void
  exportYaml: () => string
  importYaml: (yamlContent: string) => void
  resetStore: () => void

  // ファイル操作
  saveToFile: () => Promise<void>
  loadFromFile: () => Promise<void>
}

// 初期状態の定義
const createInitialTab = (): ApiTab => ({
  id: uuidv4(),
  title: 'New Request',
  isActive: true,
  response: null,
  request: {
    id: uuidv4(),
    name: 'New Request',
    url: '',
    method: 'GET',
    headers: [{ key: '', value: '', enabled: true }],
    params: [{ key: '', value: '', enabled: true }],
    body: '',
    bodyType: 'json',
    type: 'rest'
  }
})

const initialState: ApiState = {
  tabs: [createInitialTab()],
  activeTabId: '',
  isLoading: false
}

// 初期状態のactiveTabIdを設定
initialState.activeTabId = initialState.tabs[0].id

// Zustandストアの作成
export const useApiStore = create<ApiState & ApiActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // タブ関連のアクション
      addTab: () => {
        const newTab = createInitialTab()
        set(
          (state) => ({
            tabs: [...state.tabs.map((tab) => ({ ...tab, isActive: false })), newTab],
            activeTabId: newTab.id
          }),
          false,
          'addTab'
        )
      },

      closeTab: (tabId: string) => {
        const state = get()
        if (state.tabs.length <= 1) return // 最後のタブは閉じない

        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
        if (tabIndex === -1) return

        const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
        let newActiveTabId = state.activeTabId

        // 閉じたタブがアクティブだった場合、新しいアクティブタブを決定
        if (state.activeTabId === tabId) {
          if (newTabs.length > 0) {
            if (tabIndex >= newTabs.length) {
              newActiveTabId = newTabs[newTabs.length - 1].id
            } else {
              newActiveTabId = newTabs[tabIndex].id
            }
          }
        }

        set(
          {
            tabs: newTabs.map((tab) => ({
              ...tab,
              isActive: tab.id === newActiveTabId
            })),
            activeTabId: newActiveTabId
          },
          false,
          'closeTab'
        )
      },

      setActiveTab: (tabId: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => ({
              ...tab,
              isActive: tab.id === tabId
            })),
            activeTabId: tabId
          }),
          false,
          'setActiveTab'
        )
      },

      updateTabTitle: (tabId: string, title: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, title } : tab))
          }),
          false,
          'updateTabTitle'
        )
      },

      // リクエスト関連のアクション
      updateRequest: (tabId: string, requestUpdate: Partial<ApiRequest>) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId ? { ...tab, request: { ...tab.request, ...requestUpdate } } : tab
            )
          }),
          false,
          'updateRequest'
        )
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

      // ヘッダー/パラメータ関連のアクション
      addHeader: (tabId: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      headers: [...tab.request.headers, { key: '', value: '', enabled: true }]
                    }
                  }
                : tab
            )
          }),
          false,
          'addHeader'
        )
      },

      updateHeader: (tabId: string, index: number, headerUpdate: Partial<KeyValuePair>) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      headers: tab.request.headers.map((header, i) =>
                        i === index ? { ...header, ...headerUpdate } : header
                      )
                    }
                  }
                : tab
            )
          }),
          false,
          'updateHeader'
        )
      },

      removeHeader: (tabId: string, index: number) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      headers: tab.request.headers.filter((_, i) => i !== index)
                    }
                  }
                : tab
            )
          }),
          false,
          'removeHeader'
        )
      },

      addParam: (tabId: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      params: [...tab.request.params, { key: '', value: '', enabled: true }]
                    }
                  }
                : tab
            )
          }),
          false,
          'addParam'
        )
      },

      updateParam: (tabId: string, index: number, paramUpdate: Partial<KeyValuePair>) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      params: tab.request.params.map((param, i) =>
                        i === index ? { ...param, ...paramUpdate } : param
                      )
                    }
                  }
                : tab
            )
          }),
          false,
          'updateParam'
        )
      },

      removeParam: (tabId: string, index: number) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      params: tab.request.params.filter((_, i) => i !== index)
                    }
                  }
                : tab
            )
          }),
          false,
          'removeParam'
        )
      },

      // GraphQL変数関連のアクション
      updateGraphQLVariables: (tabId: string, variables: Record<string, unknown>) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    request: {
                      ...tab.request,
                      variables
                    }
                  }
                : tab
            )
          }),
          false,
          'updateGraphQLVariables'
        )
      },

      // レスポンス関連のアクション
      setResponse: (tabId: string, response: ApiResponse) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, response } : tab))
          }),
          false,
          'setResponse'
        )
      },

      clearResponse: (tabId: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, response: null } : tab))
          }),
          false,
          'clearResponse'
        )
      },

      // 状態管理
      setLoading: (loading: boolean) => {
        set({ isLoading: loading }, false, 'setLoading')
      },

      // データ操作
      exportConfig: () => {
        const state = get()
        const config = {
          tabs: state.tabs.map((tab) => ({
            title: tab.title,
            request: tab.request
          })),
          activeTabId: state.activeTabId,
          version: '1.0'
        }
        return JSON.stringify(config, null, 2)
      },

      importConfig: (configJson: string) => {
        try {
          const config = JSON.parse(configJson) as unknown
          if (
            !config ||
            typeof config !== 'object' ||
            !('tabs' in config) ||
            !Array.isArray((config as { tabs: unknown }).tabs)
          ) {
            throw new Error('Invalid config format')
          }

          const configData = config as { tabs: unknown[] }
          const importedTabs: ApiTab[] = configData.tabs.map((tabData: unknown, index: number) => {
            const tab = tabData as Record<string, unknown>
            const request = (tab.request as Record<string, unknown>) || {}

            return {
              id: uuidv4(),
              title: (tab.title as string) || `Imported ${index + 1}`,
              request: {
                id: uuidv4(),
                name: (request.name as string) || `Imported ${index + 1}`,
                url: (request.url as string) || '',
                method: (request.method as HttpMethod) || 'GET',
                headers: (request.headers as KeyValuePair[]) || [
                  { key: '', value: '', enabled: true }
                ],
                params: (request.params as KeyValuePair[]) || [
                  { key: '', value: '', enabled: true }
                ],
                body: (request.body as string) || '',
                bodyType: (request.bodyType as BodyType) || 'json',
                type: (request.type as 'rest' | 'graphql') || 'rest',
                variables: (request.variables as Record<string, unknown>) || {}
              },
              response: null,
              isActive: false
            }
          })

          if (importedTabs.length > 0) {
            importedTabs[0].isActive = true
            set(
              {
                tabs: importedTabs,
                activeTabId: importedTabs[0].id,
                isLoading: false
              },
              false,
              'importConfig'
            )
          }
        } catch (error) {
          console.error('Failed to import config:', error)
          throw error
        }
      },

      exportYaml: () => {
        const state = get()
        return YamlService.exportToYaml(state.tabs)
      },

      importYaml: (yamlContent: string) => {
        try {
          const importedTabs = YamlService.importFromYaml(yamlContent)

          if (importedTabs.length > 0) {
            importedTabs[0].isActive = true
            set(
              {
                tabs: importedTabs,
                activeTabId: importedTabs[0].id,
                isLoading: false
              },
              false,
              'importYaml'
            )
          }
        } catch (error) {
          console.error('Failed to import YAML:', error)
          throw error
        }
      },

      resetStore: () => {
        const newTab = createInitialTab()
        set(
          {
            tabs: [newTab],
            activeTabId: newTab.id,
            isLoading: false
          },
          false,
          'resetStore'
        )
      },

      // ファイル操作
      saveToFile: async () => {
        try {
          const yamlContent = get().exportYaml()
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
      },

      loadFromFile: async () => {
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
              get().importYaml(readResult.data)
            }
          }
        } catch (error) {
          console.error('Failed to load file:', error)
          throw error
        }
      }
    }),
    {
      name: 'api-store'
    }
  )
)
