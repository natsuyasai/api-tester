import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApiStore } from '@renderer/stores/apiStore'
import { ApiResponse } from '@/types/types'
import { ResponseView } from './ResponseView'

// Zustandストアをモック
vi.mock('@renderer/stores/apiStore')

const mockUseApiStore = vi.mocked(useApiStore)

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

  const mockStore = {
    tabs: [
      {
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
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApiStore.mockImplementation(() => mockStore as any)
  })

  it('should display "No Response" when there is no response', () => {
    const storeWithoutResponse = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: null
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithoutResponse as any)

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
    const storeWithSlowResponse = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: {
            ...mockResponse,
            duration: 1500
          }
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithSlowResponse as any)

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText('1.50s')).toBeInTheDocument()
  })

  it('should display success status with green styling', () => {
    render(<ResponseView tabId="tab-1" />)

    const statusElement = screen.getByText('200 OK')
    expect(statusElement).toHaveClass(/success/)
  })

  it('should display error status with red styling', () => {
    const storeWithErrorResponse = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: {
            ...mockResponse,
            status: 404,
            statusText: 'Not Found'
          }
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithErrorResponse as any)

    render(<ResponseView tabId="tab-1" />)

    const statusElement = screen.getByText('404 Not Found')
    expect(statusElement).toHaveClass(/error/)
  })

  it('should display warning status with yellow styling', () => {
    const storeWithRedirectResponse = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: {
            ...mockResponse,
            status: 301,
            statusText: 'Moved Permanently'
          }
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithRedirectResponse as any)

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
    const storeWithTextResponse = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: {
            ...mockResponse,
            data: 'Plain text response'
          }
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithTextResponse as any)

    render(<ResponseView tabId="tab-1" />)

    expect(screen.getByText(/Plain text response/)).toBeInTheDocument()
  })

  it('should handle malformed data gracefully', () => {
    const storeWithBadData = {
      tabs: [
        {
          ...mockStore.tabs[0],
          response: {
            ...mockResponse,
            data: undefined
          }
        }
      ]
    }
    mockUseApiStore.mockImplementation(() => storeWithBadData as any)

    expect(() => {
      render(<ResponseView tabId="tab-1" />)
    }).not.toThrow()
  })

  it('should handle missing tab gracefully', () => {
    render(<ResponseView tabId="non-existent-tab" />)

    expect(screen.getByText('No Response')).toBeInTheDocument()
  })
})
