import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useYamlOperations } from '@renderer/hooks/useYamlOperations'
import { useTabStore } from '@renderer/stores/tabStore'
import { TabBar } from './TabBar'

// Zustandストアをモック
vi.mock('@renderer/stores/tabStore')
vi.mock('@renderer/hooks/useYamlOperations')

const mockUseTabStore = vi.mocked(useTabStore)
const mockUseYamlOperations = vi.mocked(useYamlOperations)

describe('TabBar', () => {
  const mockTabs = [
    {
      id: 'tab-1',
      title: 'Tab 1',
      isActive: true,
      isCustomTitle: false,
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
      isCustomTitle: false,
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
  ]

  const mockTabStore = {
    tabs: mockTabs,
    activeTabId: 'tab-1',
    addTab: vi.fn(),
    closeTab: vi.fn(),
    setActiveTab: vi.fn(),
    updateTabTitle: vi.fn(),
    getActiveTab: vi.fn(),
    getTab: vi.fn(),
    resetTabs: vi.fn(),
    startEditingActiveTab: vi.fn(),
    getTabsByCollection: vi.fn(() => mockTabs),
    canCloseTab: vi.fn(() => true)
  }

  const mockYamlOperations = {
    exportYaml: vi.fn(),
    importYaml: vi.fn(),
    saveToFile: vi.fn(),
    loadFromFile: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTabStore.mockReturnValue(mockTabStore)
    mockUseYamlOperations.mockReturnValue(mockYamlOperations)
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

    expect(mockTabStore.setActiveTab).toHaveBeenCalledWith('tab-2')
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

    expect(mockTabStore.addTab).toHaveBeenCalled()
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

    expect(mockTabStore.closeTab).toHaveBeenCalledWith('tab-1')
  })

  it('should not render close buttons when only one tab exists', () => {
    const singleTabStore = {
      ...mockTabStore,
      tabs: [mockTabs[0]],
      canCloseTab: vi.fn(() => false)
    }
    mockUseTabStore.mockReturnValue(singleTabStore)

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

    expect(mockTabStore.closeTab).toHaveBeenCalledWith('tab-1')
    expect(mockTabStore.setActiveTab).not.toHaveBeenCalled()
  })

  it('should apply custom className when provided', () => {
    const { container } = render(<TabBar className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should display "Untitled" for tabs without title', () => {
    const storeWithoutTitle = {
      ...mockTabStore,
      tabs: [
        {
          ...mockTabs[0],
          title: ''
        }
      ]
    }

    // 新しいモックを設定
    mockUseTabStore.mockReturnValueOnce(storeWithoutTitle)

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

    expect(mockTabStore.updateTabTitle).toHaveBeenCalledWith('tab-1', 'New Title')
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
    expect(mockTabStore.updateTabTitle).not.toHaveBeenCalled()
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

    expect(mockTabStore.updateTabTitle).toHaveBeenCalledWith('tab-1', 'Blurred Title')
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

    expect(mockYamlOperations.saveToFile).toHaveBeenCalled()
  })

  it('should call loadFromFile when load button is clicked', async () => {
    const user = userEvent.setup()
    render(<TabBar />)

    const loadButton = screen.getByLabelText('Load collection from file')
    await user.click(loadButton)

    expect(mockYamlOperations.loadFromFile).toHaveBeenCalled()
  })

  it('should render settings button when onShowSettings is provided', () => {
    const mockOnShowSettings = vi.fn()
    render(<TabBar onShowSettings={mockOnShowSettings} />)

    expect(screen.getByLabelText('Open global settings')).toBeInTheDocument()
  })

  it('should call onShowSettings when settings button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnShowSettings = vi.fn()
    render(<TabBar onShowSettings={mockOnShowSettings} />)

    const settingsButton = screen.getByLabelText('Open global settings')
    await user.click(settingsButton)

    expect(mockOnShowSettings).toHaveBeenCalled()
  })
})
