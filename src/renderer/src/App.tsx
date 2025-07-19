import { JSX } from 'react'
import styles from './App.module.scss'
import { TabBar } from './components/tab/TabBar'
import { TabContent } from './components/tab/TabContent'

function App(): JSX.Element {
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
