import { JSX, useState } from 'react'
import { BodyType } from '@/types/types'
import styles from './BodyEditor.module.scss'

interface BodyEditorProps {
  tabId: string
  body: string
  bodyType: BodyType
  onBodyChange: (body: string) => void
  onBodyTypeChange: (bodyType: BodyType) => void
}

export const BodyEditor = ({ 
  body, 
  bodyType, 
  onBodyChange, 
  onBodyTypeChange 
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
        ) : (
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={
              bodyType === 'graphql' 
                ? 'Enter GraphQL query...\n\nquery {\n  users {\n    id\n    name\n  }\n}'
                : bodyType === 'json'
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