import { JSX, useRef } from 'react'
import { FileService } from '@/services/fileService'
import { KeyValuePair, FileEncoding } from '@/types/types'
import { useRequestStore } from '@renderer/stores/requestStore'
import styles from './KeyValueEditor.module.scss'

interface KeyValueEditorProps {
  tabId: string
  type: 'headers' | 'params' | 'body'
  items: KeyValuePair[]
}

export const KeyValueEditor = ({ tabId, type, items }: KeyValueEditorProps): JSX.Element => {
  const {
    addHeader,
    updateHeader,
    removeHeader,
    addParam,
    updateParam,
    removeParam,
    addBodyKeyValue,
    updateBodyKeyValue,
    removeBodyKeyValue
  } = useRequestStore()
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  const handleAdd = () => {
    if (type === 'headers') {
      addHeader(tabId)
    } else if (type === 'params') {
      addParam(tabId)
    } else {
      addBodyKeyValue(tabId)
    }
  }

  const handleUpdate = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const update = { [field]: value }
    if (type === 'headers') {
      updateHeader(tabId, index, update)
    } else if (type === 'params') {
      updateParam(tabId, index, update)
    } else {
      updateBodyKeyValue(tabId, index, update)
    }
  }

  const handleRemove = (index: number) => {
    if (type === 'headers') {
      removeHeader(tabId, index)
    } else if (type === 'params') {
      removeParam(tabId, index)
    } else {
      removeBodyKeyValue(tabId, index)
    }
  }

  const handleFileSelect = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const currentItem = items[index]
    const encoding: FileEncoding = currentItem.fileEncoding || 'base64'

    try {
      const fileContent = await FileService.processFile(file, encoding)

      const updates = {
        isFile: true,
        fileName: file.name,
        fileContent,
        value: encoding === 'base64' ? `[File: ${file.name}]` : fileContent
      }

      if (type === 'headers') {
        updateHeader(tabId, index, updates)
      } else if (type === 'params') {
        updateParam(tabId, index, updates)
      } else {
        updateBodyKeyValue(tabId, index, updates)
      }
    } catch (error) {
      console.error('ファイル処理エラー:', error)
      alert('ファイルの処理中にエラーが発生しました。')
    }
  }

  const handleFileEncodingChange = async (index: number, encoding: FileEncoding) => {
    const currentItem = items[index]

    // エンコーディング方式を更新
    const updates = { fileEncoding: encoding }

    if (type === 'headers') {
      updateHeader(tabId, index, updates)
    } else if (type === 'params') {
      updateParam(tabId, index, updates)
    } else {
      updateBodyKeyValue(tabId, index, updates)
    }

    // ファイルが既に選択されている場合は再処理
    if (currentItem.isFile && currentItem.fileName && fileInputRefs.current[index]?.files?.[0]) {
      const file = fileInputRefs.current[index].files[0]
      try {
        const fileContent = await FileService.processFile(file, encoding)
        const valueUpdates = {
          fileContent,
          value: encoding === 'base64' ? `[File: ${file.name}]` : fileContent
        }

        if (type === 'headers') {
          updateHeader(tabId, index, valueUpdates)
        } else {
          updateParam(tabId, index, valueUpdates)
        }
      } catch (error) {
        console.error('ファイル再処理エラー:', error)
      }
    }
  }

  const handleClearFile = (index: number) => {
    const updates = {
      isFile: false,
      fileName: undefined,
      fileContent: undefined,
      value: ''
    }

    if (type === 'headers') {
      updateHeader(tabId, index, updates)
    } else if (type === 'params') {
      updateParam(tabId, index, updates)
    } else {
      updateBodyKeyValue(tabId, index, updates)
    }

    // ファイル入力をクリア
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = ''
    }
  }

  return (
    <div className={styles.keyValueEditor}>
      <div className={styles.header}>
        <div className={styles.column}>Key</div>
        <div className={styles.column}>Value</div>
        <div className={styles.actions}>Actions</div>
      </div>

      <div className={styles.rows}>
        {items.map((item, index) => (
          <div key={index} className={styles.row}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => handleUpdate(index, 'enabled', e.target.checked)}
                className={styles.checkbox}
              />
            </div>
            <input
              type="text"
              value={item.key}
              onChange={(e) => handleUpdate(index, 'key', e.target.value)}
              placeholder="Key"
              className={styles.input}
              disabled={!item.enabled}
            />

            <div className={styles.valueContainer}>
              {item.isFile ? (
                <div className={styles.fileValue}>
                  <span className={styles.fileName}>📎 {item.fileName}</span>
                  <div className={styles.fileControls}>
                    <select
                      value={item.fileEncoding || 'base64'}
                      onChange={(e) => {
                        void handleFileEncodingChange(index, e.target.value as FileEncoding)
                      }}
                      className={styles.encodingSelect}
                      disabled={!item.enabled}
                    >
                      <option value="base64">Base64</option>
                      <option value="binary">Binary</option>
                    </select>
                    <button
                      onClick={() => handleClearFile(index)}
                      className={styles.clearFileButton}
                      type="button"
                      disabled={!item.enabled}
                      title="ファイルをクリア"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.valueInputContainer}>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                    placeholder="Value"
                    className={styles.input}
                    disabled={!item.enabled}
                  />
                  <input
                    ref={(el) => {
                      fileInputRefs.current[index] = el
                    }}
                    type="file"
                    onChange={(e) => {
                      void handleFileSelect(index, e.target.files)
                    }}
                    className={styles.fileInput}
                    disabled={!item.enabled}
                    title="ファイルを選択"
                  />
                  <button
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className={styles.fileButton}
                    type="button"
                    disabled={!item.enabled}
                    title="ファイルを選択"
                  >
                    📁
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleRemove(index)}
              className={styles.removeButton}
              aria-label="Remove item"
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} className={styles.addButton} type="button">
        Add {type === 'headers' ? 'Header' : type === 'params' ? 'Parameter' : 'Field'}
      </button>
    </div>
  )
}
