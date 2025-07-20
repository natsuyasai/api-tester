import { JSX, useId, useState } from 'react'
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
        <textarea
          id={editorId}
          value={variables}
          onChange={(e) => handleVariablesChange(e.target.value)}
          placeholder={`{\n  "limit": 10,\n  "offset": 0\n}`}
          className={`${styles.textarea} ${error ? styles.error : ''}`}
          spellCheck={false}
        />
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    </div>
  )
}
