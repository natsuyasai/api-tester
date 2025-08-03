import { useEffect } from 'react'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'

interface UseKeyboardShortcutsProps {
  onEditActiveTab?: () => void
  onToggleCollections?: () => void
}

export const useKeyboardShortcuts = (props?: UseKeyboardShortcutsProps) => {
  const { addTab, switchToNextTab, switchToPreviousTab, closeActiveTab } = useTabStore()
  const { activeCollectionId } = useCollectionStore()
  const { onEditActiveTab, onToggleCollections } = props || {}

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 't':
            event.preventDefault()
            addTab(activeCollectionId)
            break
          case 'w':
            event.preventDefault()
            closeActiveTab()
            break
          case 'Tab':
            event.preventDefault()
            if (event.shiftKey) {
              switchToPreviousTab()
            } else {
              switchToNextTab()
            }
            break
          case 'b':
            event.preventDefault()
            if (onToggleCollections) {
              onToggleCollections()
            } else {
              // コールバックが指定されていない場合はカスタムイベントを発行
              const toggleEvent = new CustomEvent('toggle-collections')
              document.dispatchEvent(toggleEvent)
            }
            break
          default:
            break
        }
      } else if (event.key === 'F2') {
        event.preventDefault()
        if (onEditActiveTab) {
          onEditActiveTab()
        } else {
          const editEvent = new CustomEvent('edit-active-tab')
          document.dispatchEvent(editEvent)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    addTab,
    switchToNextTab,
    switchToPreviousTab,
    closeActiveTab,
    onEditActiveTab,
    onToggleCollections,
    activeCollectionId
  ])
}
