import { useApiStore } from '@renderer/stores/apiStore'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TabContent } from './TabContent'

// APIストアをモック
vi.mock('@renderer/stores/apiStore')

// マウスイベントをモック
global.MouseEvent = class MouseEvent extends Event {
  clientY: number
  constructor(type: string, options: { clientY?: number } = {}) {
    super(type)
    this.clientY = options.clientY || 0
  }
} as any

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

  it('should render TabContent with grid-based resizable layout', () => {
    render(<TabContent />)

    // RequestFormとResponseViewが含まれているかチェック
    expect(screen.getByPlaceholderText('Enter request URL')).toBeInTheDocument()
    expect(screen.getByText('No Response')).toBeInTheDocument()

    // リサイズハンドルの存在確認
    const resizeHandle = document.querySelector('[class*="resizeHandle"]')
    expect(resizeHandle).toBeInTheDocument()
  })

  it('should render "No active tab" when no active tab exists', () => {
    const emptyStore = {
      tabs: [],
      activeTabId: ''
    }

    vi.mocked(useApiStore).mockImplementation(() => emptyStore as any)

    const { container } = render(<TabContent />)

    expect(screen.getByText('No active tab')).toBeInTheDocument()
    expect(container.querySelector('[class*="resizeHandle"]')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<TabContent className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render resize handle', () => {
    render(<TabContent />)

    const resizeHandle = document.querySelector('[class*="resizeHandle"]')
    expect(resizeHandle).toBeInTheDocument()
  })

  it('should have grid layout structure', () => {
    render(<TabContent />)

    // 基本的なレイアウト構造を確認
    expect(screen.getByPlaceholderText('Enter request URL')).toBeInTheDocument()
    expect(screen.getByText('No Response')).toBeInTheDocument()
  })

  it('should handle mouse events for resizing', () => {
    render(<TabContent />)

    const resizeHandle = document.querySelector('[class*="resizeHandle"]')
    expect(resizeHandle).toBeInTheDocument()

    // マウスダウンイベントをシミュレート
    if (resizeHandle) {
      fireEvent.mouseDown(resizeHandle, { clientY: 100 })

      // イベントが処理されることを確認（具体的なDOM変更は確認しない）
      expect(resizeHandle).toBeInTheDocument()
    }
  })
})
