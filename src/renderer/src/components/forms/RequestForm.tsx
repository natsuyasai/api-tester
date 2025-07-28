import { JSX, useState } from 'react'
import { HttpMethod } from '@/types/types'
import { IpcApiService } from '@renderer/services/ipcApiService'
import { useEnvironmentStore } from '@renderer/stores/environmentStore'
import { useGlobalVariablesStore } from '@renderer/stores/globalVariablesStore'
import { useRequestStore } from '@renderer/stores/requestStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { AuthEditor } from './AuthEditor'
import { BodyEditor } from './BodyEditor'
import { EnvironmentEditor } from './EnvironmentEditor'
import { KeyValueEditor } from './KeyValueEditor'
import { PostScriptEditor } from './PostScriptEditor'
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
    updatePostScript,
    setLoading,
    setResponse,
    isLoading
  } = useRequestStore()
  const { resolveVariables } = useEnvironmentStore()
  const { resolveSessionVariables } = useSessionStore()
  const { addVariable, updateVariable, getVariableByKey } = useGlobalVariablesStore()

  const tab = getTab(tabId)
  const [activeSection, setActiveSection] = useState<
    'params' | 'headers' | 'auth' | 'body' | 'environment' | 'settings' | 'postscript'
  >('params')

  if (!tab) {
    return <div>Tab not found</div>
  }

  const { request } = tab

  const handleSendRequest = async () => {
    if (!request.url) return

    // リクエストのバリデーション
    const validationErrors = await IpcApiService.validateRequest(
      request,
      resolveVariables,
      resolveSessionVariables,
      tab.sessionId
    )
    if (validationErrors.length > 0) {
      alert(`Validation errors:\n${validationErrors.join('\n')}`)
      return
    }

    setLoading(true)
    try {
      // グローバル変数操作のコールバックを作成
      const globalVariableCallbacks = {
        setGlobalVariable: (key: string, value: string, description?: string) => {
          // 既存の変数を探す
          const existingVariable = getVariableByKey(key)

          if (existingVariable) {
            // 既存の変数を更新
            updateVariable(existingVariable.id, {
              key,
              value,
              enabled: true,
              description: description || existingVariable.description
            })
          } else {
            // 新しい変数を追加
            addVariable()
            // 最新の状態を取得して新しい変数のIDを取得
            const state = useGlobalVariablesStore.getState()
            const newVariable = state.variables[state.variables.length - 1]
            if (newVariable) {
              updateVariable(newVariable.id, {
                key,
                value,
                enabled: true,
                description:
                  description || `Generated from API response at ${new Date().toISOString()}`
              })
            }
          }
        },
        getGlobalVariable: (key: string) => {
          const variable = getVariableByKey(key)
          return variable?.enabled ? variable.value : null
        }
      }

      const response = await IpcApiService.executeRequest(
        request,
        resolveVariables,
        true,
        resolveSessionVariables,
        tab.sessionId,
        globalVariableCallbacks
      )
      // 実行時のリクエスト内容を保存
      const responseWithExecutedRequest = {
        ...response,
        executedRequest: { ...request } // リクエストのディープコピーを保存
      }
      setResponse(tabId, responseWithExecutedRequest)
    } catch (error) {
      console.error('Request failed:', error)
      // エラーレスポンスを設定
      setResponse(tabId, {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: {
          type: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        duration: 0,
        timestamp: new Date().toISOString(),
        executedRequest: { ...request } // エラー時も実行時のリクエストを保存
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    updateUrl(tabId, url)
    // 手動でタイトルが変更されていない場合のみ自動生成
    if (url && !tab.isCustomTitle) {
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
    // 手動でタイトルが変更されていない場合のみ更新
    if (request.url && !tab.isCustomTitle) {
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
          onClick={() => {
            handleSendRequest().catch((error) => {
              console.error('リクエスト送信でエラーが発生:', error)
            })
          }}
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
          <button
            className={`${styles.tab} ${activeSection === 'postscript' ? styles.active : ''}`}
            onClick={() => setActiveSection('postscript')}
            type="button"
          >
            Post Script
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
          {activeSection === 'postscript' && (
            <PostScriptEditor
              postScript={request.postScript}
              onChange={(postScript) => updatePostScript(tabId, postScript)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
