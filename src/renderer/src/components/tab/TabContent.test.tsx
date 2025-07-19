import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TabContent } from './TabContent'
import { useApiStore } from '@renderer/stores/apiStore'

// APIストアをモック
vi.mock('@renderer/stores/apiStore')

// react-rndをモック
vi.mock('react-rnd', () => ({
  Rnd: ({ children, ...props }: any) => (
    <div 
      data-testid="rnd-container" 
      style={{ height: props.size?.height }}
      className={props.className}
    >
      {children}
      <div 
        data-testid="resize-handle" 
        className={props.resizeHandleClasses?.bottom}
        style={{ cursor: 'row-resize' }}
      />
    </div>
  )
}))

// ResizeObserver をモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}))

describe('TabContent', () => {
  const mockStore = {
    tabs: [
      {
        id: 'tab-1',
        title: 'Test Tab',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Test Request',
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      }
    ],
    activeTabId: 'tab-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useApiStore).mockImplementation(() => mockStore as any)
  })

  it('should render TabContent with resizable layout', () => {
    render(<TabContent />)
    
    // RNDコンテナの存在確認
    expect(screen.getByTestId('rnd-container')).toBeInTheDocument()
    
    // リサイズハンドルの存在確認
    expect(screen.getByTestId('resize-handle')).toBeInTheDocument()
    
    // RequestFormとResponseViewが含まれているかチェック
    expect(screen.getByPlaceholderText('Enter request URL')).toBeInTheDocument()
    expect(screen.getByText('No Response')).toBeInTheDocument()
  })

  it('should render "No active tab" when no active tab exists', () => {
    const emptyStore = {
      tabs: [],
      activeTabId: ''
    }
    
    vi.mocked(useApiStore).mockImplementation(() => emptyStore as any)
    
    render(<TabContent />)
    
    expect(screen.getByText('No active tab')).toBeInTheDocument()
    expect(screen.queryByTestId('rnd-container')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<TabContent className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render resize handle with correct styling', () => {
    render(<TabContent />)
    
    const resizeHandle = screen.getByTestId('resize-handle')
    expect(resizeHandle).toBeInTheDocument()
    expect(resizeHandle).toHaveStyle({ cursor: 'row-resize' })
  })

  it('should have correct initial height for request section', () => {
    render(<TabContent />)
    
    const rndContainer = screen.getByTestId('rnd-container')
    // minHeightが適用されているため200pxになる
    expect(rndContainer).toHaveStyle({ height: '200px' })
  })
})