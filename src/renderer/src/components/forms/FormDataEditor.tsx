import { JSX, useState, useRef } from 'react'
import { KeyValuePair, FileEncoding } from '@/types/types'
import { CodeTextarea } from '../common/CodeTextarea'
import styles from './FormDataEditor.module.scss'

interface FormDataEditorProps {
  data: KeyValuePair[]
  onChange: (data: KeyValuePair[]) => void
  placeholder?: {
    key: string
    value: string
  }
}

export const FormDataEditor = ({
  data,
  onChange,
  placeholder = { key: 'Enter key', value: 'Enter value' }
}: FormDataEditorProps): JSX.Element => {
  const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table')
  const [bulkText, setBulkText] = useState('')
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  // テーブルデータを確実に空行を含む状態に保つ
  const tableData =
    data.length === 0 || data[data.length - 1].key !== ''
      ? [...data, { key: '', value: '', enabled: false }]
      : data

  const handleItemChange = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newData = [...tableData]
    const currentItem = newData[index]

    // キーまたは値に入力があった場合、自動的にチェックボックスを有効にする
    if (
      (field === 'key' || field === 'value') &&
      typeof value === 'string' &&
      value.trim() !== '' &&
      !currentItem.enabled
    ) {
      newData[index] = { ...currentItem, [field]: value, enabled: true }
    } else {
      newData[index] = { ...currentItem, [field]: value }
    }

    // 最後の行に入力があった場合、新しい空行を追加
    if (index === newData.length - 1 && field === 'key' && value !== '') {
      newData.push({ key: '', value: '', enabled: false })
    }

    // 空でない行のみを返す（最後の空行は除く）
    const filteredData = newData.filter((item, idx) =>
      idx === newData.length - 1 ? false : item.key !== '' || item.value !== ''
    )

    onChange(filteredData)
  }

  const handleRemoveItem = (index: number) => {
    const newData = tableData.filter((_, idx) => idx !== index)
    onChange(newData.slice(0, -1)) // 最後の空行を除く
  }

  const handleBulkTextChange = (text: string) => {
    setBulkText(text)

    // バルクテキストをパースしてテーブルデータに変換
    const lines = text.trim().split('\n')
    const newData: KeyValuePair[] = []

    for (const line of lines) {
      if (line.trim()) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':').trim()
        if (key && key.trim()) {
          newData.push({
            key: key.trim(),
            value: value || '',
            enabled: true
          })
        }
      }
    }

    onChange(newData)
  }

  const handleTableToBulk = () => {
    const bulkText = data
      .filter((item) => item.key.trim() !== '')
      .map((item) => `${item.key}: ${item.value}`)
      .join('\n')
    setBulkText(bulkText)
    setViewMode('bulk')
  }

  const handleBulkToTable = () => {
    setViewMode('table')
  }

  const handleFileSelect = async (index: number, file: File) => {
    const newData = [...tableData]
    const currentItem = newData[index]

    try {
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます（10MB以下にしてください）')
        return
      }

      // ファイル内容をbase64で読み込み
      const fileContent = await readFileAsBase64(file)

      // ファイル情報を設定
      newData[index] = {
        ...currentItem,
        value: file.name, // 値にファイル名を表示
        isFile: true,
        fileName: file.name,
        fileContent: fileContent,
        fileEncoding: 'base64' as FileEncoding,
        enabled: true
      }

      // 最後の行に入力があった場合、新しい空行を追加
      if (index === newData.length - 1) {
        newData.push({ key: '', value: '', enabled: false })
      }

      // 空でない行のみを返す（最後の空行は除く）
      const filteredData = newData.filter((item, idx) =>
        idx === newData.length - 1 ? false : item.key !== '' || item.value !== '' || item.isFile
      )

      onChange(filteredData)
    } catch (error) {
      console.error('ファイル読み込みエラー:', error)
      alert('ファイルの読み込みに失敗しました')
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // data:base64,の部分を除去してbase64文字列のみを取得
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleToggleFileMode = (index: number) => {
    const newData = [...tableData]
    const currentItem = newData[index]

    if (currentItem.isFile) {
      // ファイルモードを解除
      newData[index] = {
        ...currentItem,
        isFile: false,
        fileName: undefined,
        fileContent: undefined,
        fileEncoding: undefined,
        value: ''
      }
    } else {
      // ファイルモードに切り替え
      newData[index] = {
        ...currentItem,
        isFile: true,
        value: currentItem.fileName || ''
      }

      // ファイル選択ダイアログを開く
      setTimeout(() => {
        fileInputRefs.current[index]?.click()
      }, 0)
    }

    // 空でない行のみを返す（最後の空行は除く）
    const filteredData = newData.filter((item, idx) =>
      idx === newData.length - 1 ? false : item.key !== '' || item.value !== '' || item.isFile
    )

    onChange(filteredData)
  }

  return (
    <div className={styles.formDataEditor}>
      <div className={styles.header}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'table' ? styles.active : ''}`}
            onClick={() => setViewMode('table')}
            type="button"
          >
            Table
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'bulk' ? styles.active : ''}`}
            onClick={handleTableToBulk}
            type="button"
          >
            Bulk Edit
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.enabledColumn}>
              <input
                type="checkbox"
                checked={data.every((item) => item.enabled)}
                onChange={(e) => {
                  const enabled = e.target.checked
                  onChange(data.map((item) => ({ ...item, enabled })))
                }}
                aria-label="Toggle all"
              />
            </div>
            <div className={styles.keyColumn}>Key</div>
            <div className={styles.valueColumn}>Value</div>
            <div className={styles.typeColumn}>Type</div>
            <div className={styles.actionsColumn}>Actions</div>
          </div>

          <div className={styles.tableBody}>
            {tableData.map((item, index) => (
              <div key={index} className={styles.tableRow}>
                <div className={styles.enabledColumn}>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => handleItemChange(index, 'enabled', e.target.checked)}
                    aria-label={`Enable ${item.key || 'row'}`}
                  />
                </div>
                <div className={styles.keyColumn}>
                  <input
                    type="text"
                    value={item.key}
                    onChange={(e) => handleItemChange(index, 'key', e.target.value)}
                    placeholder={placeholder.key}
                    className={styles.input}
                  />
                </div>
                <div className={styles.valueColumn}>
                  {item.isFile ? (
                    <div className={styles.fileInput}>
                      <span className={styles.fileName}>{item.fileName || 'ファイルを選択'}</span>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[index] = el
                        }}
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            void handleFileSelect(index, file)
                          }
                        }}
                        className={styles.hiddenFileInput}
                        accept="*/*"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        className={styles.fileSelectButton}
                      >
                        選択
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                      placeholder={placeholder.value}
                      className={styles.input}
                    />
                  )}
                </div>
                <div className={styles.typeColumn}>
                  <button
                    type="button"
                    onClick={() => handleToggleFileMode(index)}
                    className={`${styles.typeButton} ${item.isFile ? styles.fileType : styles.textType}`}
                    title={item.isFile ? 'ファイルモード' : 'テキストモード'}
                  >
                    {item.isFile ? '📎' : 'T'}
                  </button>
                </div>
                <div className={styles.actionsColumn}>
                  {index < tableData.length - 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className={styles.removeButton}
                      type="button"
                      aria-label={`Remove ${item.key || 'row'}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.bulkContainer}>
          <div className={styles.bulkHeader}>
            <span className={styles.bulkInfo}>
              Enter one key-value pair per line in the format: key: value
            </span>
            <button onClick={handleBulkToTable} className={styles.doneButton} type="button">
              Done
            </button>
          </div>
          <CodeTextarea
            value={bulkText}
            onChange={handleBulkTextChange}
            placeholder="key1: value1&#10;key2: value2&#10;key3: value3"
            className={styles.bulkTextarea}
            spellCheck={false}
            language="plain"
          />
        </div>
      )}
    </div>
  )
}
