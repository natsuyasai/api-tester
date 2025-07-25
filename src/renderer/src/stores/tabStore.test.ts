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
      addTab('test-collection-id')

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].title).toBe('New Request')
      expect(state.tabs[1].isActive).toBe(true)
      expect(state.tabs[0].isActive).toBe(false)
      expect(state.activeTabId).toBe(state.tabs[1].id)
    })

    it('should close a tab when multiple tabs exist in same collection', () => {
      const { addTab, closeTab } = useTabStore.getState()
      // 同じコレクション（undefined）にタブを追加
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

    it('should not close tab when it is the only tab in collection', () => {
      const { closeTab } = useTabStore.getState()
      const initialState = useTabStore.getState()
      const tabId = initialState.tabs[0].id

      closeTab(tabId)

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].id).toBe(tabId) // タブは閉じられない
      expect(state.tabs[0].title).toBe('Test Tab') // 元のタブが残る
    })

    it('should set active tab', () => {
      const { addTab, setActiveTab } = useTabStore.getState()
      addTab('test-collection-id')

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
      addTab('test-collection-id')
      addTab('test-collection-id')

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
      const { addTab, closeTab } = useTabStore.getState()
      // 同じコレクション（undefined）にタブを追加して閉じることができるようにする
      addTab()
      addTab()

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
      // 同じコレクション（undefined）にタブを追加
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

  describe('canCloseTab', () => {
    it('should return false when only one tab exists globally', () => {
      const { canCloseTab } = useTabStore.getState()
      const state = useTabStore.getState()
      const tabId = state.tabs[0].id

      expect(canCloseTab(tabId)).toBe(false)
    })

    it('should return false when only one tab exists in collection', () => {
      const { addTab, canCloseTab } = useTabStore.getState()
      addTab('collection-1')

      const state = useTabStore.getState()
      const tab = state.tabs.find((t) => t.collectionId === 'collection-1')

      expect(canCloseTab(tab!.id)).toBe(false)
    })

    it('should return true when multiple tabs exist in collection', () => {
      const { addTab, canCloseTab } = useTabStore.getState()
      addTab('collection-1') // 同じコレクションに追加
      addTab('collection-1') // もう1つ同じコレクションに追加

      const state = useTabStore.getState()
      const collectionTab = state.tabs.find(t => t.collectionId === 'collection-1')

      expect(canCloseTab(collectionTab!.id)).toBe(true)
    })

    it('should return true when multiple tabs exist without collection', () => {
      const { addTab, canCloseTab } = useTabStore.getState()
      addTab() // フォルダ未選択のタブを追加

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id

      expect(canCloseTab(firstTabId)).toBe(true)
    })

    it('should return false for non-existent tab', () => {
      const { canCloseTab } = useTabStore.getState()

      expect(canCloseTab('non-existent')).toBe(false)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should switch to next tab', () => {
      const { addTab, switchToNextTab } = useTabStore.getState()
      // コレクションIDを設定しないでタブを追加（同じフィルターリングを受ける）
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id
      const secondTabId = state.tabs[1].id

      expect(state.activeTabId).toBe(secondTabId)

      switchToNextTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(firstTabId)
      expect(updatedState.tabs[0].isActive).toBe(true)
      expect(updatedState.tabs[1].isActive).toBe(false)
    })

    it('should switch to previous tab', () => {
      const { addTab, switchToPreviousTab } = useTabStore.getState()
      // コレクションIDを設定しないでタブを追加（同じフィルターリングを受ける）
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id
      const secondTabId = state.tabs[1].id

      expect(state.activeTabId).toBe(secondTabId)

      switchToPreviousTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(firstTabId)
      expect(updatedState.tabs[0].isActive).toBe(true)
      expect(updatedState.tabs[1].isActive).toBe(false)
    })

    it('should wrap around when switching to next tab at end', () => {
      const { addTab, setActiveTab, switchToNextTab } = useTabStore.getState()
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id
      const secondTabId = state.tabs[1].id

      setActiveTab(firstTabId)
      switchToNextTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(secondTabId)
    })

    it('should wrap around when switching to previous tab at beginning', () => {
      const { addTab, setActiveTab, switchToPreviousTab } = useTabStore.getState()
      addTab()

      const state = useTabStore.getState()
      const firstTabId = state.tabs[0].id
      const secondTabId = state.tabs[1].id

      setActiveTab(firstTabId)
      switchToPreviousTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.activeTabId).toBe(secondTabId)
    })

    it('should close active tab via keyboard shortcut', () => {
      const { addTab, closeActiveTab } = useTabStore.getState()
      // 同じコレクションIDでタブを追加し、閉じることができるようにする
      addTab()

      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)

      const activeTabId = state.activeTabId
      closeActiveTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.tabs).toHaveLength(1)
      expect(updatedState.tabs.find((tab) => tab.id === activeTabId)).toBeUndefined()
    })

    it('should not close tab when only one tab exists in collection', () => {
      const { closeActiveTab } = useTabStore.getState()
      const state = useTabStore.getState()
      const tabId = state.tabs[0].id

      closeActiveTab()

      const updatedState = useTabStore.getState()
      expect(updatedState.tabs).toHaveLength(1)
      expect(updatedState.tabs[0].id).toBe(tabId) // タブは閉じられない
    })

    it('should return active tab id for editing', () => {
      const { startEditingActiveTab } = useTabStore.getState()
      const state = useTabStore.getState()
      const activeTabId = state.activeTabId

      const result = startEditingActiveTab()

      expect(result).toBe(activeTabId)
    })

    it('should return null when no active tab exists for editing', () => {
      const { startEditingActiveTab } = useTabStore.getState()

      useTabStore.setState({
        tabs: [],
        activeTabId: ''
      })

      const result = startEditingActiveTab()

      expect(result).toBeNull()
    })
  })
})
