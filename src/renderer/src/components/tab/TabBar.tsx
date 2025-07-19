import { JSX } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import styles from './TabBar.module.scss'

interface TabBarProps {
  className?: string
}

export const TabBar = ({ className }: TabBarProps): JSX.Element => {
  const { tabs, addTab, closeTab, setActiveTab } = useApiStore()

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

  return (
    <div className={`${styles.tabBar} ${className || ''}`}>
      <div className={styles.tabList}>
        {tabs.map((tab) => (
          <div key={tab.id} className={`${styles.tab} ${tab.isActive ? styles.active : ''}`}>
            <button
              className={styles.tabButton}
              onClick={() => handleTabClick(tab.id)}
              type="button"
            >
              <span className={styles.title} title={tab.title}>
                {tab.title || 'Untitled'}
              </span>
            </button>
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
      <button
        className={styles.addButton}
        onClick={handleAddTab}
        aria-label="Add new tab"
        type="button"
      >
        +
      </button>
    </div>
  )
}
