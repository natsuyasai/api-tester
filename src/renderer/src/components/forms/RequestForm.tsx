import { JSX, useState } from 'react'
import { ApiServiceV2 } from '@/services/apiServiceV2'
import { HttpMethod } from '@/types/types'
import { useEnvironmentStore } from '@renderer/stores/environmentStore'
import { useRequestStore } from '@renderer/stores/requestStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { AuthEditor } from './AuthEditor'
import { BodyEditor } from './BodyEditor'
import { EnvironmentEditor } from './EnvironmentEditor'
import { KeyValueEditor } from './KeyValueEditor'
import styles from './RequestForm.module.scss'
import { RequestSettingsEditor } from './RequestSettingsEditor'

interface RequestFormProps {
  tabId: string
}

export const RequestForm = ({ tabId }: RequestFormProps): JSX.Element => {
  const { getTab, updateTabTitle } = useTabStore()
  const {
    updateUrl,
    updateMethod,
    updateBody,
    updateBodyType,
    updateGraphQLVariables,
    updateAuth,
    updateSettings,
    setLoading,
    setResponse,
    isLoading
  } = useRequestStore()
  const { resolveVariables } = useEnvironmentStore()

  const tab = getTab(tabId)
  const [activeSection, setActiveSection] = useState<
    'params' | 'headers' | 'auth' | 'body' | 'environment' | 'settings'
  >('params')

  if (!tab) {
    return <div>Tab not found</div>
  }

  const { request } = tab

  const handleSendRequest = async () => {
    if (!request.url) return

    // リクエストのバリデーション
    const validationErrors = await ApiServiceV2.validateRequest(request, resolveVariables)
    if (validationErrors.length > 0) {
      alert(`Validation errors:\n${validationErrors.join('\n')}`)
      return
    }

    setLoading(true)
    try {
      const response = await ApiServiceV2.executeRequest(request, resolveVariables)
      setResponse(tabId, response)
    } catch (error) {
      console.error('Request failed:', error)
      // エラーレスポンスを設定
      setResponse(tabId, {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: { type: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' },
        duration: 0,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    updateUrl(tabId, url)
    // URLからタブタイトルを自動生成
    if (url) {
      try {
        const urlObj = new URL(url)
        const title = `${request.method} ${urlObj.pathname}`
        updateTabTitle(tabId, title)
      } catch {
        // URLが不正な場合はそのままタイトルにする
        updateTabTitle(tabId, `${request.method} ${url}`)
      }
    }
  }

  const handleMethodChange = (method: HttpMethod) => {
    updateMethod(tabId, method)
    // メソッド変更時もタイトルを更新
    if (request.url) {
      try {
        const urlObj = new URL(request.url)
        const title = `${method} ${urlObj.pathname}`
        updateTabTitle(tabId, title)
      } catch {
        updateTabTitle(tabId, `${method} ${request.url}`)
      }
    }
  }

  const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

  return (
    <div className={styles.requestForm}>
      <div className={styles.urlSection}>
        <select
          value={request.method}
          onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
          className={styles.methodSelect}
        >
          {httpMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <input
          type="url"
          value={request.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="Enter request URL"
          className={styles.urlInput}
        />
        <button
          onClick={() => void handleSendRequest()}
          disabled={isLoading || !request.url}
          className={styles.sendButton}
          type="button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className={styles.optionsSection}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeSection === 'params' ? styles.active : ''}`}
            onClick={() => setActiveSection('params')}
            type="button"
          >
            Params
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'headers' ? styles.active : ''}`}
            onClick={() => setActiveSection('headers')}
            type="button"
          >
            Headers
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'auth' ? styles.active : ''}`}
            onClick={() => setActiveSection('auth')}
            type="button"
          >
            Auth
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'body' ? styles.active : ''}`}
            onClick={() => setActiveSection('body')}
            type="button"
          >
            Body
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'environment' ? styles.active : ''}`}
            onClick={() => setActiveSection('environment')}
            type="button"
          >
            Environment
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveSection('settings')}
            type="button"
          >
            Settings
          </button>
        </div>

        <div className={styles.content}>
          {activeSection === 'params' && (
            <KeyValueEditor tabId={tabId} type="params" items={request.params} />
          )}
          {activeSection === 'headers' && (
            <KeyValueEditor tabId={tabId} type="headers" items={request.headers} />
          )}
          {activeSection === 'auth' && (
            <AuthEditor auth={request.auth} onChange={(auth) => updateAuth(tabId, auth)} />
          )}
          {activeSection === 'body' && (
            <BodyEditor
              tabId={tabId}
              body={request.body}
              bodyType={request.bodyType}
              variables={request.variables}
              onBodyChange={(body) => updateBody(tabId, body)}
              onBodyTypeChange={(bodyType) => updateBodyType(tabId, bodyType)}
              onVariablesChange={(variables) => updateGraphQLVariables(tabId, variables)}
            />
          )}
          {activeSection === 'environment' && <EnvironmentEditor />}
          {activeSection === 'settings' && (
            <RequestSettingsEditor
              settings={request.settings}
              onChange={(settings) => updateSettings(tabId, settings)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
