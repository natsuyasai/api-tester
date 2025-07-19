import { JSX, useEffect } from 'react'
import styles from './App.module.scss'
import { TabBar } from './components/tab/TabBar'
import { TabContent } from './components/tab/TabContent'
import { useThemeStore } from './stores/themeStore'

function App(): JSX.Element {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className={styles.app_root}>
      <div className={styles.tabContainer}>
        <TabBar />
      </div>
      <div className={styles.contentContainer}>
        <TabContent />
      </div>
    </div>
  )
}

export default App
