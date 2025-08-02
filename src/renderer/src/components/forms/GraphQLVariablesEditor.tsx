import { JSX, useId, useState } from 'react'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { CodeTextarea } from '../common/CodeTextarea'
import styles from './GraphQLVariablesEditor.module.scss'

interface GraphQLVariablesEditorProps {
  variables: string
  onVariablesChange: (variables: string) => void
}

export const GraphQLVariablesEditor = ({
  variables,
  onVariablesChange
}: GraphQLVariablesEditorProps): JSX.Element => {
  const [error, setError] = useState<string | null>(null)
  const { settings: _settings } = useGlobalSettingsStore()

  const editorId = useId()

  const handleVariablesChange = (value: string) => {
    onVariablesChange(value)

    // JSONの妥当性をチェック
    if (value.trim()) {
      try {
        JSON.parse(value)
        setError(null)
      } catch {
        setError('Invalid JSON format')
      }
    } else {
      setError(null)
    }
  }

  const handleFormatVariables = () => {
    try {
      if (variables.trim()) {
        const parsed: unknown = JSON.parse(variables)
        const formatted = JSON.stringify(parsed, null, 2)
        onVariablesChange(formatted)
        setError(null)
      }
    } catch {
      setError('Cannot format invalid JSON')
    }
  }

  return (
    <div className={styles.variablesEditor}>
      <div className={styles.header}>
        <label htmlFor={editorId} className={styles.label}>
          Variables (JSON)
        </label>
        <button
          onClick={handleFormatVariables}
          className={styles.formatButton}
          type="button"
          disabled={!variables.trim()}
        >
          Format
        </button>
      </div>

      <div className={styles.editorContainer}>
        <CodeTextarea
          id={editorId}
          value={variables}
          onChange={handleVariablesChange}
          placeholder={`{\n  "limit": 10,\n  "offset": 0\n}`}
          className={`${styles.textarea} ${error ? styles.error : ''}`}
          spellCheck={false}
          showLineNumbers={true}
          language="json"
          highlightActiveLine={true}
        />
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    </div>
  )
}
