import { JSX, useState, useRef, useEffect } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import { useThemeStore } from '@renderer/stores/themeStore'
import styles from './TabBar.module.scss'

interface TabBarProps {
  className?: string
}

export const TabBar = ({ className }: TabBarProps): JSX.Element => {
  const { tabs, addTab, closeTab, setActiveTab, updateTabTitle, saveToFile, loadFromFile } = useApiStore()
  const { theme, toggleTheme } = useThemeStore()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    closeTab(tabId)
  }

  const handleAddTab = () => {
    addTab()
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

  const handleToggleTheme = () => {
    toggleTheme()
  }

  const handleDoubleClick = (tabId: string, currentTitle: string) => {
    setEditingTabId(tabId)
    setEditingTitle(currentTitle || 'Untitled')
  }

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

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingTabId])

  return (
    <div className={`${styles.tabBar} ${className || ''}`}>
      <div className={styles.tabList}>
        {tabs.map((tab) => (
          <div key={tab.id} className={`${styles.tab} ${tab.isActive ? styles.active : ''}`}>
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
      <div className={styles.controls}>
        <button
          className={styles.fileButton}
          onClick={handleLoadFile}
          aria-label="Load collection from file"
          type="button"
          title="Load"
        >
          📁
        </button>
        <button
          className={styles.fileButton}
          onClick={handleSaveFile}
          aria-label="Save collection to file"
          type="button"
          title="Save"
        >
          💾
        </button>
        <button
          className={styles.themeButton}
          onClick={handleToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          type="button"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
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
