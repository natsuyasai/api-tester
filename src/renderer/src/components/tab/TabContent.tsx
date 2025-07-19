import { JSX, useState, useEffect, useRef } from 'react'
import { Rnd } from 'react-rnd'
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
  const [containerHeight, setContainerHeight] = useState(800)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  // コンテナの高さを監視してmaxHeightを動的に設定
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight
        setContainerHeight(height)
        
        // リクエストセクションの高さがコンテナより大きくなりすぎないように調整
        if (requestHeight > height - 200) {
          setRequestHeight(Math.max(200, height - 200))
        }
      }
    }

    updateContainerHeight()
    window.addEventListener('resize', updateContainerHeight)
    
    return () => {
      window.removeEventListener('resize', updateContainerHeight)
    }
  }, [requestHeight])

  if (!activeTab) {
    return <div className={styles.noTab}>No active tab</div>
  }

  const maxRequestHeight = Math.max(200, containerHeight - 200)

  return (
    <div 
      ref={containerRef}
      className={`${styles.tabContent} ${className || ''}`}
    >
      <Rnd
        size={{ width: '100%', height: requestHeight }}
        position={{ x: 0, y: 0 }}
        onResizeStop={(e, direction, ref, delta, position) => {
          const newHeight = parseInt(ref.style.height, 10)
          setRequestHeight(Math.min(newHeight, maxRequestHeight))
        }}
        enableResizing={{
          top: false,
          right: false,
          bottom: true,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false
        }}
        disableDragging={true}
        minHeight={200}
        maxHeight={maxRequestHeight}
        className={styles.requestSection}
        resizeHandleStyles={{
          bottom: {
            height: '6px',
            bottom: '-3px',
            background: 'transparent',
            cursor: 'row-resize'
          }
        }}
        resizeHandleClasses={{
          bottom: styles.resizeHandle
        }}
      >
        <RequestForm tabId={activeTab.id} />
      </Rnd>
      <div 
        className={styles.responseSection}
        style={{ height: `calc(100% - ${requestHeight}px)` }}
      >
        <ResponseView tabId={activeTab.id} />
      </div>
    </div>
  )
}
