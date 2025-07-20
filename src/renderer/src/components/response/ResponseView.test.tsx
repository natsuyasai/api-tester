import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiResponse } from '@/types/types'
import { useTabStore } from '@renderer/stores/tabStore'
import { ResponseView } from './ResponseView'

// Zustandストアをモック
vi.mock('@renderer/stores/tabStore')

const mockUseTabStore = vi.mocked(useTabStore)

describe('ResponseView', () => {
  const mockResponse: ApiResponse = {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-remaining': '99'
    },
    data: {
      users: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]
    },
    duration: 150,
    timestamp: '2024-01-01T10:30:00.000Z'
  }

  const mockTab = {
    id: 'tab-1',
    title: 'Test Tab',
    isActive: true,
    request: {
      id: 'req-1',
      name: 'Test Request',
      url: 'https://api.example.com',
      method: 'GET' as const,
      headers: [],
      params: [],
      body: '',
      bodyType: 'json' as const,
      type: 'rest' as const
    },
    response: mockResponse
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTabStore.mockReturnValue({
      tabs: [mockTab],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTab),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTab : undefined)),
      resetTabs: vi.fn()
    })
  })

  it('should display "No Response" when there is no response', () => {
    const mockTabWithoutResponse = {
      ...mockTab,
      response: null
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithoutResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithoutResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithoutResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText('No Response')).toBeInTheDocument()
    expect(screen.getByText('Send a request to see the response here')).toBeInTheDocument()
  })

  it('should display response status information', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText('200 OK')).toBeInTheDocument()
    expect(screen.getByText('150ms')).toBeInTheDocument()
    expect(screen.getByText(/19:30:00/)).toBeInTheDocument()
  })

  it('should format response time correctly', () => {
    const mockTabWithSlowResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        duration: 1500
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithSlowResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithSlowResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithSlowResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText('1.50s')).toBeInTheDocument()
  })

  it('should display success status with green styling', () => {
    render(<ResponseView tabId="tab-1" />)

    const statusElement = screen.getByText('200 OK')
    expect(statusElement).toHaveClass(/success/)
  })

  it('should display error status with red styling', () => {
    const mockTabWithErrorResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        status: 404,
        statusText: 'Not Found'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithErrorResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithErrorResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithErrorResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const statusElement = screen.getByText('404 Not Found')
    expect(statusElement).toHaveClass(/error/)
  })

  it('should display warning status with yellow styling', () => {
    const mockTabWithRedirectResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        status: 301,
        statusText: 'Moved Permanently'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithRedirectResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithRedirectResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithRedirectResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const statusElement = screen.getByText('301 Moved Permanently')
    expect(statusElement).toHaveClass(/warning/)
  })

  it('should render response tabs', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Body' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Headers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cookies' })).toBeInTheDocument()
  })

  it('should show body content by default', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText(/"users":/)).toBeInTheDocument()
    expect(screen.getByText(/"name": "John Doe"/)).toBeInTheDocument()
  })

  it('should switch to headers tab when clicked', () => {
    render(<ResponseView tabId="tab-1" />)

    const headersTab = screen.getByRole('button', { name: 'Headers' })
    fireEvent.click(headersTab)

    expect(headersTab).toHaveClass(/active/)
    expect(screen.getByText('content-type:')).toBeInTheDocument()
    expect(screen.getByText('application/json')).toBeInTheDocument()
    expect(screen.getByText('x-ratelimit-remaining:')).toBeInTheDocument()
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('should switch to cookies tab when clicked', () => {
    render(<ResponseView tabId="tab-1" />)

    const cookiesTab = screen.getByRole('button', { name: 'Cookies' })
    fireEvent.click(cookiesTab)

    expect(cookiesTab).toHaveClass(/active/)
    expect(screen.getByText('No cookies found in response')).toBeInTheDocument()
  })

  it('should format JSON response properly', () => {
    render(<ResponseView tabId="tab-1" />)

    const responseBody = screen.getByText(/"users":/)
    expect(responseBody).toBeInTheDocument()

    // JSONが適切にフォーマットされているかチェック
    const formattedText = responseBody.textContent
    expect(formattedText).toContain('{\n  "users": [')
  })

  it('should handle non-JSON response data', () => {
    const mockTabWithTextResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: 'Plain text response'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithTextResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithTextResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithTextResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText(/Plain text response/)).toBeInTheDocument()
  })

  it('should handle malformed data gracefully', () => {
    const mockTabWithBadData = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: undefined
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithBadData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithBadData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithBadData : undefined)),
      resetTabs: vi.fn()
    })

    expect(() => {
      render(<ResponseView tabId="tab-1" />)
    }).not.toThrow()
  })

  it('should handle missing tab gracefully', () => {
    mockUseTabStore.mockReturnValue({
      tabs: [mockTab],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTab),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTab : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="non-existent-tab" />)

    expect(screen.getByText('No Response')).toBeInTheDocument()
  })

  it('should display response size information', () => {
    render(<ResponseView tabId="tab-1" />)

    // JSON データのサイズが表示されることを確認
    expect(screen.getByText(/B$/)).toBeInTheDocument()
  })

  it('should show preview tab for HTML response', () => {
    const mockTabWithHtmlResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        headers: {
          'content-type': 'text/html'
        },
        data: '<html><body>Test HTML</body></html>'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithHtmlResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithHtmlResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithHtmlResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('should show preview tab for XML response', () => {
    const mockTabWithXmlResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        headers: {
          'content-type': 'application/xml'
        },
        data: '<?xml version="1.0"?><root><test>value</test></root>'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithXmlResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithXmlResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithXmlResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('should show preview tab for image response', () => {
    const mockTabWithImageResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        headers: {
          'content-type': 'image/png'
        },
        data: 'base64imagedata'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithImageResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithImageResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithImageResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('should not show preview tab for JSON response', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
  })

  it('should render HTML content in iframe when preview tab is active', () => {
    const mockTabWithHtmlResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        headers: {
          'content-type': 'text/html'
        },
        data: '<html><body>Test HTML</body></html>'
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithHtmlResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithHtmlResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithHtmlResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const iframe = screen.getByTitle('HTML Preview')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('srcDoc', '<html><body>Test HTML</body></html>')
  })

  it('should have download button', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: /Download/ })).toBeInTheDocument()
  })

  it('should have export button', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument()
  })

  it('should have copy button', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument()
  })
})
