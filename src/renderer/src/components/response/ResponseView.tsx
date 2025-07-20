import { JSX, useState } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import styles from './ResponseView.module.scss'

interface ResponseViewProps {
  tabId: string
}

export const ResponseView = ({ tabId }: ResponseViewProps): JSX.Element => {
  const { tabs } = useApiStore()
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies'>('body')

  const tab = tabs.find((t) => t.id === tabId)
  const response = tab?.response

  if (!response) {
    return (
      <div className={styles.noResponse}>
        <div className={styles.icon}>📡</div>
        <h2>No Response</h2>
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

  const getCurrentContent = (): string => {
    if (activeTab === 'body') {
      return formatJson(response.data)
    } else if (activeTab === 'headers') {
      return Object.entries(response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    } else if (activeTab === 'cookies') {
      return 'No cookies found in response'
    }
    return ''
  }

  const handleCopyToClipboard = async (): Promise<void> => {
    try {
      const content = getCurrentContent()
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleExportResponse = async (): Promise<void> => {
    if (!tab || !response) return

    const exportData = {
      request: {
        url: tab.request.url,
        method: tab.request.method,
        headers: tab.request.headers.filter((h) => h.enabled && h.key),
        params: tab.request.params.filter((p) => p.enabled && p.key),
        body: tab.request.body
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration: response.duration,
        timestamp: response.timestamp
      }
    }

    try {
      const jsonContent = JSON.stringify(exportData, null, 2)
      const result = await window.dialogAPI.showSaveDialog({
        title: 'Export API Response',
        defaultPath: `api-response-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, jsonContent)
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to export file')
        }
      }
    } catch (error) {
      console.error('Failed to export response:', error)
    }
  }

  return (
    <div className={styles.responseView}>
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          <span className={`${styles.status} ${styles[getStatusColor(response.status)]}`}>
            {response.status} {response.statusText}
          </span>
          <span className={styles.time}>{formatResponseTime(response.duration)}</span>
          <span className={styles.timestamp}>
            {new Date(response.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.copyButton}
            onClick={() => {
              handleCopyToClipboard().catch(console.error)
            }}
            type="button"
            title="Copy current tab content to clipboard"
          >
            📋 Copy
          </button>
          <button
            className={styles.exportButton}
            onClick={() => {
              handleExportResponse().catch(console.error)
            }}
            type="button"
            title="Export response data"
          >
            📄 Export
          </button>
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
            <pre className={styles.responseBody} style={{ userSelect: 'text', cursor: 'text' }}>
              {formatJson(response.data)}
            </pre>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className={styles.headersContent} style={{ userSelect: 'text', cursor: 'text' }}>
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className={styles.headerRow}>
                <span className={styles.headerKey}>{key}:</span>
                <span className={styles.headerValue}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cookies' && (
          <div className={styles.cookiesContent} style={{ userSelect: 'text', cursor: 'text' }}>
            <div className={styles.placeholder}>No cookies found in response</div>
          </div>
        )}
      </div>
    </div>
  )
}
