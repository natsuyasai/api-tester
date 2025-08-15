import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const mockTabStore = {
  addTab: vi.fn(),
  switchToNextTab: vi.fn(),
  switchToPreviousTab: vi.fn(),
  closeActiveTab: vi.fn()
}

vi.mock('@renderer/stores/tabStore', () => ({
  useTabStore: () => mockTabStore
}))

vi.mock('@renderer/stores/collectionStore', () => ({
  useCollectionStore: () => ({ activeCollectionId: 'test-collection' })
}))

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add tab on Ctrl+T', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.addTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should add tab on Cmd+T (Mac)', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.addTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should close active tab on Ctrl+W', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 'w',
      ctrlKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.closeActiveTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should switch to next tab on Ctrl+Tab', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.switchToNextTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should switch to previous tab on Ctrl+Shift+Tab', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.switchToPreviousTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should not trigger actions for keys without modifiers', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 't'
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockTabStore.addTab).not.toHaveBeenCalled()
    unmount()
  })

  it('should prevent default behavior for handled shortcuts', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 't',
      ctrlKey: true
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      document.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    unmount()
  })

  it('should call onEditActiveTab when F2 is pressed', () => {
    const mockOnEditActiveTab = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onEditActiveTab: mockOnEditActiveTab })
    )

    const event = new KeyboardEvent('keydown', {
      key: 'F2'
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockOnEditActiveTab).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should dispatch custom event when F2 is pressed without onEditActiveTab callback', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())
    const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent')

    const event = new KeyboardEvent('keydown', {
      key: 'F2'
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'edit-active-tab'
      })
    )
    unmount()
    dispatchEventSpy.mockRestore()
  })

  it('should prevent default behavior for F2 key', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 'F2'
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      document.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    unmount()
  })

  it('should call onToggleCollections when Ctrl+B is pressed', () => {
    const mockOnToggleCollections = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onToggleCollections: mockOnToggleCollections })
    )

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockOnToggleCollections).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should call onToggleCollections when Cmd+B is pressed (Mac)', () => {
    const mockOnToggleCollections = vi.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onToggleCollections: mockOnToggleCollections })
    )

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      metaKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(mockOnToggleCollections).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('should dispatch custom event when Ctrl+B is pressed without onToggleCollections callback', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())
    const dispatchEventSpy = vi.spyOn(document, 'dispatchEvent')

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true
    })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'toggle-collections'
      })
    )
    unmount()
    dispatchEventSpy.mockRestore()
  })

  it('should prevent default behavior for Ctrl+B key', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      document.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    unmount()
  })
})
