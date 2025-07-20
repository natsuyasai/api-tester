import { JSX } from 'react'
import { GlobalVariable } from '@/types/types'
import { useGlobalVariablesStore } from '@renderer/stores/globalVariablesStore'
import styles from './GlobalVariablesEditor.module.scss'

export const GlobalVariablesEditor = (): JSX.Element => {
  const { variables, addVariable, updateVariable, removeVariable } = useGlobalVariablesStore()

  const handleVariableChange = (
    id: string,
    field: keyof Omit<GlobalVariable, 'id'>,
    value: string | boolean
  ) => {
    updateVariable(id, { [field]: value })
  }

  const handleAddVariable = () => {
    addVariable()
  }

  const handleRemoveVariable = (id: string) => {
    removeVariable(id)
  }

  return (
    <div className={styles.globalVariablesEditor}>
      <div className={styles.header}>
        <h3>グローバル変数</h3>
        <p className={styles.description}>
          すべての環境で共通利用できる変数を管理します。
          <code>{'{{変数名}}'}</code>として使用できます。
        </p>
      </div>

      <div className={styles.variablesContainer}>
        <div className={styles.variablesHeader}>
          <div className={styles.columnHeader}>有効</div>
          <div className={styles.columnHeader}>変数名</div>
          <div className={styles.columnHeader}>値</div>
          <div className={styles.columnHeader}>説明</div>
          <div className={styles.columnHeader}>操作</div>
        </div>

        <div className={styles.variablesList}>
          {variables.map((variable) => (
            <div key={variable.id} className={styles.variableRow}>
              <div className={styles.enabledColumn}>
                <input
                  type="checkbox"
                  checked={variable.enabled}
                  onChange={(e) => handleVariableChange(variable.id, 'enabled', e.target.checked)}
                  className={styles.checkbox}
                />
              </div>

              <div className={styles.keyColumn}>
                <input
                  type="text"
                  value={variable.key}
                  onChange={(e) => {
                    handleVariableChange(variable.id, 'key', e.target.value)
                    // キーに入力があった場合、自動的にチェックボックスを有効にする
                    if (e.target.value.trim() && !variable.enabled) {
                      handleVariableChange(variable.id, 'enabled', true)
                    }
                  }}
                  placeholder="変数名"
                  className={styles.input}
                />
              </div>

              <div className={styles.valueColumn}>
                <input
                  type="text"
                  value={variable.value}
                  onChange={(e) => {
                    handleVariableChange(variable.id, 'value', e.target.value)
                    // 値に入力があった場合、自動的にチェックボックスを有効にする
                    if (e.target.value.trim() && !variable.enabled) {
                      handleVariableChange(variable.id, 'enabled', true)
                    }
                  }}
                  placeholder="値"
                  className={styles.input}
                />
              </div>

              <div className={styles.descriptionColumn}>
                <input
                  type="text"
                  value={variable.description || ''}
                  onChange={(e) => handleVariableChange(variable.id, 'description', e.target.value)}
                  placeholder="説明（任意）"
                  className={styles.input}
                />
              </div>

              <div className={styles.actionsColumn}>
                <button
                  onClick={() => handleRemoveVariable(variable.id)}
                  className={styles.removeButton}
                  type="button"
                  title="変数を削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.addVariableSection}>
          <button onClick={handleAddVariable} className={styles.addButton} type="button">
            + 変数を追加
          </button>
        </div>
      </div>

      <div className={styles.usageExamples}>
        <h4>使用例</h4>
        <div className={styles.examplesList}>
          <div className={styles.example}>
            <code>{'{{baseUrl}}/users'}</code>
            <span className={styles.arrow}>→</span>
            <span className={styles.result}>https://api.example.com/users</span>
          </div>
          <div className={styles.example}>
            <code>{'{{baseUrl}}/{{version}}/products'}</code>
            <span className={styles.arrow}>→</span>
            <span className={styles.result}>https://api.example.com/v1/products</span>
          </div>
          <div className={styles.example}>
            <code>{'Authorization: Bearer {{apiKey}}'}</code>
            <span className={styles.arrow}>→</span>
            <span className={styles.result}>Authorization: Bearer your-api-key-here</span>
          </div>
        </div>
      </div>
    </div>
  )
}
