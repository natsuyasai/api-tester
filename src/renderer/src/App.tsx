import { JSX, useEffect, useState } from 'react'
import styles from './App.module.scss'
import { GlobalSettings } from './components/settings/GlobalSettings'
import { TabBar } from './components/tab/TabBar'
import { TabContent } from './components/tab/TabContent'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useThemeStore } from './stores/themeStore'

function App(): JSX.Element {
  const { theme } = useThemeStore()
  const [showSettings, setShowSettings] = useState(false)
  useKeyboardShortcuts()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
