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
      type: 'json',
      data: {
        users: [
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' }
        ]
      }
    },
    duration: 150,
    timestamp: '2024-01-01T10:30:00.000Z'
  }

  const mockTab = {
    id: 'tab-1',
    title: 'Test Tab',
    isActive: true,
    isCustomTitle: false,
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
    expect(screen.getByText(/7:30:00 PM/)).toBeInTheDocument()
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
    expect(formattedText).toContain('"users": [')
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

  it('should show property selector when preview tab is active', () => {
    const mockTabWithNestedData = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          result: {
            html: '<html><body>Test HTML</body></html>',
            text: 'Plain text content'
          }
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithNestedData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithNestedData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithNestedData : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    expect(screen.getByText('プレビュー対象:')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should allow selecting different properties for preview', () => {
    const mockTabWithNestedData = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          content: '<html><body>Test HTML</body></html>',
          metadata: {
            title: 'Test Page'
          }
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithNestedData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithNestedData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithNestedData : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const propertySelect = screen.getByRole('combobox')
    expect(propertySelect).toBeInTheDocument()

    // オプションが正しく表示されることを確認
    expect(screen.getByText(/data \(object\)/)).toBeInTheDocument()
  })

  it('should toggle property list visibility', () => {
    const mockTabWithNestedData = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          content: '<html><body>Test HTML</body></html>'
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithNestedData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithNestedData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithNestedData : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const toggleButton = screen.getByRole('button', { name: /一覧/ })
    expect(toggleButton).toBeInTheDocument()

    // プロパティリストが表示されていないことを確認
    expect(screen.queryByText('利用可能なプロパティ:')).not.toBeInTheDocument()

    // トグルボタンをクリック
    fireEvent.click(toggleButton)

    // プロパティリストが表示されることを確認
    expect(screen.getByText('利用可能なプロパティ:')).toBeInTheDocument()
  })

  it('should display nested properties in property list', () => {
    const mockTabWithNestedData = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          user: {
            profile: {
              name: 'John Doe',
              avatar: '<svg>avatar</svg>'
            }
          }
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithNestedData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithNestedData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithNestedData : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const toggleButton = screen.getByRole('button', { name: /一覧/ })
    fireEvent.click(toggleButton)

    // ネストされたプロパティが表示されることを確認
    const dataUserElements = screen.getAllByText(/data\.user/)
    expect(dataUserElements.length).toBeGreaterThan(0)
    const dataUserProfileElements = screen.getAllByText(/data\.user\.profile/)
    expect(dataUserProfileElements.length).toBeGreaterThan(0)
  })

  it('should show preview tab for binary image response', () => {
    const mockTabWithBinaryImageResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          type: 'binary',
          subType: 'image',
          contentType: 'image/png',
          data: 'iVBORw0KGgo=',
          dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
          isPreviewable: true,
          originalBlob: new Blob()
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithBinaryImageResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithBinaryImageResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithBinaryImageResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('should render binary image preview correctly', () => {
    const mockTabWithBinaryImageResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          type: 'binary',
          subType: 'image',
          contentType: 'image/png',
          data: 'iVBORw0KGgo=',
          dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
          isPreviewable: true,
          originalBlob: new Blob()
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithBinaryImageResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithBinaryImageResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithBinaryImageResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const img = screen.getByRole('img', { name: 'Preview' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=')
  })

  it('should show preview tab for binary audio response', () => {
    const mockTabWithBinaryAudioResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          type: 'binary',
          subType: 'audio',
          contentType: 'audio/mpeg',
          data: 'SUQz',
          dataUrl: 'data:audio/mpeg;base64,SUQz',
          isPreviewable: true,
          originalBlob: new Blob()
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithBinaryAudioResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithBinaryAudioResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithBinaryAudioResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    const audio = screen.getByText('お使いのブラウザは音声の再生をサポートしていません。')
    expect(audio).toBeInTheDocument()
  })

  it('should not show preview tab for non-previewable binary response', () => {
    const mockTabWithNonPreviewableBinaryResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          type: 'binary',
          subType: 'other',
          contentType: 'application/octet-stream',
          data: 'binarydata',
          dataUrl: null,
          isPreviewable: false,
          originalBlob: new Blob()
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithNonPreviewableBinaryResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithNonPreviewableBinaryResponse),
      getTab: vi.fn((id: string) =>
        id === 'tab-1' ? mockTabWithNonPreviewableBinaryResponse : undefined
      ),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
  })

  it('should display raw tab', () => {
    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByRole('button', { name: 'Raw' })).toBeInTheDocument()
  })

  it('should switch to raw tab when clicked', () => {
    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(rawTab).toHaveClass(/active/)
    expect(screen.getByText(/=== REQUEST ===/)).toBeInTheDocument()
    expect(screen.getByText(/=== RESPONSE ===/)).toBeInTheDocument()
  })

  it('should display formatted HTTP request in raw tab', () => {
    const mockTabWithPostRequest = {
      ...mockTab,
      request: {
        ...mockTab.request,
        method: 'POST',
        url: 'https://api.example.com/users',
        params: [
          { key: 'limit', value: '10', enabled: true },
          { key: 'offset', value: '0', enabled: false }
        ],
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Authorization', value: 'Bearer token123', enabled: true }
        ],
        body: '{"name": "John Doe"}',
        bodyType: 'json' as const
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithPostRequest],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithPostRequest),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithPostRequest : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/POST \/users\?limit=10 HTTP\/1\.1/)).toBeInTheDocument()
    expect(screen.getByText(/Host: api\.example\.com/)).toBeInTheDocument()
    expect(screen.getByText(/Content-Type: application\/json/)).toBeInTheDocument()
    expect(screen.getByText(/Authorization: Bearer token123/)).toBeInTheDocument()
    expect(screen.getByText(/"name": "John Doe"/)).toBeInTheDocument()
  })

  it('should display formatted HTTP response in raw tab', () => {
    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/HTTP\/1\.1 200 OK/)).toBeInTheDocument()
    expect(screen.getByText(/content-type: application\/json/)).toBeInTheDocument()
    expect(screen.getByText(/x-ratelimit-remaining: 99/)).toBeInTheDocument()
  })

  it('should handle authentication in raw request display', () => {
    const mockTabWithAuth = {
      ...mockTab,
      request: {
        ...mockTab.request,
        auth: {
          type: 'basic' as const,
          basic: {
            username: 'testuser',
            password: 'testpass'
          }
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithAuth],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithAuth),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithAuth : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/Authorization: Basic/)).toBeInTheDocument()
  })

  it('should handle form-data requests in raw display', () => {
    const mockTabWithFormData = {
      ...mockTab,
      request: {
        ...mockTab.request,
        method: 'POST',
        bodyType: 'form-data' as const,
        body: '',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John Doe', enabled: true },
          { key: 'file', value: 'content', enabled: true, isFile: true, fileName: 'test.txt' }
        ]
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithFormData],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithFormData),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithFormData : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/\[Form Data\]/)).toBeInTheDocument()
    expect(screen.getByText(/name: John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/file: \[File: test\.txt\]/)).toBeInTheDocument()
  })

  it('should handle binary response data in raw display', () => {
    const mockTabWithBinaryResponse = {
      ...mockTab,
      response: {
        ...mockResponse,
        data: {
          type: 'binary',
          subType: 'image',
          contentType: 'image/png',
          size: 1024
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithBinaryResponse],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithBinaryResponse),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithBinaryResponse : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/\[Binary Data: image\/png, Size: 1024 bytes\]/)).toBeInTheDocument()
  })

  it('should include query parameters in raw request display', () => {
    const mockTabWithParams = {
      ...mockTab,
      request: {
        ...mockTab.request,
        url: 'https://api.example.com/search',
        params: [
          { key: 'q', value: 'test query', enabled: true },
          { key: 'limit', value: '20', enabled: true },
          { key: 'disabled', value: 'ignore', enabled: false }
        ]
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithParams],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithParams),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithParams : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/GET \/search\?q=test\+query&limit=20 HTTP\/1\.1/)).toBeInTheDocument()
  })

  it('should include API key in query parameters when configured', () => {
    const mockTabWithApiKeyQuery = {
      ...mockTab,
      request: {
        ...mockTab.request,
        url: 'https://api.example.com/data',
        auth: {
          type: 'api-key' as const,
          apiKey: {
            key: 'api_key',
            value: 'secret123',
            location: 'query' as const
          }
        }
      }
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithApiKeyQuery],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithApiKeyQuery),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithApiKeyQuery : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    expect(screen.getByText(/GET \/data\?api_key=secret123 HTTP\/1\.1/)).toBeInTheDocument()
  })

  it('should display executed request content in raw tab when executedRequest is available', () => {
    const executedRequest = {
      id: 'req-1',
      name: 'Executed Request',
      url: 'https://api.example.com/executed',
      method: 'POST' as const,
      headers: [{ key: 'Authorization', value: 'Bearer token123', enabled: true }],
      params: [],
      body: '{"executed": true}',
      bodyType: 'json' as const,
      type: 'rest' as const
    }

    const responseWithExecutedRequest = {
      ...mockResponse,
      executedRequest
    }

    const mockTabWithExecutedRequest = {
      ...mockTab,
      request: {
        // 現在のリクエスト内容（変更後）
        id: 'req-1',
        name: 'Modified Request',
        url: 'https://api.example.com/modified',
        method: 'GET' as const,
        headers: [],
        params: [],
        body: '',
        bodyType: 'json' as const,
        type: 'rest' as const
      },
      response: responseWithExecutedRequest
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithExecutedRequest],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithExecutedRequest),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithExecutedRequest : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    // 実行時のリクエスト内容（/executed）が表示され、現在のリクエスト内容（/modified）は表示されない
    expect(screen.getByText(/POST \/executed HTTP\/1\.1/)).toBeInTheDocument()
    expect(screen.queryByText(/GET \/modified HTTP\/1\.1/)).not.toBeInTheDocument()
    expect(screen.getByText(/Authorization: Bearer token123/)).toBeInTheDocument()
    expect(screen.getByText(/"executed": true/)).toBeInTheDocument()
  })

  it('should fallback to current request content in raw tab when executedRequest is not available', () => {
    const responseWithoutExecutedRequest = {
      ...mockResponse,
      executedRequest: undefined
    }

    const mockTabWithoutExecutedRequest = {
      ...mockTab,
      response: responseWithoutExecutedRequest
    }

    mockUseTabStore.mockReturnValue({
      tabs: [mockTabWithoutExecutedRequest],
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(() => mockTabWithoutExecutedRequest),
      getTab: vi.fn((id: string) => (id === 'tab-1' ? mockTabWithoutExecutedRequest : undefined)),
      resetTabs: vi.fn()
    })

    render(<ResponseView tabId="tab-1" />)

    const rawTab = screen.getByRole('button', { name: 'Raw' })
    fireEvent.click(rawTab)

    // 現在のリクエスト内容が表示される
    expect(screen.getByText(/GET \/ HTTP\/1\.1/)).toBeInTheDocument()
  })
})
