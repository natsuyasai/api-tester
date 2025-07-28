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
  reorderTabs: (dragIndex: number, hoverIndex: number) => void
  cleanupDeletedCollections: () => void
}

const createInitialTab = (collectionId?: string, sessionId?: string): ApiTab => ({
  id: uuidv4(),
  title: 'New Request',
  isActive: true,
  response: null,
  collectionId,
  sessionId,
  isCustomTitle: false,
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

        // コレクションが指定されている場合、コレクション側にもタブを追加
        if (collectionId) {
          const collectionStore = useCollectionStore.getState()
          collectionStore.addTabToCollection(collectionId, newTab.id)
        }

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

        const closingTab = state.tabs[tabIndex]
        const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
        let newActiveTabId = state.activeTabId

        // コレクションからもタブを削除
        if (closingTab.collectionId) {
          const collectionStore = useCollectionStore.getState()
          collectionStore.removeTabFromCollection(closingTab.collectionId, tabId)
        }

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
            tabs: state.tabs.map((tab) =>
              tab.id === tabId ? { ...tab, title, isCustomTitle: true } : tab
            )
          }),
          false,
          'updateTabTitle'
        )
      },

      setTabCollection: (tabId: string, collectionId?: string) => {
        const state = get()
        const tab = state.tabs.find((t) => t.id === tabId)
        if (!tab) return

        const previousCollectionId = tab.collectionId

        // タブのコレクションIDを更新
        set(
          (state) => ({
            tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, collectionId } : tab))
          }),
          false,
          'setTabCollection'
        )

        const collectionStore = useCollectionStore.getState()

        // 以前のコレクションからタブを削除
        if (previousCollectionId) {
          collectionStore.removeTabFromCollection(previousCollectionId, tabId)
        }

        // 新しいコレクションにタブを追加
        if (collectionId) {
          collectionStore.addTabToCollection(collectionId, tabId)
        }
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
      },

      reorderTabs: (dragIndex: number, hoverIndex: number) => {
        const state = get()
        const collectionStore = useCollectionStore.getState()
        const activeCollectionId = collectionStore.activeCollectionId

        // 現在のコレクションに応じたタブを取得
        const visibleTabs = activeCollectionId
          ? state.tabs.filter((tab) => tab.collectionId === activeCollectionId)
          : state.tabs.filter((tab) => !tab.collectionId)

        if (
          dragIndex < 0 ||
          hoverIndex < 0 ||
          dragIndex >= visibleTabs.length ||
          hoverIndex >= visibleTabs.length
        ) {
          return
        }

        // ドラッグ対象のタブを取得
        const dragTab = visibleTabs[dragIndex]
        if (!dragTab) return

        // 新しい順序でタブを並び替え
        const reorderedVisibleTabs = [...visibleTabs]
        reorderedVisibleTabs.splice(dragIndex, 1)
        reorderedVisibleTabs.splice(hoverIndex, 0, dragTab)

        // 他のコレクションのタブと結合
        const otherTabs = activeCollectionId
          ? state.tabs.filter((tab) => tab.collectionId !== activeCollectionId)
          : state.tabs.filter((tab) => tab.collectionId)

        // 最終的なタブ配列を構築
        let newTabs: ApiTab[]
        if (activeCollectionId) {
          // アクティブコレクションがある場合は、そのコレクションのタブを並び替え
          newTabs = [...otherTabs, ...reorderedVisibleTabs]
        } else {
          // ルートレベルの場合は、ルートタブを並び替え
          newTabs = [...reorderedVisibleTabs, ...otherTabs]
        }

        set(
          {
            tabs: newTabs
          },
          false,
          'reorderTabs'
        )
      },

      cleanupDeletedCollections: () => {
        const state = get()
        const collectionStore = useCollectionStore.getState()
        const existingCollectionIds = new Set(collectionStore.collections.map((c) => c.id))

        // 存在しないコレクションIDを持つタブのcollectionIdをクリア
        const updatedTabs = state.tabs.map((tab) => {
          if (tab.collectionId && !existingCollectionIds.has(tab.collectionId)) {
            return { ...tab, collectionId: undefined }
          }
          return tab
        })

        // 変更があった場合のみ更新
        const hasChanges = updatedTabs.some(
          (tab, index) => tab.collectionId !== state.tabs[index].collectionId
        )

        if (hasChanges) {
          set({ tabs: updatedTabs }, false, 'cleanupDeletedCollections')
        }
      }
    }),
    {
      name: 'tab-store'
    }
  )
)
