import { JSX, useState } from 'react'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './ResponseView.module.scss'

interface ResponseViewProps {
  tabId: string
}

export const ResponseView = ({ tabId }: ResponseViewProps): JSX.Element => {
  const { getTab } = useTabStore()
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'preview' | 'raw'>(
    'body'
  )
  const [selectedPreviewProperty, setSelectedPreviewProperty] = useState<string>('data')
  const [showPropertySelector, setShowPropertySelector] = useState(false)

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

  const getAvailableProperties = (): Array<{ path: string; value: unknown; type: string }> => {
    if (!response) return []

    const properties: Array<{ path: string; value: unknown; type: string }> = []

    const extractProperties = (obj: unknown, path: string = '', maxDepth: number = 3): void => {
      if (maxDepth <= 0) return

      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key
          const valueType = Array.isArray(value) ? 'array' : typeof value

          properties.push({
            path: currentPath,
            value,
            type: valueType
          })

          if (typeof value === 'object' && value !== null) {
            extractProperties(value, currentPath, maxDepth - 1)
          }
        })
      }
    }

    // レスポンス全体
    properties.push({ path: 'data', value: response.data, type: typeof response.data })

    // レスポンスデータの中身を探索
    if (response.data && typeof response.data === 'object') {
      extractProperties(response.data, 'data')
    }

    return properties
  }

  const getPropertyValue = (path: string): unknown => {
    if (!response) return null

    if (path === 'data') {
      return response.data
    }

    const pathParts = path.split('.')
    let current: unknown = response

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return null
      }
    }

    return current
  }

  const isPreviewableProperty = (value: unknown, _type: string): boolean => {
    if (typeof value === 'string') {
      // HTMLかXMLの内容かチェック
      const str = value.trim()
      return (
        (str.startsWith('<') &&
          (str.includes('<html') || str.includes('<?xml') || str.includes('<svg'))) ||
        str.startsWith('data:image/') ||
        str.length > 50 // 長いテキストもプレビュー対象とする
      )
    }

    // バイナリデータオブジェクトのチェック
    if (value && typeof value === 'object' && 'type' in value && value.type === 'binary') {
      const binaryData = value as { type: string; isPreviewable?: boolean }
      return binaryData.isPreviewable === true
    }

    return false
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
      const previewValue = getPropertyValue(selectedPreviewProperty)
      return typeof previewValue === 'string' ? previewValue : formatJson(previewValue)
    } else if (activeTab === 'raw') {
      return getRawContent()
    }
    return ''
  }

  const formatHttpRequest = (): string => {
    if (!tab) return ''

    const request = tab.request
    const url = new URL(request.url)

    // リクエストパラメータを追加
    const enabledParams = request.params.filter((param) => param.enabled && param.key)
    enabledParams.forEach((param) => {
      url.searchParams.set(param.key, param.value)
    })

    // API Key認証でクエリパラメータに追加する場合
    if (request.auth?.type === 'api-key' && request.auth.apiKey?.location === 'query') {
      url.searchParams.set(request.auth.apiKey.key, request.auth.apiKey.value)
    }

    // リクエストライン
    let raw = `${JSON.stringify(request, undefined, 2)}\n`

    // ヘッダー
    const enabledHeaders = request.headers.filter((h) => h.enabled && h.key)
    enabledHeaders.forEach((header) => {
      raw += `${header.key}: ${header.value}\n`
    })

    // 認証ヘッダー
    if (request.auth) {
      switch (request.auth.type) {
        case 'basic':
          if (request.auth.basic) {
            const credentials = btoa(
              `${request.auth.basic.username}:${request.auth.basic.password}`
            )
            raw += `Authorization: Basic ${credentials}\n`
          }
          break
        case 'bearer':
          if (request.auth.bearer) {
            raw += `Authorization: Bearer ${request.auth.bearer.token}\n`
          }
          break
        case 'api-key':
          if (request.auth.apiKey && request.auth.apiKey.location === 'header') {
            raw += `${request.auth.apiKey.key}: ${request.auth.apiKey.value}\n`
          }
          break
      }
    }

    // User-Agent（設定されている場合）
    if (
      request.settings?.userAgent &&
      !enabledHeaders.some((h) => h.key.toLowerCase() === 'user-agent')
    ) {
      raw += `User-Agent: ${request.settings.userAgent}\n`
    }

    // Content-Type（ボディがある場合）
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
      if (!enabledHeaders.some((h) => h.key.toLowerCase() === 'content-type')) {
        switch (request.bodyType) {
          case 'json':
          case 'graphql':
            raw += 'Content-Type: application/json\n'
            break
          case 'x-www-form-urlencoded':
            raw += 'Content-Type: application/x-www-form-urlencoded\n'
            break
          case 'form-data':
            raw += 'Content-Type: multipart/form-data\n'
            break
          default:
            raw += 'Content-Type: text/plain\n'
        }
      }
    }

    raw += '\n'

    // ボディ
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (request.bodyType === 'form-data') {
        const enabledPairs =
          request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []
        if (enabledPairs.length > 0) {
          raw += '[Form Data]\n'
          enabledPairs.forEach((pair) => {
            if (pair.isFile) {
              raw += `${pair.key}: [File: ${pair.fileName || 'unknown'}]\n`
            } else {
              raw += `${pair.key}: ${pair.value}\n`
            }
          })
        }
      } else if (request.body) {
        if (request.bodyType === 'graphql') {
          const graphqlPayload = {
            query: request.body,
            variables: request.variables || {},
            operationName: null
          }
          raw += JSON.stringify(graphqlPayload, null, 2)
        } else {
          raw += request.body
        }
      }
    }

    return raw
  }

  const formatHttpResponse = (): string => {
    if (!response) return ''

    // ステータスライン
    let raw = `HTTP/1.1 ${response.status} ${response.statusText}\n`

    // レスポンスヘッダー
    Object.entries(response.headers).forEach(([key, value]) => {
      raw += `${key}: ${value}\n`
    })

    raw += '\n'

    // レスポンスボディ
    if (response.data) {
      if (typeof response.data === 'string') {
        raw += response.data
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        'type' in response.data &&
        response.data.type === 'binary'
      ) {
        const binaryData = response.data as {
          type: string
          subType: string
          contentType: string
          size: number
        }
        raw += `[Binary Data: ${binaryData.contentType}, Size: ${binaryData.size} bytes]`
      } else {
        raw += JSON.stringify(response.data, null, 2)
      }
    }

    return raw
  }

  const getRawContent = (): string => {
    const requestRaw = formatHttpRequest()
    const responseRaw = formatHttpResponse()

    return `=== REQUEST ===\n${requestRaw}\n\n=== RESPONSE ===\n${responseRaw}`
  }

  const hasPreviewableProperties = (): boolean => {
    const properties = getAvailableProperties()
    return (
      properties.some((prop) => isPreviewableProperty(prop.value, prop.type)) ||
      isHtmlResponse() ||
      isXmlResponse() ||
      isImageResponse()
    )
  }

  const getPreviewContent = (): {
    content: string
    type: 'html' | 'xml' | 'image' | 'audio' | 'video' | 'document' | 'text'
  } => {
    const previewValue = getPropertyValue(selectedPreviewProperty)

    // バイナリデータオブジェクトの処理
    if (
      previewValue &&
      typeof previewValue === 'object' &&
      'type' in previewValue &&
      previewValue.type === 'binary'
    ) {
      const binaryData = previewValue as {
        type: string
        subType: string
        dataUrl?: string
        isPreviewable: boolean
        contentType: string
      }

      if (binaryData.isPreviewable && binaryData.dataUrl) {
        switch (binaryData.subType) {
          case 'image':
            return { content: binaryData.dataUrl, type: 'image' }
          case 'audio':
            return { content: binaryData.dataUrl, type: 'audio' }
          case 'video':
            return { content: binaryData.dataUrl, type: 'video' }
          case 'document':
            return { content: binaryData.dataUrl, type: 'document' }
          default:
            return { content: `Binary data (${binaryData.contentType})`, type: 'text' }
        }
      }
    }

    if (typeof previewValue === 'string') {
      const str = previewValue.trim()

      if (str.startsWith('data:image/')) {
        return { content: str, type: 'image' }
      } else if (str.startsWith('<') && (str.includes('<html') || str.includes('<HTML'))) {
        return { content: str, type: 'html' }
      } else if (str.startsWith('<') && (str.includes('<?xml') || str.includes('<svg'))) {
        return { content: str, type: 'xml' }
      }
    }

    // フォールバック: レスポンスヘッダーベースの判定
    if (selectedPreviewProperty === 'data') {
      if (isHtmlResponse()) {
        return { content: String(previewValue), type: 'html' }
      } else if (isXmlResponse()) {
        return { content: String(previewValue), type: 'xml' }
      } else if (isImageResponse()) {
        return { content: String(previewValue), type: 'image' }
      }
    }

    return {
      content: typeof previewValue === 'string' ? previewValue : formatJson(previewValue),
      type: 'text'
    }
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
          {hasPreviewableProperties() && (
            <button
              className={`${styles.tab} ${activeTab === 'preview' ? styles.active : ''}`}
              onClick={() => setActiveTab('preview')}
              type="button"
            >
              Preview
            </button>
          )}
          <button
            className={`${styles.tab} ${activeTab === 'raw' ? styles.active : ''}`}
            onClick={() => setActiveTab('raw')}
            type="button"
          >
            Raw
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

        {activeTab === 'preview' && (
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <div className={styles.propertySelector}>
                <label htmlFor="property-select" className={styles.selectorLabel}>
                  プレビュー対象:
                </label>
                <select
                  id="property-select"
                  className={styles.propertySelect}
                  value={selectedPreviewProperty}
                  onChange={(e) => setSelectedPreviewProperty(e.target.value)}
                >
                  {getAvailableProperties()
                    .filter(
                      (prop) => isPreviewableProperty(prop.value, prop.type) || prop.path === 'data'
                    )
                    .map((prop) => (
                      <option key={prop.path} value={prop.path}>
                        {prop.path} ({prop.type})
                      </option>
                    ))}
                </select>
                <button
                  className={styles.propertySelectorToggle}
                  onClick={() => setShowPropertySelector(!showPropertySelector)}
                  type="button"
                  title="プロパティ一覧を表示"
                >
                  {showPropertySelector ? '📋 隠す' : '📋 一覧'}
                </button>
              </div>

              {showPropertySelector && (
                <div className={styles.propertyList}>
                  <h3>利用可能なプロパティ:</h3>
                  <div className={styles.propertyGrid}>
                    {getAvailableProperties().map((prop) => (
                      <button
                        key={prop.path}
                        className={`${styles.propertyItem} ${isPreviewableProperty(prop.value, prop.type) ? styles.previewable : ''}`}
                        onClick={() => {
                          setSelectedPreviewProperty(prop.path)
                          setShowPropertySelector(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedPreviewProperty(prop.path)
                            setShowPropertySelector(false)
                          }
                        }}
                        type="button"
                      >
                        <span className={styles.propertyPath}>{prop.path}</span>
                        <span className={styles.propertyType}>{prop.type}</span>
                        {isPreviewableProperty(prop.value, prop.type) && (
                          <span className={styles.previewBadge}>📄</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.previewDisplay}>
              {(() => {
                const { content, type } = getPreviewContent()

                switch (type) {
                  case 'html':
                    return (
                      <iframe
                        className={styles.htmlPreview}
                        srcDoc={content}
                        title="HTML Preview"
                        sandbox="allow-same-origin"
                        loading="lazy"
                      />
                    )
                  case 'xml':
                    return (
                      <pre
                        className={styles.xmlPreview}
                        style={{ userSelect: 'text', cursor: 'text' }}
                      >
                        {content}
                      </pre>
                    )
                  case 'image':
                    return (
                      <div className={styles.imagePreview}>
                        <img
                          src={content}
                          alt="Preview"
                          className={styles.previewImage}
                          width={800}
                          height={600}
                        />
                      </div>
                    )
                  case 'audio':
                    return (
                      <div className={styles.audioPreview}>
                        <audio controls className={styles.previewAudio} src={content}>
                          <track kind="captions" />
                          お使いのブラウザは音声の再生をサポートしていません。
                        </audio>
                      </div>
                    )
                  case 'video':
                    return (
                      <div className={styles.videoPreview}>
                        <video
                          controls
                          className={styles.previewVideo}
                          src={content}
                          width={800}
                          height={600}
                        >
                          <track kind="captions" />
                          お使いのブラウザは動画の再生をサポートしていません。
                        </video>
                      </div>
                    )
                  case 'document':
                    return (
                      <div className={styles.documentPreview}>
                        <iframe
                          className={styles.documentFrame}
                          src={content}
                          title="Document Preview"
                          width="100%"
                          height="600"
                        />
                      </div>
                    )
                  default:
                    return (
                      <pre
                        className={styles.textPreview}
                        style={{ userSelect: 'text', cursor: 'text' }}
                      >
                        {content}
                      </pre>
                    )
                }
              })()}
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className={styles.rawContent}>
            <pre className={styles.rawData} style={{ userSelect: 'text', cursor: 'text' }}>
              {getRawContent()}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
