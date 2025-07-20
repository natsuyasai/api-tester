import { JSX, useState } from 'react'
import { useEnvironmentStore } from '@renderer/stores/environmentStore'
import styles from './EnvironmentEditor.module.scss'
import { KeyValueEditor } from './KeyValueEditor'

export const EnvironmentEditor = (): JSX.Element => {
  const {
    environments,
    activeEnvironmentId,
    addEnvironment,
    removeEnvironment,
    updateEnvironment,
    setActiveEnvironment
  } = useEnvironmentStore()

  const [newEnvironmentName, setNewEnvironmentName] = useState('')
  const [isAddingEnvironment, setIsAddingEnvironment] = useState(false)

  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId)

  const handleAddEnvironment = () => {
    if (newEnvironmentName.trim()) {
      addEnvironment(newEnvironmentName.trim())
      setNewEnvironmentName('')
      setIsAddingEnvironment(false)
    }
  }

  const handleEnvironmentNameChange = (environmentId: string, name: string) => {
    updateEnvironment(environmentId, { name })
  }

  const handleDeleteEnvironment = (environmentId: string) => {
    if (environments.length > 1) {
      removeEnvironment(environmentId)
    }
  }

  return (
    <div className={styles.environmentEditor}>
      <div className={styles.header}>
        <h3>環境設定</h3>
        <p className={styles.description}>
          環境ごとに変数を管理し、リクエストで<code>{'{{変数名}}'}</code>
          として使用できます。
        </p>
      </div>

      <div className={styles.environmentSelector}>
        <div className={styles.selectorGroup}>
          <label htmlFor="environment-select">アクティブ環境:</label>
          <select
            id="environment-select"
            value={activeEnvironmentId || ''}
            onChange={(e) => setActiveEnvironment(e.target.value || null)}
            className={styles.select}
          >
            <option value="">環境を選択...</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.environmentActions}>
          {!isAddingEnvironment ? (
            <button
              onClick={() => setIsAddingEnvironment(true)}
              className={styles.addButton}
              type="button"
            >
              + 環境を追加
            </button>
          ) : (
            <div className={styles.addEnvironmentForm}>
              <input
                type="text"
                value={newEnvironmentName}
                onChange={(e) => setNewEnvironmentName(e.target.value)}
                placeholder="環境名を入力"
                className={styles.input}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddEnvironment()
                  } else if (e.key === 'Escape') {
                    setIsAddingEnvironment(false)
                    setNewEnvironmentName('')
                  }
                }}
              />
              <button onClick={handleAddEnvironment} className={styles.saveButton} type="button">
                保存
              </button>
              <button
                onClick={() => {
                  setIsAddingEnvironment(false)
                  setNewEnvironmentName('')
                }}
                className={styles.cancelButton}
                type="button"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>

      {activeEnvironment && (
        <div className={styles.environmentDetails}>
          <div className={styles.environmentHeader}>
            <div className={styles.environmentName}>
              <label htmlFor="env-name">環境名:</label>
              <input
                id="env-name"
                type="text"
                value={activeEnvironment.name}
                onChange={(e) => handleEnvironmentNameChange(activeEnvironment.id, e.target.value)}
                className={styles.input}
              />
            </div>
            <button
              onClick={() => handleDeleteEnvironment(activeEnvironment.id)}
              disabled={environments.length <= 1}
              className={styles.deleteButton}
              type="button"
              title={environments.length <= 1 ? '最後の環境は削除できません' : '環境を削除'}
            >
              削除
            </button>
          </div>

          <div className={styles.variablesSection}>
            <h4>環境変数</h4>
            <KeyValueEditor
              tabId={activeEnvironment.id}
              type="environment"
              items={activeEnvironment.variables}
            />
          </div>
        </div>
      )}

      {!activeEnvironment && activeEnvironmentId && (
        <div className={styles.noEnvironment}>
          <p>選択された環境が見つかりません。</p>
        </div>
      )}
    </div>
  )
}