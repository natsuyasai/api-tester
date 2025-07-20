import { useEffect } from 'react'
import { useTabStore } from '@renderer/stores/tabStore'

interface UseKeyboardShortcutsProps {
  onEditActiveTab?: () => void
}

export const useKeyboardShortcuts = (props?: UseKeyboardShortcutsProps) => {
  const { addTab, switchToNextTab, switchToPreviousTab, closeActiveTab } = useTabStore()
  const { onEditActiveTab } = props || {}

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 't':
            event.preventDefault()
            addTab()
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
  }, [addTab, switchToNextTab, switchToPreviousTab, closeActiveTab, onEditActiveTab])
}
