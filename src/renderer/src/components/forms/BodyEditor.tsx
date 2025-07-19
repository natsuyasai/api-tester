import { JSX, useState } from 'react'
import { BodyType, KeyValuePair } from '@/types/types'
import { GraphQLVariablesEditor } from './GraphQLVariablesEditor'
import { FormDataEditor } from './FormDataEditor'
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
  const [formData, setFormData] = useState<KeyValuePair[]>([])

  // bodyをform-dataとして解析する関数
  const parseFormData = (bodyString: string): KeyValuePair[] => {
    if (!bodyString.trim()) return []
    
    try {
      const lines = bodyString.split('\n')
      return lines
        .map(line => {
          const [key, ...valueParts] = line.split('=')
          if (key && key.trim()) {
            return {
              key: key.trim(),
              value: valueParts.join('=').trim(),
              enabled: true
            }
          }
          return null
        })
        .filter((item): item is KeyValuePair => item !== null)
    } catch {
      return []
    }
  }

  // form-dataをbodyStringに変換する関数
  const serializeFormData = (data: KeyValuePair[]): string => {
    return data
      .filter(item => item.key.trim() !== '' && item.enabled)
      .map(item => `${item.key}=${item.value}`)
      .join('\n')
  }

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
          <FormDataEditor
            data={parseFormData(body)}
            onChange={(data) => {
              setFormData(data)
              onBodyChange(serializeFormData(data))
            }}
            placeholder={{
              key: bodyType === 'form-data' ? 'Enter field name' : 'Enter parameter name',
              value: bodyType === 'form-data' ? 'Enter field value' : 'Enter parameter value'
            }}
          />
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