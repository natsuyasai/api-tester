import { JSX, useState, useRef, useEffect, useCallback } from 'react'
import { useYamlOperations } from '@renderer/hooks/useYamlOperations'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './TabBar.module.scss'

interface TabBarProps {
  className?: string
  onShowSettings?: () => void
  onToggleCollections?: () => void
  onToggleHistory?: () => void
}

export const TabBar = ({
  className,
  onShowSettings,
  onToggleCollections,
  onToggleHistory
}: TabBarProps): JSX.Element => {
  const {
    tabs,
    addTab,
    closeTab,
    setActiveTab,
    updateTabTitle,
    startEditingActiveTab,
    getTabsByCollection
  } = useTabStore()
  const { activeCollectionId, getActiveCollection } = useCollectionStore()
  const { saveToFile, loadFromFile } = useYamlOperations()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const tabListRef = useRef<HTMLDivElement>(null)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    closeTab(tabId)
  }

  const handleAddTab = () => {
    addTab(activeCollectionId)
  }

  const handleSaveFile = async () => {
    try {
      await saveToFile()
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  const handleLoadFile = async () => {
    try {
      await loadFromFile()
    } catch (error) {
      console.error('Failed to load file:', error)
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
          className={styles.scrollButton}
          onClick={scrollLeft}
          aria-label="Scroll tabs left"
          type="button"
        >
          ‹
        </button>
      )}
      <div className={styles.tabList} ref={tabListRef}>
        {/* コレクションがアクティブな場合はそのコレクションのタブのみ表示 */}
        {(activeCollectionId ? getTabsByCollection(activeCollectionId) : tabs).map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.isActive ? styles.active : ''} ${editingTabId === tab.id ? styles.editing : ''}`}
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
                type="button"
              >
                <span className={styles.title} title={tab.title}>
                  {tab.title || 'Untitled'}
                </span>
              </button>
            )}
            {tabs.length > 1 && (
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
          className={styles.scrollButton}
          onClick={scrollRight}
          aria-label="Scroll tabs right"
          type="button"
        >
          ›
        </button>
      )}
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
          onClick={() => void handleLoadFile()}
          aria-label="Load collection from file"
          type="button"
          title="Load"
        >
          📁
        </button>
        <button
          className={styles.fileButton}
          onClick={() => void handleSaveFile()}
          aria-label="Save collection to file"
          type="button"
          title="Save"
        >
          💾
        </button>
        {onToggleHistory && (
          <button
            className={styles.historyButton}
            onClick={onToggleHistory}
            aria-label="Toggle execution history"
            type="button"
            title="実行履歴"
          >
            📈
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
        <button
          className={styles.addButton}
          onClick={handleAddTab}
          aria-label="Add new tab"
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}
