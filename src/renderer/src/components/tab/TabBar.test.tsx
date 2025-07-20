import { useApiStore } from '@renderer/stores/apiStore'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from '@renderer/stores/themeStore'
import { TabBar } from './TabBar'

// Zustandストアをモック
vi.mock('@renderer/stores/apiStore')
vi.mock('@renderer/stores/themeStore')

const mockUseApiStore = vi.mocked(useApiStore)
const mockUseThemeStore = vi.mocked(useThemeStore)

describe('TabBar', () => {
  const mockStore = {
    tabs: [
      {
        id: 'tab-1',
        title: 'Tab 1',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Request 1',
          url: '',
          method: 'GET' as const,
          headers: [],
          params: [],
          body: '',
          bodyType: 'json' as const,
          type: 'rest' as const
        },
        response: null
      },
      {
        id: 'tab-2',
        title: 'Tab 2',
        isActive: false,
        request: {
          id: 'req-2',
          name: 'Request 2',
          url: '',
          method: 'GET' as const,
          headers: [],
          params: [],
          body: '',
          bodyType: 'json' as const,
          type: 'rest' as const
        },
        response: null
      }
    ],
    addTab: vi.fn(),
    closeTab: vi.fn(),
    setActiveTab: vi.fn(),
    updateTabTitle: vi.fn(),
    saveToFile: vi.fn(),
    loadFromFile: vi.fn()
  }

  const mockThemeStore = {
    theme: 'light' as 'light' | 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApiStore.mockImplementation(() => mockStore as any)
    mockUseThemeStore.mockImplementation(() => mockThemeStore as any)
  })

  it('should render all tabs', () => {
    render(<TabBar />)

    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
  })

  it('should highlight active tab', () => {
    render(<TabBar />)

    const tab1Container = screen.getByText('Tab 1').closest('div')
    const tab2Container = screen.getByText('Tab 2').closest('div')

    expect(tab1Container).toHaveClass(/active/)
    expect(tab2Container).not.toHaveClass(/active/)
  })

  it('should call setActiveTab when tab is clicked', () => {
    render(<TabBar />)

    const tab2Buttons = screen.getAllByText('Tab 2')
    const tab2Button = tab2Buttons[0].closest('button')
    fireEvent.click(tab2Button!)

    expect(mockStore.setActiveTab).toHaveBeenCalledWith('tab-2')
  })

  it('should render add tab button', () => {
    render(<TabBar />)

    const addButton = screen.getByRole('button', { name: /add new tab/i })
    expect(addButton).toBeInTheDocument()
  })

  it('should call addTab when add button is clicked', () => {
    render(<TabBar />)

    const addButton = screen.getByRole('button', { name: /add new tab/i })
    fireEvent.click(addButton)

    expect(mockStore.addTab).toHaveBeenCalled()
  })

  it('should render close buttons for tabs when more than one tab exists', () => {
    render(<TabBar />)

    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    expect(closeButtons).toHaveLength(2)
  })

  it('should call closeTab when close button is clicked', () => {
    render(<TabBar />)

    const closeButton = screen.getByRole('button', { name: /close tab 1/i })
    fireEvent.click(closeButton)

    expect(mockStore.closeTab).toHaveBeenCalledWith('tab-1')
  })

  it('should not render close buttons when only one tab exists', () => {
    const singleTabStore = {
      ...mockStore,
      tabs: [mockStore.tabs[0]]
    }
    mockUseApiStore.mockImplementation(() => singleTabStore as any)

    render(<TabBar />)

    const closeButtons = screen.queryAllByRole('button', { name: /close/i })
    expect(closeButtons).toHaveLength(0)
  })

  it('should prevent close event from bubbling when close button is clicked', () => {
    render(<TabBar />)

    const closeButton = screen.getByRole('button', { name: /close tab 1/i })
    const clickSpy = vi.fn()

    const tabButton = closeButton.closest('button')!.parentElement!
    tabButton.addEventListener('click', clickSpy)

    fireEvent.click(closeButton)

    expect(mockStore.closeTab).toHaveBeenCalledWith('tab-1')
    expect(mockStore.setActiveTab).not.toHaveBeenCalled()
  })

  it('should apply custom className when provided', () => {
    const { container } = render(<TabBar className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should display "Untitled" for tabs without title', () => {
    const storeWithoutTitle = {
      ...mockStore,
      tabs: [
        {
          ...mockStore.tabs[0],
          title: ''
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithoutTitle as any)

    render(<TabBar />)

    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('should enable editing mode when tab title is double-clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const tabButton = screen.getByText('Tab 1').closest('button')
    expect(tabButton).toBeInTheDocument()

    // ダブルクリックして編集モードに入る
    await user.dblClick(tabButton!)

    // 入力フィールドが表示されることを確認
    const input = screen.getByDisplayValue('Tab 1')
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('should save title when pressing Enter', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const tabButton = screen.getByText('Tab 1').closest('button')
    await user.dblClick(tabButton!)

    const input = screen.getByDisplayValue('Tab 1')
    await user.clear(input)
    await user.type(input, 'New Title')
    await user.keyboard('{Enter}')

    expect(mockStore.updateTabTitle).toHaveBeenCalledWith('tab-1', 'New Title')
  })

  it('should cancel editing when pressing Escape', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const tabButton = screen.getByText('Tab 1').closest('button')
    await user.dblClick(tabButton!)

    const input = screen.getByDisplayValue('Tab 1')
    await user.clear(input)
    await user.type(input, 'New Title')
    await user.keyboard('{Escape}')

    // 編集がキャンセルされ、元のタイトルが表示される
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(mockStore.updateTabTitle).not.toHaveBeenCalled()
  })

  it('should save title when input loses focus', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const tabButton = screen.getByText('Tab 1').closest('button')
    await user.dblClick(tabButton!)

    const input = screen.getByDisplayValue('Tab 1')
    await user.clear(input)
    await user.type(input, 'Blurred Title')

    // フォーカスを他の要素に移す
    const addButton = screen.getByLabelText('Add new tab')
    await user.click(addButton)

    expect(mockStore.updateTabTitle).toHaveBeenCalledWith('tab-1', 'Blurred Title')
  })

  it('should render file operation buttons', () => {
    render(<TabBar />)

    expect(screen.getByLabelText('Load collection from file')).toBeInTheDocument()
    expect(screen.getByLabelText('Save collection to file')).toBeInTheDocument()
  })

  it('should call saveToFile when save button is clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const saveButton = screen.getByLabelText('Save collection to file')
    await user.click(saveButton)

    expect(mockStore.saveToFile).toHaveBeenCalled()
  })

  it('should call loadFromFile when load button is clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const loadButton = screen.getByLabelText('Load collection from file')
    await user.click(loadButton)

    expect(mockStore.loadFromFile).toHaveBeenCalled()
  })

  it('should render theme toggle button', () => {
    render(<TabBar />)

    expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument()
  })

  it('should call toggleTheme when theme button is clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const themeButton = screen.getByLabelText('Switch to dark theme')
    await user.click(themeButton)

    expect(mockThemeStore.toggleTheme).toHaveBeenCalled()
  })

  it('should show correct theme icon based on current theme', () => {
    render(<TabBar />)

    const themeButton = screen.getByLabelText('Switch to dark theme')
    expect(themeButton.textContent).toBe('🌙')

    // ダークテーマの場合
    mockThemeStore.theme = 'dark'
    mockUseThemeStore.mockImplementation(() => mockThemeStore as any)

    render(<TabBar />)
    const lightThemeButton = screen.getByLabelText('Switch to light theme')
    expect(lightThemeButton.textContent).toBe('☀️')
  })
})
