import { JSX, useState, useEffect } from 'react'
import { useAutoSave } from '@renderer/hooks/useAutoSave'
import styles from './AutoSaveStatus.module.scss'

export const AutoSaveStatus = (): JSX.Element => {
  const { isAutoSaveEnabled, getLastSaveTime, getTimeUntilNextSave } = useAutoSave()
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null)

  useEffect(() => {
    if (!isAutoSaveEnabled) {
      return
    }

    const updateStatus = () => {
      setLastSaveTime(getLastSaveTime())
      setTimeUntilNext(getTimeUntilNextSave())
    }

    // 初回更新
    updateStatus()

    // 1秒ごとに更新
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [isAutoSaveEnabled, getLastSaveTime, getTimeUntilNextSave])

  if (!isAutoSaveEnabled) {
    return <div className={styles.autoSaveStatus}>自動保存: 無効</div>
  }

  const formatLastSaveTime = (timestamp: number) => {
    const now = Date.now()
    const diff = Math.floor((now - timestamp) / 1000)
    
    if (diff < 60) {
      return `${diff}秒前に保存`
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60)
      return `${minutes}分前に保存`
    } else {
      return new Date(timestamp).toLocaleTimeString()
    }
  }

  const formatTimeUntilNext = (seconds: number) => {
    if (seconds <= 0) {
      return '保存中...'
    }
    return `${seconds}秒後に保存`
  }

  return (
    <div className={styles.autoSaveStatus}>
      <div className={styles.statusRow}>
        <span className={styles.label}>自動保存:</span>
        <span className={styles.status}>有効</span>
      </div>
      {lastSaveTime && (
        <div className={styles.statusRow}>
          <span className={styles.label}>最終保存:</span>
          <span className={styles.time}>{formatLastSaveTime(lastSaveTime)}</span>
        </div>
      )}
      {timeUntilNext !== null && (
        <div className={styles.statusRow}>
          <span className={styles.label}>次回保存:</span>
          <span className={styles.time}>{formatTimeUntilNext(timeUntilNext)}</span>
        </div>
      )}
    </div>
  )
}