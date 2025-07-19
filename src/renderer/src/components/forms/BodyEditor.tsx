import { JSX, useState } from 'react'
import { BodyType } from '@/types/types'
import { GraphQLVariablesEditor } from './GraphQLVariablesEditor'
import styles from './BodyEditor.module.scss'

interface BodyEditorProps {
  tabId: string
  body: string
  bodyType: BodyType
  variables?: Record<string, unknown>
  onBodyChange: (body: string) => void
  onBodyTypeChange: (bodyType: BodyType) => void
  onVariablesChange?: (variables: Record<string, unknown>) => void
}

export const BodyEditor = ({ 
  body, 
  bodyType, 
  variables = {},
  onBodyChange, 
  onBodyTypeChange,
  onVariablesChange
}: BodyEditorProps): JSX.Element => {
  const [inputMode, setInputMode] = useState<'raw' | 'json'>('json')

  const bodyTypes: { value: BodyType; label: string }[] = [
    { value: 'json', label: 'JSON' },
    { value: 'form-data', label: 'Form Data' },
    { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
    { value: 'raw', label: 'Raw' },
    { value: 'graphql', label: 'GraphQL' }
  ]

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(body) as unknown
      const formatted = JSON.stringify(parsed, null, 2)
      onBodyChange(formatted)
    } catch (error) {
      console.error('Invalid JSON:', error)
    }
  }

  const isJsonBodyType = bodyType === 'json' || bodyType === 'graphql'

  return (
    <div className={styles.bodyEditor}>
      <div className={styles.header}>
        <select
          value={bodyType}
          onChange={(e) => onBodyTypeChange(e.target.value as BodyType)}
          className={styles.bodyTypeSelect}
        >
          {bodyTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        
        {isJsonBodyType && (
          <div className={styles.controls}>
            <div className={styles.inputModeToggle}>
              <button
                className={`${styles.toggleButton} ${inputMode === 'json' ? styles.active : ''}`}
                onClick={() => setInputMode('json')}
                type="button"
              >
                JSON
              </button>
              <button
                className={`${styles.toggleButton} ${inputMode === 'raw' ? styles.active : ''}`}
                onClick={() => setInputMode('raw')}
                type="button"
              >
                Raw
              </button>
            </div>
            {bodyType === 'json' && (
              <button
                onClick={handleFormatJson}
                className={styles.formatButton}
                type="button"
              >
                Format
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.editorContainer}>
        {bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded' ? (
          <div className={styles.formDataEditor}>
            {/* TODO: Form data editor implementation */}
            <div className={styles.placeholder}>
              Form data editor will be implemented here
            </div>
          </div>
        ) : bodyType === 'graphql' ? (
          <div className={styles.graphqlEditor}>
            <div className={styles.querySection}>
              <div className={styles.sectionHeader}>
                <label className={styles.sectionLabel}>Query</label>
              </div>
              <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="query {\n  users {\n    id\n    name\n    email\n  }\n}"
                className={styles.textarea}
                spellCheck={false}
              />
            </div>
            <div className={styles.variablesSection}>
              {onVariablesChange && (
                <GraphQLVariablesEditor
                  variables={JSON.stringify(variables, null, 2)}
                  onVariablesChange={(variablesStr) => {
                    try {
                      const parsedVariables = variablesStr.trim() 
                        ? JSON.parse(variablesStr) 
                        : {}
                      onVariablesChange(parsedVariables)
                    } catch {
                      // 無効なJSONの場合は何もしない
                    }
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={
              bodyType === 'json'
                ? 'Enter JSON body...\n\n{\n  "key": "value"\n}'
                : 'Enter raw body...'
            }
            className={styles.textarea}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}