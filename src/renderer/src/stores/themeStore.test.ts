import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './themeStore'

// DOM操作をモック
const mockSetAttribute = vi.fn()
Object.defineProperty(document, 'documentElement', {
  value: {
    setAttribute: mockSetAttribute
  }
})

describe('ThemeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useThemeStore.setState({ theme: 'light' })
  })

  it('should have initial light theme', () => {
    const { theme } = useThemeStore.getState()
    expect(theme).toBe('light')
  })

  it('should set theme and update DOM attribute', () => {
    const { setTheme } = useThemeStore.getState()

    setTheme('dark')

    const { theme } = useThemeStore.getState()
    expect(theme).toBe('dark')
    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('should toggle theme from light to dark', () => {
    const { toggleTheme } = useThemeStore.getState()

    toggleTheme()

    const { theme } = useThemeStore.getState()
    expect(theme).toBe('dark')
    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark')
  })

  it('should toggle theme from dark to light', () => {
    const { setTheme, toggleTheme } = useThemeStore.getState()

    // まずダークテーマに設定
    setTheme('dark')

    // ライトテーマにトグル
    toggleTheme()

    const { theme } = useThemeStore.getState()
    expect(theme).toBe('light')
    expect(mockSetAttribute).toHaveBeenLastCalledWith('data-theme', 'light')
  })

  it('should call setTheme when toggling', () => {
    const setThemeSpy = vi.spyOn(useThemeStore.getState(), 'setTheme')
    const { toggleTheme } = useThemeStore.getState()

    toggleTheme()

    expect(setThemeSpy).toHaveBeenCalledWith('dark')
  })
})
