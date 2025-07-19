import { JSX } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import { RequestForm } from '../forms/RequestForm'
import { ResponseView } from '../response/ResponseView'
import styles from './TabContent.module.scss'

interface TabContentProps {
  className?: string
}

export const TabContent = ({ className }: TabContentProps): JSX.Element => {
  const { tabs, activeTabId } = useApiStore()

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  if (!activeTab) {
    return <div className={styles.noTab}>No active tab</div>
  }

  return (
    <div className={`${styles.tabContent} ${className || ''}`}>
      <div className={styles.requestSection}>
        <RequestForm tabId={activeTab.id} />
      </div>
      <div className={styles.responseSection}>
        <ResponseView tabId={activeTab.id} />
      </div>
    </div>
  )
}
