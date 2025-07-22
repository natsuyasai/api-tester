import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ApiTab } from '@/types/types'
import { KeyValuePairOperations } from '@renderer/utils/keyValueUtils'

interface TabState {
  tabs: ApiTab[]
  activeTabId: string
}

interface TabActions {
  addTab: (collectionId?: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabTitle: (tabId: string, title: string) => void
  setTabCollection: (tabId: string, collectionId?: string) => void
  getActiveTab: () => ApiTab | undefined
  getTab: (tabId: string) => ApiTab | undefined
  getTabsByCollection: (collectionId?: string) => ApiTab[]
  resetTabs: () => void
  switchToNextTab: () => void
  switchToPreviousTab: () => void
  closeActiveTab: () => void
  startEditingActiveTab: () => string | null
  saveAllTabs: () => void
  loadAllTabs: () => void
}

const createInitialTab = (collectionId?: string): ApiTab => ({
  id: uuidv4(),
  title: 'New Request',
  isActive: true,
  response: null,
  collectionId,
  request: {
    id: uuidv4(),
    name: 'New Request',
    url: '',
    method: 'GET',
    headers: KeyValuePairOperations.add([]),
    params: KeyValuePairOperations.add([]),
    body: '',
    bodyType: 'json',
    bodyKeyValuePairs: KeyValuePairOperations.add([]),
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

      addTab: (collectionId?: string) => {
        const newTab = createInitialTab(collectionId)
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
        if (state.tabs.length <= 1) return

        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
        if (tabIndex === -1) return

        const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
        let newActiveTabId = state.activeTabId

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

      setTabCollection: (tabId: string, collectionId?: string) => {
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, collectionId } : tab))
          }),
          false,
          'setTabCollection'
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

      resetTabs: () => {
        const newTab = createInitialTab()
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
        const currentIndex = state.tabs.findIndex((tab) => tab.id === state.activeTabId)
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % state.tabs.length
          const nextTab = state.tabs[nextIndex]
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
        const currentIndex = state.tabs.findIndex((tab) => tab.id === state.activeTabId)
        if (currentIndex !== -1) {
          const prevIndex = currentIndex === 0 ? state.tabs.length - 1 : currentIndex - 1
          const prevTab = state.tabs[prevIndex]
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
        if (activeTab && state.tabs.length > 1) {
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
          console.error('Failed to save tabs to localStorage:', error)
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
          console.error('Failed to load tabs from localStorage:', error)
        }
      }
    }),
    {
      name: 'tab-store'
    }
  )
)
