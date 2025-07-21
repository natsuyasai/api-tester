import { JSX, useState } from 'react'
import { RequestExecutionHistory, HttpMethod } from '@/types/types'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { formatResponseTime, getStatusColor } from '@renderer/utils/responseUtils'
import styles from './ExecutionHistory.module.scss'

interface ExecutionHistoryProps {
  isVisible: boolean
  onToggle: () => void
}

export const ExecutionHistory = ({ isVisible, onToggle }: ExecutionHistoryProps): JSX.Element => {
  const {
    searchQuery,
    filterOptions,
    getFilteredHistory,
    setSearchQuery,
    setFilterOptions,
    clearFilters,
    clearExecutionHistory
  } = useCollectionStore()

  const [showFilters, setShowFilters] = useState(false)
  const filteredHistory = getFilteredHistory()

  const handleMethodFilterChange = (method: HttpMethod, checked: boolean) => {
    const currentMethods = filterOptions.method || []
    const newMethods = checked
      ? [...currentMethods, method]
      : currentMethods.filter((m) => m !== method)

    setFilterOptions({
      method: newMethods.length > 0 ? newMethods : undefined
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP')
  }

  const handleClearHistory = () => {
    if (confirm('実行履歴をすべて削除しますか？この操作は取り消せません。')) {
      clearExecutionHistory()
    }
  }

  const renderHistoryItem = (history: RequestExecutionHistory): JSX.Element => (
    <div key={history.id} className={styles.historyItem}>
      <div className={styles.historyHeader}>
        <div className={styles.requestInfo}>
          <span className={`${styles.method} ${styles[history.request.method.toLowerCase()]}`}>
            {history.request.method}
          </span>
          <span className={styles.url}>{history.request.url}</span>
        </div>
        <div className={styles.statusInfo}>
          <span className={`${styles.status} ${styles[getStatusColor(history.response.status)]}`}>
            {history.response.status}
          </span>
          <span className={styles.duration}>{formatResponseTime(history.duration)}</span>
        </div>
      </div>

      <div className={styles.historyDetails}>
        <div className={styles.requestName}>{history.request.name}</div>
        <div className={styles.timestamp}>{formatTimestamp(history.timestamp)}</div>
        {history.status === 'error' && history.errorMessage && (
          <div className={styles.errorMessage}>{history.errorMessage}</div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`${styles.executionHistory} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.header}>
        <h3>実行履歴</h3>
        <button onClick={onToggle} className={styles.toggleButton} type="button">
          {isVisible ? '▼' : '▲'}
        </button>
      </div>

      {isVisible && (
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
                type="button"
              >
                フィルタ
              </button>
            </div>

            <div className={styles.actions}>
              <button onClick={clearFilters} className={styles.clearFiltersButton} type="button">
                フィルタクリア
              </button>
              <button
                onClick={handleClearHistory}
                className={styles.clearHistoryButton}
                type="button"
              >
                履歴削除
              </button>
            </div>
          </div>

          {showFilters && (
            <div className={styles.filterPanel}>
              <div className={styles.filterGroup}>
                <div className={styles.filterLabel}>ステータス</div>
                <div className={styles.filterOptions}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="status"
                      checked={!filterOptions.status}
                      onChange={() => setFilterOptions({ status: undefined })}
                    />
                    すべて
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="status"
                      checked={filterOptions.status === 'success'}
                      onChange={() => setFilterOptions({ status: 'success' })}
                    />
                    成功
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="status"
                      checked={filterOptions.status === 'error'}
                      onChange={() => setFilterOptions({ status: 'error' })}
                    />
                    エラー
                  </label>
                </div>
              </div>

              <div className={styles.filterGroup}>
                <div className={styles.filterLabel}>HTTPメソッド</div>
                <div className={styles.filterOptions}>
                  {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map((method) => (
                    <label key={method} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filterOptions.method?.includes(method) ?? false}
                        onChange={(e) => handleMethodFilterChange(method, e.target.checked)}
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={styles.historyList}>
            {filteredHistory.length > 0 ? (
              filteredHistory.map(renderHistoryItem)
            ) : (
              <div className={styles.emptyState}>
                {searchQuery || Object.keys(filterOptions).length > 0 ? (
                  <p>検索条件に一致する履歴がありません</p>
                ) : (
                  <>
                    <p>実行履歴がありません</p>
                    <p>リクエストを実行すると履歴がここに表示されます</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
