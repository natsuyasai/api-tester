import { JSX } from 'react'
import { PropertyInfo } from '@renderer/utils/propertyUtils'
import { isPreviewableProperty } from '@renderer/utils/responseUtils'
import styles from './ResponseView.module.scss'

interface PropertySelectorProps {
  properties: PropertyInfo[]
  selectedProperty: string
  showPropertyList: boolean
  onPropertyChange: (property: string) => void
  onTogglePropertyList: () => void
  onPropertySelect: (property: string) => void
  onClosePropertyList: () => void
}

export const PropertySelector = ({
  properties,
  selectedProperty,
  showPropertyList,
  onPropertyChange,
  onTogglePropertyList,
  onPropertySelect,
  onClosePropertyList
}: PropertySelectorProps): JSX.Element => {
  const previewableProperties = properties.filter(
    (prop) => isPreviewableProperty(prop.value) || prop.path === 'data'
  )

  return (
    <div className={styles.previewHeader}>
      <div className={styles.propertySelector}>
        <label htmlFor="property-select" className={styles.selectorLabel}>
          プレビュー対象:
        </label>
        <select
          id="property-select"
          className={styles.propertySelect}
          value={selectedProperty}
          onChange={(e) => onPropertyChange(e.target.value)}
        >
          {previewableProperties.map((prop) => (
            <option key={prop.path} value={prop.path}>
              {prop.path} ({prop.type})
            </option>
          ))}
        </select>
        <button
          className={styles.propertySelectorToggle}
          onClick={onTogglePropertyList}
          type="button"
          title="プロパティ一覧を表示"
        >
          {showPropertyList ? '📋 隠す' : '📋 一覧'}
        </button>
      </div>

      {showPropertyList && (
        <div className={styles.propertyList}>
          <h3>利用可能なプロパティ:</h3>
          <div className={styles.propertyGrid}>
            {properties.map((prop) => (
              <button
                key={prop.path}
                className={`${styles.propertyItem} ${
                  isPreviewableProperty(prop.value) ? styles.previewable : ''
                }`}
                onClick={() => {
                  onPropertySelect(prop.path)
                  onClosePropertyList()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onPropertySelect(prop.path)
                    onClosePropertyList()
                  }
                }}
                type="button"
              >
                <span className={styles.propertyPath}>{prop.path}</span>
                <span className={styles.propertyType}>{prop.type}</span>
                {isPreviewableProperty(prop.value) && (
                  <span className={styles.previewBadge}>📄</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
