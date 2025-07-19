import { JSX, useState } from 'react'
import { useApiStore } from '@/stores/apiStore'
import styles from './ResponseView.module.scss'

interface ResponseViewProps {
  tabId: string
}

export const ResponseView = ({ tabId }: ResponseViewProps): JSX.Element => {
  const { tabs } = useApiStore()
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies'>('body')
  
  const tab = tabs.find(t => t.id === tabId)
  const response = tab?.response

  if (!response) {
    return (
      <div className={styles.noResponse}>
        <div className={styles.icon}>📡</div>
        <h3>No Response</h3>
        <p>Send a request to see the response here</p>
      </div>
    )
  }

  const formatResponseTime = (duration: number): string => {
    if (duration < 1000) {
      return `${duration}ms`
    }
    return `${(duration / 1000).toFixed(2)}s`
  }

  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'success'
    if (status >= 300 && status < 400) return 'warning'
    if (status >= 400) return 'error'
    return 'default'
  }

  return (
    <div className={styles.responseView}>
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          <span className={`${styles.status} ${styles[getStatusColor(response.status)]}`}>
            {response.status} {response.statusText}
          </span>
          <span className={styles.time}>
            {formatResponseTime(response.duration)}
          </span>
          <span className={styles.timestamp}>
            {new Date(response.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'body' ? styles.active : ''}`}
            onClick={() => setActiveTab('body')}
            type="button"
          >
            Body
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'headers' ? styles.active : ''}`}
            onClick={() => setActiveTab('headers')}
            type="button"
          >
            Headers
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'cookies' ? styles.active : ''}`}
            onClick={() => setActiveTab('cookies')}
            type="button"
          >
            Cookies
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'body' && (
          <div className={styles.bodyContent}>
            <pre className={styles.responseBody}>
              {formatJson(response.data)}
            </pre>
          </div>
        )}
        
        {activeTab === 'headers' && (
          <div className={styles.headersContent}>
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className={styles.headerRow}>
                <span className={styles.headerKey}>{key}:</span>
                <span className={styles.headerValue}>{value}</span>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'cookies' && (
          <div className={styles.cookiesContent}>
            <div className={styles.placeholder}>
              No cookies found in response
            </div>
          </div>
        )}
      </div>
    </div>
  )
}