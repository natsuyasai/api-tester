import { JSX, useState } from 'react'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './ResponseView.module.scss'

interface ResponseViewProps {
  tabId: string
}

export const ResponseView = ({ tabId }: ResponseViewProps): JSX.Element => {
  const { getTab } = useTabStore()
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'preview'>('body')

  const tab = getTab(tabId)
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

  const formatResponseSize = (data: unknown): string => {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data)
    const sizeInBytes = new Blob([dataString]).size

    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
    } else {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
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

  const isHtmlResponse = (): boolean => {
    if (!response?.headers) return false
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || ''
    return contentType.toLowerCase().includes('text/html')
  }

  const isXmlResponse = (): boolean => {
    if (!response?.headers) return false
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || ''
    return (
      contentType.toLowerCase().includes('xml') ||
      contentType.toLowerCase().includes('application/xml')
    )
  }

  const isImageResponse = (): boolean => {
    if (!response?.headers) return false
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || ''
    return contentType.toLowerCase().startsWith('image/')
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
    } else if (activeTab === 'preview') {
      return typeof response.data === 'string' ? response.data : formatJson(response.data)
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

  const handleDownloadResponse = async (): Promise<void> => {
    if (!response) return

    try {
      const contentType =
        response.headers['content-type'] ||
        response.headers['Content-Type'] ||
        'application/octet-stream'
      const content =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)

      let defaultExtension = 'txt'
      if (contentType.includes('json')) {
        defaultExtension = 'json'
      } else if (contentType.includes('html')) {
        defaultExtension = 'html'
      } else if (contentType.includes('xml')) {
        defaultExtension = 'xml'
      } else if (contentType.includes('csv')) {
        defaultExtension = 'csv'
      } else if (contentType.startsWith('image/')) {
        defaultExtension = contentType.split('/')[1] || 'jpg'
      }

      const result = await window.dialogAPI.showSaveDialog({
        title: 'Download Response',
        defaultPath: `response-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${defaultExtension}`,
        filters: [
          { name: 'Response File', extensions: [defaultExtension] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, content)
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to download file')
        }
      }
    } catch (error) {
      console.error('Failed to download response:', error)
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
          <span className={styles.size}>{formatResponseSize(response.data)}</span>
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
          <button
            className={styles.downloadButton}
            onClick={() => {
              handleDownloadResponse().catch(console.error)
            }}
            type="button"
            title="Download response as file"
          >
            💾 Download
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
          {(isHtmlResponse() || isXmlResponse() || isImageResponse()) && (
            <button
              className={`${styles.tab} ${activeTab === 'preview' ? styles.active : ''}`}
              onClick={() => setActiveTab('preview')}
              type="button"
            >
              Preview
            </button>
          )}
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

        {activeTab === 'preview' && (
          <div className={styles.previewContent}>
            {isHtmlResponse() && (
              <iframe
                className={styles.htmlPreview}
                srcDoc={typeof response.data === 'string' ? response.data : ''}
                title="HTML Preview"
                sandbox="allow-same-origin"
                loading="lazy"
              />
            )}
            {isXmlResponse() && !isHtmlResponse() && (
              <pre className={styles.xmlPreview} style={{ userSelect: 'text', cursor: 'text' }}>
                {typeof response.data === 'string' ? response.data : formatJson(response.data)}
              </pre>
            )}
            {isImageResponse() && (
              <div className={styles.imagePreview}>
                <img
                  src={`data:${response.headers['content-type'] || response.headers['Content-Type']};base64,${String(response.data)}`}
                  alt="Response"
                  className={styles.previewImage}
                  width={800}
                  height={600}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
