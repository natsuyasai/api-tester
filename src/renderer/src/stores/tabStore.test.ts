import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './tabStore'

describe('TabStore', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [
        {
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          response: null,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com',
            method: 'GET',
            headers: [{ key: '', value: '', enabled: true }],
            params: [{ key: '', value: '', enabled: true }],
            body: '',
            bodyType: 'json',
            type: 'rest'
          }
        }
      ],
      activeTabId: 'tab-1'
    })
  })

  describe('Tab Management', () => {
    it('should initialize with a default tab', () => {
      useTabStore.getState().resetTabs()
      const state = useTabStore.getState()

      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].title).toBe('New Request')
      expect(state.tabs[0].isActive).toBe(true)
      expect(state.activeTabId).toBe(state.tabs[0].id)
    })

    it('should add a new tab', () => {
      const { addTab } = useTabStore.getState()
      addTab()

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].title).toBe('New Request')
      expect(state.tabs[1].isActive).toBe(true)
      expect(state.tabs[0].isActive).toBe(false)
      expect(state.activeTabId).toBe(state.tabs[1].id)
    })

    it('should close a tab when multiple tabs exist', () => {
      const { addTab, closeTab } = useTabStore.getState()
      addTab()

      const initialState = useTabStore.getState()
      const firstTabId = initialState.tabs[0].id
      const secondTabId = initialState.tabs[1].id

      closeTab(firstTabId)

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe(secondTabId)
      expect(state.activeTabId).toBe(secondTabId)
    })

    it('should not close the last remaining tab', () => {
      const { closeTab } = useTabStore.getState()
      const initialState = useTabStore.getState()
      const tabId = initialState.tabs[0].id

      closeTab(tabId)

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe(tabId)
    })

    it('should set active tab', () => {
      const { addTab, setActiveTab } = useTabStore.getState()
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id

      setActiveTab(firstTabId)

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(firstTabId)
      expect(updatedState.tabs[0].isActive).toBe(true)
      expect(updatedState.tabs[1].isActive).toBe(false)
    })

    it('should update tab title', () => {
      const { updateTabTitle } = useTabStore.getState()
      const state = useTabStore.getState()
      const tabId = state.tabs[0].id

      updateTabTitle(tabId, 'Updated Title')

      const updatedState = useTabStore.getState()
      expect(updatedState.tabs[0].title).toBe('Updated Title')
    })

    it('should get active tab', () => {
      const { getActiveTab } = useTabStore.getState()
      const activeTab = getActiveTab()

      expect(activeTab).toBeDefined()
      expect(activeTab?.isActive).toBe(true)
      expect(activeTab?.id).toBe('tab-1')
    })

    it('should get tab by id', () => {
      const { getTab } = useTabStore.getState()
      const tab = getTab('tab-1')

      expect(tab).toBeDefined()
      expect(tab?.id).toBe('tab-1')
      expect(tab?.title).toBe('Test Tab')
    })

    it('should return undefined for non-existent tab', () => {
      const { getTab } = useTabStore.getState()
      const tab = getTab('non-existent')

      expect(tab).toBeUndefined()
    })

    it('should reset tabs', () => {
      const { addTab, resetTabs } = useTabStore.getState()
      addTab()
      addTab()

      expect(useTabStore.getState().tabs).toHaveLength(3)

      resetTabs()

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].title).toBe('New Request')
      expect(state.tabs[0].isActive).toBe(true)
    })
  })

  describe('Tab Closing Logic', () => {
    it('should activate next tab when closing active tab', () => {
      const { addTab, addTab: addSecondTab, closeTab } = useTabStore.getState()
      addTab()
      addSecondTab()

      const state = useTabStore.getState()
      const activeTabId = state.activeTabId

      closeTab(activeTabId)

      const updatedState = useTabStore.getState()
      expect(updatedState.tabs).toHaveLength(2)
      expect(updatedState.activeTabId).not.toBe(activeTabId)
      expect(updatedState.tabs.find((tab) => tab.id === updatedState.activeTabId)?.isActive).toBe(
        true
      )
    })

    it('should activate previous tab when closing last tab', () => {
      const { addTab, closeTab, setActiveTab } = useTabStore.getState()
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id
      const secondTabId = state.tabs[1].id

      setActiveTab(secondTabId)
      closeTab(secondTabId)

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(firstTabId)
      expect(updatedState.tabs[0].isActive).toBe(true)
    })
  })
})
