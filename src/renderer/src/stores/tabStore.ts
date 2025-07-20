import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ApiTab } from '@/types/types'

interface TabState {
  tabs: ApiTab[]
  activeTabId: string
}

interface TabActions {
  addTab: () => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabTitle: (tabId: string, title: string) => void
  getActiveTab: () => ApiTab | undefined
  getTab: (tabId: string) => ApiTab | undefined
  resetTabs: () => void
}

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
    bodyKeyValuePairs: [{ key: '', value: '', enabled: true }],
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

      getActiveTab: () => {
        const state = get()
        return state.tabs.find((tab) => tab.id === state.activeTabId)
      },

      getTab: (tabId: string) => {
        const state = get()
        return state.tabs.find((tab) => tab.id === tabId)
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
      }
    }),
    {
      name: 'tab-store'
    }
  )
)
