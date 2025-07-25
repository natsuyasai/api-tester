import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ApiTab } from '@/types/types'
import { showErrorDialog } from '@renderer/utils/errorUtils'
import { useCollectionStore } from './collectionStore'
import { useSessionStore } from './sessionStore'

interface TabState {
  tabs: ApiTab[]
  activeTabId: string
}

interface TabActions {
  addTab: (collectionId?: string, sessionId?: string) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabTitle: (tabId: string, title: string) => void
  setTabCollection: (tabId: string, collectionId?: string) => void
  setTabSession: (tabId: string, sessionId?: string) => void
  getActiveTab: () => ApiTab | undefined
  getTab: (tabId: string) => ApiTab | undefined
  getTabsByCollection: (collectionId?: string) => ApiTab[]
  getTabsBySession: (sessionId?: string) => ApiTab[]
  canCloseTab: (tabId: string) => boolean
  resetTabs: () => void
  switchToNextTab: () => void
  switchToPreviousTab: () => void
  closeActiveTab: () => void
  startEditingActiveTab: () => string | null
  saveAllTabs: () => void
  loadAllTabs: () => void
  inheritSessionFromTab: (fromTabId: string, toTabId: string) => void
}

const createInitialTab = (collectionId?: string, sessionId?: string): ApiTab => ({
  id: uuidv4(),
  title: 'New Request',
  isActive: true,
  response: null,
  collectionId,
  sessionId,
  request: {
    id: uuidv4(),
    name: 'New Request',
    url: '',
    method: 'GET',
    headers: [],
    params: [],
    body: '',
    bodyType: 'json',
    bodyKeyValuePairs: [],
    type: 'rest'
  }
})

const initialTab = createInitialTab()
const initialState: TabState = {
  tabs: [initialTab],
  activeTabId: initialTab.id
}

export const useTabStore = create<TabState & TabActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addTab: (collectionId?: string, sessionId?: string) => {
        // セッションIDが指定されていない場合、アクティブセッションを使用
        const finalSessionId = sessionId || useSessionStore.getState().activeSessionId
        const newTab = createInitialTab(collectionId, finalSessionId)
        set(
          (state) => ({
            tabs: [...state.tabs.map((tab) => ({ ...tab, isActive: false })), newTab],
            activeTabId: newTab.id
          }),
          false,
          'addTab'
        )
        return newTab.id
      },

      canCloseTab: (tabId: string) => {
        const state = get()
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab) return false

        // 全体で1つのタブしかない場合は閉じられない
        if (state.tabs.length <= 1) return false

        // フォルダが選択されている場合のみ、フォルダ内のタブ数をチェック
        if (tab.collectionId) {
          const collectionTabs = state.tabs.filter((t) => t.collectionId === tab.collectionId)
          
          // フォルダ内に1つしかタブがない場合は閉じられない
          if (collectionTabs.length <= 1) return false
        }

        return true
      },

      closeTab: (tabId: string) => {
        const state = get()

        // 閉じることができるかチェック
        if (!state.canCloseTab(tabId)) {
          return
        }

        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
        if (tabIndex === -1) return

        const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
        let newActiveTabId = state.activeTabId

        // すべてのタブを閉じた場合は新規タブを生成
        if (newTabs.length === 0) {
          const activeSessionId = useSessionStore.getState().activeSessionId
          const newTab = createInitialTab(undefined, activeSessionId)
          set(
            {
              tabs: [newTab],
              activeTabId: newTab.id
            },
            false,
            'closeTab - create new tab'
          )
          return
        }

        if (state.activeTabId === tabId) {
          if (tabIndex >= newTabs.length) {
            newActiveTabId = newTabs[newTabs.length - 1].id
          } else {
            newActiveTabId = newTabs[tabIndex].id
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

      setTabCollection: (tabId: string, collectionId?: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, collectionId } : tab))
          }),
          false,
          'setTabCollection'
        )
      },

      setTabSession: (tabId: string, sessionId?: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, sessionId } : tab))
          }),
          false,
          'setTabSession'
        )
      },

      getActiveTab: () => {
        const state = get()
        return state.tabs.find((tab) => tab.id === state.activeTabId)
      },

      getTab: (tabId: string) => {
        const state = get()
        return state.tabs.find((tab) => tab.id === tabId)
      },

      getTabsByCollection: (collectionId?: string) => {
        const state = get()
        return state.tabs.filter((tab) => tab.collectionId === collectionId)
      },

      getTabsBySession: (sessionId?: string) => {
        const state = get()
        return state.tabs.filter((tab) => tab.sessionId === sessionId)
      },

      resetTabs: () => {
        const activeSessionId = useSessionStore.getState().activeSessionId
        const newTab = createInitialTab(undefined, activeSessionId)
        set(
          {
            tabs: [newTab],
            activeTabId: newTab.id
          },
          false,
          'resetTabs'
        )
      },

      switchToNextTab: () => {
        const state = get()
        const collectionStore = useCollectionStore.getState()
        const activeCollectionId = collectionStore.activeCollectionId

        // アクティブコレクション内のタブのみを取得
        const collectionTabs = activeCollectionId
          ? state.tabs.filter((tab) => tab.collectionId === activeCollectionId)
          : state.tabs.filter((tab) => !tab.collectionId)

        if (collectionTabs.length <= 1) return

        const currentIndex = collectionTabs.findIndex((tab) => tab.id === state.activeTabId)
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % collectionTabs.length
          const nextTab = collectionTabs[nextIndex]
          if (nextTab) {
            set(
              (state) => ({
                tabs: state.tabs.map((tab) => ({
                  ...tab,
                  isActive: tab.id === nextTab.id
                })),
                activeTabId: nextTab.id
              }),
              false,
              'switchToNextTab'
            )
          }
        }
      },

      switchToPreviousTab: () => {
        const state = get()
        const collectionStore = useCollectionStore.getState()
        const activeCollectionId = collectionStore.activeCollectionId

        // アクティブコレクション内のタブのみを取得
        const collectionTabs = activeCollectionId
          ? state.tabs.filter((tab) => tab.collectionId === activeCollectionId)
          : state.tabs.filter((tab) => !tab.collectionId)

        if (collectionTabs.length <= 1) return

        const currentIndex = collectionTabs.findIndex((tab) => tab.id === state.activeTabId)
        if (currentIndex !== -1) {
          const prevIndex = currentIndex === 0 ? collectionTabs.length - 1 : currentIndex - 1
          const prevTab = collectionTabs[prevIndex]
          if (prevTab) {
            set(
              (state) => ({
                tabs: state.tabs.map((tab) => ({
                  ...tab,
                  isActive: tab.id === prevTab.id
                })),
                activeTabId: prevTab.id
              }),
              false,
              'switchToPreviousTab'
            )
          }
        }
      },

      closeActiveTab: () => {
        const state = get()
        const activeTab = state.getActiveTab()
        if (activeTab) {
          state.closeTab(activeTab.id)
        }
      },

      startEditingActiveTab: () => {
        const state = get()
        const activeTab = state.getActiveTab()
        return activeTab ? activeTab.id : null
      },

      saveAllTabs: () => {
        const state = get()
        try {
          const tabsData = {
            tabs: state.tabs,
            activeTabId: state.activeTabId,
            timestamp: Date.now()
          }
          localStorage.setItem('api-tester-tabs', JSON.stringify(tabsData))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          void showErrorDialog('タブ保存エラー', 'タブの保存中にエラーが発生しました', errorMessage)
        }
      },

      loadAllTabs: () => {
        try {
          const stored = localStorage.getItem('api-tester-tabs')
          if (stored) {
            const tabsData = JSON.parse(stored) as {
              tabs: ApiTab[]
              activeTabId: string
              timestamp: number
            }

            // 基本的な型チェック
            if (Array.isArray(tabsData.tabs) && tabsData.tabs.length > 0) {
              set(
                {
                  tabs: tabsData.tabs.map((tab) => ({
                    ...tab,
                    isActive: tab.id === tabsData.activeTabId
                  })),
                  activeTabId: tabsData.activeTabId
                },
                false,
                'loadAllTabs'
              )
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          void showErrorDialog(
            'タブ読み込みエラー',
            'タブの読み込み中にエラーが発生しました',
            errorMessage
          )
        }
      },

      inheritSessionFromTab: (fromTabId: string, toTabId: string) => {
        const state = get()
        const fromTab = state.tabs.find((tab) => tab.id === fromTabId)
        const toTab = state.tabs.find((tab) => tab.id === toTabId)

        if (fromTab && toTab && fromTab.sessionId) {
          set(
            (state) => ({
              tabs: state.tabs.map((tab) =>
                tab.id === toTabId ? { ...tab, sessionId: fromTab.sessionId } : tab
              )
            }),
            false,
            'inheritSessionFromTab'
          )
          console.log(
            `Session inherited from tab ${fromTabId} to tab ${toTabId}: ${fromTab.sessionId}`
          )
        }
      }
    }),
    {
      name: 'tab-store'
    }
  )
)
