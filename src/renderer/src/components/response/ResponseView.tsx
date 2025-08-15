import { JSX } from 'react'
import { useResponseActions } from '@renderer/hooks/useResponseActions'
import { useResponseTabs } from '@renderer/hooks/useResponseTabs'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { useTabStore } from '@renderer/stores/tabStore'
import {
  getAvailableProperties,
  hasPreviewableProperties,
  getPreviewContent
} from '@renderer/utils/propertyUtils'
import {
  formatResponseTime,
  formatResponseSize,
  formatJson,
  getStatusColor,
  isHtmlResponse,
  isXmlResponse,
  isImageResponse,
  separateResponseData,
  formatMetadata
} from '@renderer/utils/responseUtils'
import { CookiesDisplay } from './CookiesDisplay'
import { PreviewRenderer } from './PreviewRenderer'
import { PropertySelector } from './PropertySelector'
import styles from './ResponseView.module.scss'

interface ResponseViewProps {
  tabId: string
}

export const ResponseView = ({ tabId }: ResponseViewProps): JSX.Element => {
  const { getTab } = useTabStore()
  const { settings } = useGlobalSettingsStore()
  const tab = getTab(tabId)
  const response = tab?.response

  const {
    activeTab,
    selectedPreviewProperty,
    showPropertySelector,
    getCurrentContent,
    handleTabChange,
    handlePreviewPropertyChange,
    togglePropertySelector,
    setShowPropertySelector
  } = useResponseTabs({ tabId, response: response! })

  const { handleCopyToClipboard, handleExportResponse, handleDownloadResponse } =
    useResponseActions({
      tabId,
      response: response ?? null,
      getCurrentContent
    })

  if (!response) {
    return (
      <div className={styles.noResponse}>
        <div className={styles.icon}>📡</div>
        <h2>No Response</h2>
        <p>Send a request to see the response here</p>
      </div>
    )
  }

  // レスポンスデータを分離
  const separatedData = separateResponseData(response.data)

  // ヘルパー関数を作成
  const isHtml = () => isHtmlResponse(response.headers)
  const isXml = () => isXmlResponse(response.headers)
  const isImage = () => isImageResponse(response.headers)
  const hasPreviewable = () => hasPreviewableProperties(response, isHtml, isXml, isImage)
  const availableProperties = getAvailableProperties(response)
  const previewContent = getPreviewContent(
    response,
    selectedPreviewProperty,
    isHtml,
    isXml,
    isImage
  )

  // メタデータがある場合のみタブを表示
  const hasMetadata = Object.keys(separatedData.metadata).length > 0

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
            onClick={() => handleTabChange('body')}
            type="button"
          >
            Body
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'headers' ? styles.active : ''}`}
            onClick={() => handleTabChange('headers')}
            type="button"
          >
            Headers
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'cookies' ? styles.active : ''}`}
            onClick={() => handleTabChange('cookies')}
            type="button"
          >
            Cookies
          </button>
          {hasPreviewable() && (
            <button
              className={`${styles.tab} ${activeTab === 'preview' ? styles.active : ''}`}
              onClick={() => handleTabChange('preview')}
              type="button"
            >
              Preview
            </button>
          )}
          {hasMetadata && (
            <button
              className={`${styles.tab} ${activeTab === 'metadata' ? styles.active : ''}`}
              onClick={() => handleTabChange('metadata')}
              type="button"
            >
              Metadata
            </button>
          )}
          <button
            className={`${styles.tab} ${activeTab === 'raw' ? styles.active : ''}`}
            onClick={() => handleTabChange('raw')}
            type="button"
          >
            Raw
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'body' && (
          <div className={styles.bodyContent}>
            <pre
              className={styles.responseBody}
              style={{
                userSelect: 'text',
                cursor: 'text',
                tabSize: settings.tabSize,
                whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
                lineHeight: settings.lineNumbers ? '1.5' : '1.4'
              }}
            >
              {formatJson(separatedData.actualData)}
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

        {activeTab === 'cookies' && response && (
          <div className={styles.cookiesContent}>
            <CookiesDisplay
              response={response}
              requestUrl={response.finalUrl || tab?.request.url || ''}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className={styles.previewContent}>
            <PropertySelector
              properties={availableProperties}
              selectedProperty={selectedPreviewProperty}
              showPropertyList={showPropertySelector}
              onPropertyChange={handlePreviewPropertyChange}
              onTogglePropertyList={togglePropertySelector}
              onPropertySelect={handlePreviewPropertyChange}
              onClosePropertyList={() => setShowPropertySelector(false)}
            />
            <div className={styles.previewDisplay}>
              <PreviewRenderer previewContent={previewContent} />
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className={styles.metadataContent}>
            <div className={styles.metadataSection}>
              <h3 className={styles.sectionTitle}>Response Processing Information</h3>
              <p className={styles.sectionDescription}>
                このセクションには、レスポンス処理時に追加された情報が表示されます
              </p>
              <pre
                className={styles.metadataData}
                style={{
                  userSelect: 'text',
                  cursor: 'text',
                  tabSize: settings.tabSize,
                  whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
                  lineHeight: settings.lineNumbers ? '1.5' : '1.4'
                }}
              >
                {formatMetadata(separatedData.metadata)}
              </pre>
            </div>
            {separatedData.isBinary && (
              <div className={styles.binaryInfo}>
                <h4 className={styles.subSectionTitle}>Binary Data Information</h4>
                <p className={styles.infoText}>
                  このレスポンスはバイナリデータです。実際のデータはBodyタブで確認できます。
                </p>
              </div>
            )}
            {separatedData.isError && (
              <div className={styles.errorInfo}>
                <h4 className={styles.subSectionTitle}>Error Information</h4>
                <p className={styles.infoText}>
                  このレスポンスはエラー情報です。詳細はBodyタブで確認できます。
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className={styles.rawContent}>
            <pre
              className={styles.rawData}
              style={{
                userSelect: 'text',
                cursor: 'text',
                tabSize: settings.tabSize,
                whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
                lineHeight: settings.lineNumbers ? '1.5' : '1.4'
              }}
            >
              {getCurrentContent()}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
