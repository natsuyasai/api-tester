import { JSX, useState, useEffect } from 'react'
import styles from './App.module.scss'
import { CollectionPanel } from './components/collection/CollectionPanel'
import { ExecutionHistory } from './components/collection/ExecutionHistory'
import { GlobalSettings } from './components/settings/GlobalSettings'
import { TabBar } from './components/tab/TabBar'
import { TabContent } from './components/tab/TabContent'
import { useAutoSave } from './hooks/useAutoSave'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTabCollectionSync } from './hooks/useTabCollectionSync'
import { useCollectionStore } from './stores/collectionStore'
import { useTabStore } from './stores/tabStore'

function App(): JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const [showCollectionPanel, setShowCollectionPanel] = useState(false)
  const [showExecutionHistory, setShowExecutionHistory] = useState(false)
  const { loadAllTabs } = useTabStore()
  const { loadFromStorage } = useCollectionStore()

  useKeyboardShortcuts()
  useAutoSave() // 自動保存機能を有効化
  useTabCollectionSync() // タブとコレクションの同期

  // テーマ管理はglobalSettingsStoreで自動的に処理される

  // アプリケーション起動時にタブとコレクションを復元
  useEffect(() => {
    loadAllTabs()
    loadFromStorage()
  }, [loadAllTabs, loadFromStorage])

  const handleShowSettings = () => {
    setShowSettings(true)
  }

  const handleHideSettings = () => {
    setShowSettings(false)
  }

  if (showSettings) {
    return (
      <div className={styles.app_root}>
        <div className={styles.settingsContainer}>
          <div className={styles.settingsHeader}>
            <button
              type="button"
              onClick={handleHideSettings}
              className={styles.backButton}
              aria-label="Back to main app"
            >
              ← 戻る
            </button>
          </div>
          <GlobalSettings />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app_root}>
      <CollectionPanel
        isVisible={showCollectionPanel}
        onToggle={() => setShowCollectionPanel(!showCollectionPanel)}
      />

      <div className={`${styles.mainContent} ${showCollectionPanel ? styles.withSidebar : ''}`}>
        <div className={styles.tabContainer}>
          <TabBar
            onShowSettings={handleShowSettings}
            onToggleCollections={() => setShowCollectionPanel(!showCollectionPanel)}
            onToggleHistory={() => setShowExecutionHistory(!showExecutionHistory)}
          />
        </div>
        <div className={styles.contentContainer}>
          <TabContent />
        </div>
      </div>

      <ExecutionHistory
        isVisible={showExecutionHistory}
        onToggle={() => setShowExecutionHistory(!showExecutionHistory)}
      />
    </div>
  )
}

export default App
