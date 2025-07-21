import { JSX, useId, useState } from 'react'
import { BodyType, KeyValuePair } from '@/types/types'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { useRequestStore } from '@renderer/stores/requestStore'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './BodyEditor.module.scss'
import { FormDataEditor } from './FormDataEditor'
import { GraphQLVariablesEditor } from './GraphQLVariablesEditor'
import { KeyValueEditor } from './KeyValueEditor'

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
  tabId,
  body,
  bodyType,
  variables = {},
  onBodyChange,
  onBodyTypeChange,
  onVariablesChange
}: BodyEditorProps): JSX.Element => {
  const [inputMode, setInputMode] = useState<'text' | 'keyvalue'>('text')
  const queryTextareaId = useId()

  const { getTab } = useTabStore()
  const { addBodyKeyValue, updateBodyKeyValue, removeBodyKeyValue } = useRequestStore()
  const { settings } = useGlobalSettingsStore()

  const tab = getTab(tabId)
  const bodyKeyValuePairs = tab?.request.bodyKeyValuePairs || []

  // bodyをform-dataとして解析する関数
  const parseFormData = (bodyString: string): KeyValuePair[] => {
    if (!bodyString.trim()) return []

    try {
      const lines = bodyString.split('\n')
      return lines
        .map((line) => {
          const [key, ...valueParts] = line.split('=')
          if (key && key.trim()) {
            return {
              key: key.trim(),
              value: valueParts.join('=').trim(),
              enabled: false
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
      .filter((item) => item.key.trim() !== '' && item.enabled)
      .map((item) => `${item.key}=${item.value}`)
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

  // KeyValue方式からテキストへの変換
  const convertKeyValueToText = (keyValuePairs: KeyValuePair[]): string => {
    if (bodyType === 'json') {
      // JSONとして変換
      const obj: Record<string, unknown> = {}
      keyValuePairs
        .filter((pair) => pair.enabled && pair.key.trim())
        .forEach((pair) => {
          try {
            // 値がJSONとして解析可能かチェック
            obj[pair.key] = JSON.parse(pair.value)
          } catch {
            // 文字列として扱う
            obj[pair.key] = pair.value
          }
        })
      return JSON.stringify(obj, null, 2)
    } else {
      // その他の形式は key=value 形式
      return keyValuePairs
        .filter((pair) => pair.enabled && pair.key.trim())
        .map((pair) => `${pair.key}=${pair.value}`)
        .join('\n')
    }
  }

  // テキストからKeyValue方式への変換
  const convertTextToKeyValue = (text: string): KeyValuePair[] => {
    if (!text.trim()) return [{ key: '', value: '', enabled: false }]

    if (bodyType === 'json') {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>
        const pairs = Object.entries(parsed).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          enabled: true
        }))
        return pairs.length > 0
          ? [...pairs, { key: '', value: '', enabled: false }]
          : [{ key: '', value: '', enabled: false }]
      } catch {
        // JSONとして解析できない場合は空のペアを返す
        return [{ key: '', value: '', enabled: false }]
      }
    } else {
      // key=value形式として解析
      const lines = text.split('\n')
      const pairs = lines
        .map((line) => {
          const [key, ...valueParts] = line.split('=')
          if (key && key.trim()) {
            return {
              key: key.trim(),
              value: valueParts.join('=').trim(),
              enabled: false
            }
          }
          return null
        })
        .filter((item): item is KeyValuePair => item !== null)

      return pairs.length > 0
        ? [...pairs, { key: '', value: '', enabled: false }]
        : [{ key: '', value: '', enabled: false }]
    }
  }

  // 入力モード切り替え時の処理
  const handleInputModeChange = (newMode: 'text' | 'keyvalue') => {
    if (newMode === 'keyvalue' && inputMode === 'text') {
      // テキストからKeyValueに切り替え：現在のbodyテキストをKeyValueに変換
      const convertedPairs = convertTextToKeyValue(body)
      convertedPairs.forEach((pair, index) => {
        if (index < bodyKeyValuePairs.length) {
          updateBodyKeyValue(tabId, index, pair)
        } else {
          addBodyKeyValue(tabId)
          updateBodyKeyValue(tabId, bodyKeyValuePairs.length, pair)
        }
      })
      // 余分なペアを削除
      if (convertedPairs.length < bodyKeyValuePairs.length) {
        for (let i = bodyKeyValuePairs.length - 1; i >= convertedPairs.length; i--) {
          removeBodyKeyValue(tabId, i)
        }
      }
    } else if (newMode === 'text' && inputMode === 'keyvalue') {
      // KeyValueからテキストに切り替え：KeyValueをテキストに変換
      const convertedText = convertKeyValueToText(bodyKeyValuePairs)
      onBodyChange(convertedText)
    }
    setInputMode(newMode)
  }

  const isJsonBodyType = bodyType === 'json' || bodyType === 'graphql'
  const canUseKeyValueMode = bodyType === 'json'
  const isFormBodyType = bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded'

  // form-data/urlencoded用のハンドラー
  const handleFormDataChange = (data: KeyValuePair[]) => {
    // storeの状態を更新
    data.forEach((pair, index) => {
      if (index < bodyKeyValuePairs.length) {
        updateBodyKeyValue(tabId, index, pair)
      } else {
        addBodyKeyValue(tabId)
        updateBodyKeyValue(tabId, bodyKeyValuePairs.length, pair)
      }
    })

    // 余分なペアを削除
    if (data.length < bodyKeyValuePairs.length) {
      for (let i = bodyKeyValuePairs.length - 1; i >= data.length; i--) {
        removeBodyKeyValue(tabId, i)
      }
    }

    // bodyテキストも更新
    const serializedData = serializeFormData(data)
    onBodyChange(serializedData)
  }

  // bodyTypeが変更された時の処理
  const handleBodyTypeChange = (newBodyType: BodyType) => {
    onBodyTypeChange(newBodyType)

    // form-data/urlencoded への切り替え時にbodyKeyValuePairsを初期化
    if (
      (newBodyType === 'form-data' || newBodyType === 'x-www-form-urlencoded') &&
      bodyKeyValuePairs.length === 0
    ) {
      const parsedData = parseFormData(body)
      if (parsedData.length > 0) {
        handleFormDataChange(parsedData)
      } else {
        // 空の場合は最初のペアを追加
        addBodyKeyValue(tabId)
      }
    }
  }

  return (
    <div className={styles.bodyEditor}>
      <div className={styles.header}>
        <select
          value={bodyType}
          onChange={(e) => handleBodyTypeChange(e.target.value as BodyType)}
          className={styles.bodyTypeSelect}
        >
          {bodyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {isJsonBodyType && inputMode === 'text' && (
          <div className={styles.jsonControls}>
            {bodyType === 'json' && (
              <button onClick={handleFormatJson} className={styles.formatButton} type="button">
                Format JSON
              </button>
            )}
          </div>
        )}
        <div className={styles.controls}>
          {canUseKeyValueMode && (
            <div className={styles.inputModeToggle}>
              <button
                onClick={() => handleInputModeChange('text')}
                className={`${styles.modeButton} ${inputMode === 'text' ? styles.active : ''}`}
                type="button"
              >
                Text
              </button>
              <button
                onClick={() => handleInputModeChange('keyvalue')}
                className={`${styles.modeButton} ${inputMode === 'keyvalue' ? styles.active : ''}`}
                type="button"
              >
                Key-Value
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.editorContainer}>
        {isFormBodyType ? (
          <FormDataEditor
            data={bodyKeyValuePairs}
            onChange={handleFormDataChange}
            placeholder={{
              key: bodyType === 'form-data' ? 'Enter field name' : 'Enter parameter name',
              value: bodyType === 'form-data' ? 'Enter field value' : 'Enter parameter value'
            }}
          />
        ) : bodyType === 'graphql' ? (
          <div className={styles.graphqlEditor}>
            <div className={styles.querySection}>
              <div className={styles.sectionHeader}>
                <label
                  htmlFor={`graphql-query-textarea-${queryTextareaId}`}
                  className={styles.sectionLabel}
                >
                  Query
                </label>
              </div>
              <textarea
                id={`graphql-query-textarea-${queryTextareaId}`}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="query {\n  users {\n    id\n    name\n    email\n  }\n}"
                className={styles.textarea}
                spellCheck={false}
                style={{
                  tabSize: settings.tabSize,
                  whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
                  lineHeight: settings.lineNumbers ? '1.5' : '1.4'
                }}
              />
            </div>
            <div className={styles.variablesSection}>
              {onVariablesChange && (
                <GraphQLVariablesEditor
                  variables={JSON.stringify(variables, null, 2)}
                  onVariablesChange={(variablesStr) => {
                    try {
                      const parsedVariables: Record<string, unknown> = variablesStr.trim()
                        ? (JSON.parse(variablesStr) as Record<string, unknown>)
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
        ) : canUseKeyValueMode && inputMode === 'keyvalue' ? (
          <div className={styles.keyValueContainer}>
            <KeyValueEditor tabId={tabId} type="body" items={bodyKeyValuePairs} />
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
            style={{
              tabSize: settings.tabSize,
              whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
              lineHeight: settings.lineNumbers ? '1.5' : '1.4'
            }}
          />
        )}
      </div>
    </div>
  )
}
