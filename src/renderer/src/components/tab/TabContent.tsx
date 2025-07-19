import { JSX, useState, useEffect, useRef, useCallback } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import { RequestForm } from '../forms/RequestForm'
import { ResponseView } from '../response/ResponseView'
import styles from './TabContent.module.scss'

interface TabContentProps {
  className?: string
}

export const TabContent = ({ className }: TabContentProps): JSX.Element => {
  const { tabs, activeTabId } = useApiStore()
  const [requestHeight, setRequestHeight] = useState(400)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startHeightRef = useRef<number>(0)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  // マウスドラッグでリサイズ処理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = requestHeight

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const deltaY = e.clientY - startYRef.current
      const newHeight = startHeightRef.current + deltaY
      const containerHeight = containerRef.current.clientHeight
      
      // 最小200px、最大コンテナ高さ-200pxの制約
      const minHeight = 200
      const maxHeight = Math.max(minHeight, containerHeight - 200)
      const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight)
      
      setRequestHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [requestHeight])

  // ウィンドウリサイズ時の調整
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      
      const containerHeight = containerRef.current.clientHeight
      const maxHeight = Math.max(200, containerHeight - 200)
      
      if (requestHeight > maxHeight) {
        setRequestHeight(maxHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [requestHeight])

  if (!activeTab) {
    return <div className={styles.noTab}>No active tab</div>
  }

  const responseHeight = `calc(100% - ${requestHeight}px - 6px)` // 6px for resize handle

  return (
    <div 
      ref={containerRef}
      className={`${styles.tabContent} ${className || ''}`}
      style={{
        gridTemplateRows: `${requestHeight}px 6px 1fr`
      }}
    >
      <div className={styles.requestSection}>
        <RequestForm tabId={activeTab.id} />
      </div>
      
      <div 
        className={`${styles.resizeHandle} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
      />
      
      <div className={styles.responseSection}>
        <ResponseView tabId={activeTab.id} />
      </div>
    </div>
  )
}
