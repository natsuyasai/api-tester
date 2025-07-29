import { JSX, useState, useRef, useEffect, useCallback } from 'react'
import { useYamlOperations } from '@renderer/hooks/useYamlOperations'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { showErrorDialog } from '@renderer/utils/errorUtils'
import styles from './TabBar.module.scss'

interface TabBarProps {
  className?: string
  onShowSettings?: () => void
  onToggleCollections?: () => void
  onToggleSessions?: () => void
}

export const TabBar = ({
  className,
  onShowSettings,
  onToggleCollections,
  onToggleSessions
}: TabBarProps): JSX.Element => {
  const {
    tabs,
    addTab,
    closeTab,
    setActiveTab,
    updateTabTitle,
    startEditingActiveTab,
    getTabsByCollection,
    canCloseTab,
    reorderTabs
  } = useTabStore()
  const { activeCollectionId, getActiveCollection } = useCollectionStore()
  const { getActiveSession } = useSessionStore()
  const { saveToFile, loadFromFile } = useYamlOperations()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const tabListRef = useRef<HTMLDivElement>(null)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null)

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    closeTab(tabId)
  }

  const handleTabMouseDown = (e: React.MouseEvent, tabId: string) => {
    // 中クリック（ボタン1）でタブを閉じる
    if (e.button === 1) {
      e.preventDefault()
      e.stopPropagation()
      if (canCloseTab(tabId)) {
        closeTab(tabId)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tabId)
  }

  const handleDragEnd = () => {
    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // タブ要素の外に出た場合のみクリア
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverTabId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()

    const draggedTabIdFromData = e.dataTransfer.getData('text/plain')
    if (!draggedTabIdFromData || draggedTabIdFromData === targetTabId) {
      return
    }

    // 現在表示されているタブのリストを取得
    const visibleTabs = activeCollectionId
      ? getTabsByCollection(activeCollectionId)
      : getTabsByCollection(undefined)

    const dragIndex = visibleTabs.findIndex((tab) => tab.id === draggedTabIdFromData)
    const hoverIndex = visibleTabs.findIndex((tab) => tab.id === targetTabId)

    if (dragIndex !== -1 && hoverIndex !== -1 && dragIndex !== hoverIndex) {
      reorderTabs(dragIndex, hoverIndex)
    }

    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  const handleAddTab = () => {
    addTab(activeCollectionId)
  }

  const handleSaveFile = async () => {
    try {
      await saveToFile()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'ファイル保存エラー',
        'ファイルの保存中にエラーが発生しました',
        errorMessage
      )
    }
  }

  const handleLoadFile = async () => {
    try {
      await loadFromFile()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'ファイル読み込みエラー',
        'ファイルの読み込み中にエラーが発生しました',
        errorMessage
      )
    }
  }

  const handleDoubleClick = (tabId: string, currentTitle: string) => {
    setEditingTabId(tabId)
    setEditingTitle(currentTitle || 'Untitled')
  }

  const handleStartEditingActiveTab = useCallback(() => {
    const activeTabId = startEditingActiveTab()
    if (activeTabId) {
      const activeTab = tabs.find((tab) => tab.id === activeTabId)
      if (activeTab) {
        setEditingTabId(activeTabId)
        setEditingTitle(activeTab.title || 'Untitled')
      }
    }
  }, [startEditingActiveTab, tabs])

  const handleTitleSubmit = () => {
    if (editingTabId && editingTitle.trim()) {
      updateTabTitle(editingTabId, editingTitle.trim())
    }
    setEditingTabId(null)
    setEditingTitle('')
  }

  const handleTitleCancel = () => {
    setEditingTabId(null)
    setEditingTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }

  const checkScrollButtons = () => {
    if (tabListRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabListRef.current
      setShowLeftScroll(scrollLeft > 0)
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const scrollLeft = () => {
    if (tabListRef.current) {
      tabListRef.current.scrollBy({ left: -120, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (tabListRef.current) {
      tabListRef.current.scrollBy({ left: 120, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingTabId])

  useEffect(() => {
    checkScrollButtons()
    const handleResize = () => checkScrollButtons()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [tabs])

  useEffect(() => {
    const tabList = tabListRef.current
    if (tabList) {
      const handleScroll = () => checkScrollButtons()
      tabList.addEventListener('scroll', handleScroll)
      return () => tabList.removeEventListener('scroll', handleScroll)
    }
    return () => {}
  }, [])

  useEffect(() => {
    const handleEditActiveTab = () => {
      handleStartEditingActiveTab()
    }

    document.addEventListener('edit-active-tab', handleEditActiveTab)
    return () => {
      document.removeEventListener('edit-active-tab', handleEditActiveTab)
    }
  }, [handleStartEditingActiveTab])

  return (
    <div className={`${styles.tabBar} ${className || ''}`}>
      {onToggleCollections && (
        <button
          className={styles.collectionsButton}
          onClick={onToggleCollections}
          aria-label="Toggle collections panel"
          type="button"
          title="コレクション"
        >
          📁
        </button>
      )}
      {showLeftScroll && (
        <button
          className={`${styles.scrollButton} ${styles.left}`}
          onClick={scrollLeft}
          aria-label="Scroll tabs left"
          type="button"
        >
          ‹
        </button>
      )}
      <div className={styles.tabList} ref={tabListRef}>
        {/* コレクションがアクティブな場合はそのコレクションのタブのみ表示 */}
        {(activeCollectionId
          ? getTabsByCollection(activeCollectionId)
          : getTabsByCollection(undefined)
        ).map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.isActive ? styles.active : ''} ${editingTabId === tab.id ? styles.editing : ''} ${draggedTabId === tab.id ? styles.dragging : ''} ${dragOverTabId === tab.id ? styles.dragOver : ''}`}
            draggable={editingTabId !== tab.id}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab.id)}
            role="tab"
            tabIndex={-1}
            aria-selected={tab.isActive}
          >
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                className={styles.titleInput}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
                type="text"
                maxLength={50}
              />
            ) : (
              <button
                className={styles.tabButton}
                onClick={() => handleTabClick(tab.id)}
                onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
                onMouseDown={(e) => handleTabMouseDown(e, tab.id)}
                type="button"
              >
                <span className={styles.title} title={tab.title}>
                  {tab.title || 'Untitled'}
                </span>
              </button>
            )}
            {canCloseTab(tab.id) && (
              <button
                className={styles.closeButton}
                onClick={(e) => handleCloseTab(e, tab.id)}
                aria-label={`Close ${tab.title}`}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {showRightScroll && (
        <button
          className={`${styles.scrollButton} ${styles.right}`}
          onClick={scrollRight}
          aria-label="Scroll tabs right"
          type="button"
        >
          ›
        </button>
      )}
      <button
        className={styles.addButton}
        onClick={handleAddTab}
        aria-label="Add new tab"
        type="button"
      >
        +
      </button>
      <div className={styles.controls}>
        {activeCollectionId && (
          <div className={styles.collectionIndicator}>
            <span className={styles.collectionName}>
              {getActiveCollection()?.name || 'コレクション'}
            </span>
          </div>
        )}
        <button
          className={styles.fileButton}
          onClick={() => {
            handleLoadFile().catch((error) => {
              console.error('ファイル読み込みでエラーが発生:', error)
            })
          }}
          aria-label="Load collection from file"
          type="button"
          title="Load"
        >
          📁
        </button>
        <button
          className={styles.fileButton}
          onClick={() => {
            handleSaveFile().catch((error) => {
              console.error('ファイル保存でエラーが発生:', error)
            })
          }}
          aria-label="Save collection to file"
          type="button"
          title="Save"
        >
          💾
        </button>
        {onToggleSessions && (
          <button
            className={styles.sessionButton}
            onClick={onToggleSessions}
            aria-label="Toggle session manager"
            type="button"
            title={`セッション管理 ${getActiveSession()?.name ? `(${getActiveSession()?.name})` : ''}`}
          >
            🔐
          </button>
        )}
        {onShowSettings && (
          <button
            className={styles.settingsButton}
            onClick={onShowSettings}
            aria-label="Open global settings"
            type="button"
            title="グローバル設定"
          >
            ⚙️
          </button>
        )}
      </div>
    </div>
  )
}
