import { JSX } from 'react'
import { KeyValuePair } from '@/types/types'
import { useRequestStore } from '@renderer/stores/requestStore'
import styles from './KeyValueEditor.module.scss'

interface KeyValueEditorProps {
  tabId: string
  type: 'headers' | 'params'
  items: KeyValuePair[]
}

export const KeyValueEditor = ({ tabId, type, items }: KeyValueEditorProps): JSX.Element => {
  const { addHeader, updateHeader, removeHeader, addParam, updateParam, removeParam } =
    useRequestStore()

  const handleAdd = () => {
    if (type === 'headers') {
      addHeader(tabId)
    } else {
      addParam(tabId)
    }
  }

  const handleUpdate = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const update = { [field]: value }
    if (type === 'headers') {
      updateHeader(tabId, index, update)
    } else {
      updateParam(tabId, index, update)
    }
  }

  const handleRemove = (index: number) => {
    if (type === 'headers') {
      removeHeader(tabId, index)
    } else {
      removeParam(tabId, index)
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
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleUpdate(index, 'value', e.target.value)}
              placeholder="Value"
              className={styles.input}
              disabled={!item.enabled}
            />
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
        Add {type === 'headers' ? 'Header' : 'Parameter'}
      </button>
    </div>
  )
}
