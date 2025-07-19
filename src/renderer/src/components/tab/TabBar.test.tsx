import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from './TabBar'
import { useApiStore } from '@/stores/apiStore'

// Zustandストアをモック
vi.mock('@/stores/apiStore')

const mockUseApiStore = vi.mocked(useApiStore)

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
    setActiveTab: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApiStore.mockReturnValue(mockStore as any)
  })

  it('should render all tabs', () => {
    render(<TabBar />)
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
  })

  it('should highlight active tab', () => {
    render(<TabBar />)
    
    const tab1Container = screen.getByText('Tab 1').closest('.tab')
    const tab2Container = screen.getByText('Tab 2').closest('.tab')
    
    expect(tab1Container).toHaveClass('active')
    expect(tab2Container).not.toHaveClass('active')
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
    mockUseApiStore.mockReturnValue(singleTabStore as any)
    
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
      tabs: [{
        ...mockStore.tabs[0],
        title: ''
      }]
    }
    mockUseApiStore.mockReturnValue(storeWithoutTitle as any)
    
    render(<TabBar />)
    
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })
})