import { JSX, useState, useEffect } from 'react'
import styles from './App.module.scss'
import { GlobalSettings } from './components/settings/GlobalSettings'
import { TabBar } from './components/tab/TabBar'
import { TabContent } from './components/tab/TabContent'
import { useAutoSave } from './hooks/useAutoSave'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTabStore } from './stores/tabStore'

function App(): JSX.Element {
  const [showSettings, setShowSettings] = useState(false)
  const { loadAllTabs } = useTabStore()
  
  useKeyboardShortcuts()
  useAutoSave() // 自動保存機能を有効化

  // テーマ管理はglobalSettingsStoreで自動的に処理される

  // アプリケーション起動時にタブを復元
  useEffect(() => {
    loadAllTabs()
  }, [loadAllTabs])

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
      <div className={styles.tabContainer}>
        <TabBar onShowSettings={handleShowSettings} />
      </div>
      <div className={styles.contentContainer}>
        <TabContent />
      </div>
    </div>
  )
}

export default App
