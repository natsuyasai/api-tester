import { JSX, useState, useId } from 'react'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './SessionManager.module.scss'

interface SessionManagerProps {
  isVisible: boolean
  onToggle: () => void
}

export function SessionManager({ isVisible, onToggle }: SessionManagerProps): JSX.Element {
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedTabForInherit, setSelectedTabForInherit] = useState<string>('')
  const inheritSelectId = useId()

  const {
    sessions,
    activeSessionId,
    sharedVariables,
    setActiveSession,
    createSession,
    deleteSession,
    duplicateSession,
    getActiveSession
  } = useSessionStore()

  const { tabs, getActiveTab, inheritSessionFromTab } = useTabStore()

  const activeSession = getActiveSession()
  const activeTab = getActiveTab()

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      createSession(newSessionName.trim())
      setNewSessionName('')
      setIsCreateMode(false)
    }
  }

  const handleDuplicateSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      const newName = `${session.name} - コピー`
      duplicateSession(sessionId, newName)
    }
  }

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length > 1) {
      deleteSession(sessionId)
    }
  }

  const handleInheritSession = () => {
    if (selectedTabForInherit && activeTab) {
      inheritSessionFromTab(selectedTabForInherit, activeTab.id)
      setSelectedTabForInherit('')
    }
  }

  return (
    <div className={`${styles.sessionManager} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.sessionHeader}>
        <h3 className={styles.sessionTitle}>セッション管理</h3>
        <div className={styles.sessionActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setIsCreateMode(!isCreateMode)}
          >
            新規作成
          </button>
          <button type="button" className={styles.actionButton} onClick={onToggle}>
            閉じる
          </button>
        </div>
      </div>

      {/* セッション作成フォーム */}
      {isCreateMode && (
        <div className={styles.createSessionForm}>
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="セッション名を入力"
            className={styles.sessionNameInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateSession()
              }
              if (e.key === 'Escape') {
                setIsCreateMode(false)
                setNewSessionName('')
              }
            }}
          />
          <button
            type="button"
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={handleCreateSession}
          >
            作成
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              setIsCreateMode(false)
              setNewSessionName('')
            }}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* セッション選択 */}
      <div className={styles.sessionSelector}>
        <div className={styles.sessionSelectWrapper}>
          <select
            value={activeSessionId || ''}
            onChange={(e) => setActiveSession(e.target.value || undefined)}
            className={styles.sessionSelect}
          >
            <option value="">セッションを選択</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.variables.length}個の変数)
              </option>
            ))}
          </select>
          {activeSession && (
            <>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => handleDuplicateSession(activeSession.id)}
                title="セッションを複製"
              >
                複製
              </button>
              {sessions.length > 1 && (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleDeleteSession(activeSession.id)}
                  title="セッションを削除"
                >
                  削除
                </button>
              )}
            </>
          )}
        </div>

        {activeSession && (
          <div className={styles.sessionInfo}>
            作成日: {new Date(activeSession.createdAt).toLocaleDateString()}
            {activeSession.updatedAt !== activeSession.createdAt && (
              <> | 更新日: {new Date(activeSession.updatedAt).toLocaleDateString()}</>
            )}
          </div>
        )}
      </div>

      {/* セッション継承 */}
      {activeTab && tabs.length > 1 && (
        <div className={styles.sessionSelector}>
          <label htmlFor={inheritSelectId}>他のタブからセッションを継承:</label>
          <div className={styles.sessionSelectWrapper}>
            <select
              id={inheritSelectId}
              value={selectedTabForInherit}
              onChange={(e) => setSelectedTabForInherit(e.target.value)}
              className={styles.sessionSelect}
            >
              <option value="">継承元のタブを選択</option>
              {tabs
                .filter((tab) => tab.id !== activeTab.id && tab.sessionId)
                .map((tab) => {
                  const session = sessions.find((s) => s.id === tab.sessionId)
                  return (
                    <option key={tab.id} value={tab.id}>
                      {tab.title} ({session?.name || 'セッション名不明'})
                    </option>
                  )
                })}
            </select>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.primary}`}
              onClick={handleInheritSession}
              disabled={!selectedTabForInherit}
            >
              継承
            </button>
          </div>
        </div>
      )}

      {/* 共有変数 */}
      {sharedVariables.length > 0 && (
        <div>
          <h4 className={styles.sessionTitle}>共有変数</h4>
          <div className={styles.variableList}>
            {sharedVariables.map((variable) => (
              <div
                key={variable.id}
                className={`${styles.variableItem} ${!variable.enabled ? styles.disabled : ''}`}
              >
                <span className={styles.variableKey}>{`{{${variable.key}}}`}</span>
                <span className={styles.variableValue}>{variable.value}</span>
                <span className={styles.variableSource}>共有</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* セッション変数 */}
      {activeSession && (
        <div>
          <h4 className={styles.sessionTitle}>セッション変数</h4>
          {activeSession.variables.length > 0 ? (
            <div className={styles.variableList}>
              {activeSession.variables.map((variable) => (
                <div
                  key={variable.id}
                  className={`${styles.variableItem} ${!variable.enabled ? styles.disabled : ''}`}
                >
                  <span className={styles.variableKey}>{`{{${variable.key}}}`}</span>
                  <span className={styles.variableValue}>{variable.value}</span>
                  <span className={styles.variableSource}>
                    {variable.source === 'response'
                      ? 'レスポンス'
                      : variable.source === 'script'
                        ? 'スクリプト'
                        : '手動'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>このセッションには変数がありません</div>
          )}
        </div>
      )}

      {/* セッション固有のクッキー */}
      {activeSession && activeSession.cookies.length > 0 && (
        <div>
          <h4 className={styles.sessionTitle}>セッションクッキー</h4>
          <div className={styles.variableList}>
            {activeSession.cookies.map((cookie) => (
              <div
                key={cookie.id}
                className={`${styles.variableItem} ${!cookie.enabled ? styles.disabled : ''}`}
              >
                <span className={styles.variableKey}>{cookie.name}</span>
                <span className={styles.variableValue}>{cookie.value}</span>
                <span className={styles.variableSource}>{cookie.domain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
