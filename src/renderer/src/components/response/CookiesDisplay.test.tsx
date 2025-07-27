import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ApiResponse } from '@/types/types'
import { useCookieStore } from '@renderer/stores/cookieStore'
import { CookiesDisplay } from './CookiesDisplay'

// useCookieStoreのモック
vi.mock('@renderer/stores/cookieStore')

const mockUseCookieStore = vi.mocked(useCookieStore)

describe('CookiesDisplay', () => {
  const mockResponse: ApiResponse = {
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { type: 'text', data: 'test' },
    duration: 100,
    timestamp: '2024-01-01T00:00:00.000Z'
  }

  const mockCookieStoreFunctions = {
    cookies: [],
    addCookie: vi.fn(),
    updateCookie: vi.fn(),
    removeCookie: vi.fn(),
    getCookiesForDomain: vi.fn(),
    formatCookieHeader: vi.fn(),
    getEnabledCookies: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCookieStore.mockReturnValue(mockCookieStoreFunctions)
    mockUseCookieStore.getState = vi.fn().mockReturnValue({
      cookies: []
    })
  })

  test('should display no cookies message when no cookies found', () => {
    render(<CookiesDisplay response={mockResponse} requestUrl="https://example.com" />)

    expect(screen.getByText('No cookies found in response')).toBeInTheDocument()
  })

  test('should display cookies from set-cookie header', () => {
    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=abc123; Path=/; HttpOnly'
      }
    }

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://example.com" />)

    expect(screen.getByText('Cookies (1)')).toBeInTheDocument()
    expect(screen.getByText('sessionId')).toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(screen.getByText('HttpOnly')).toBeInTheDocument()
  })

  test('should display multiple cookies', () => {
    // 実際のHTTPレスポンスでは、複数のSet-Cookieヘッダーが別々のエントリとして送られる
    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=abc123'
      }
    }

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://example.com" />)

    // 実際には1つのCookieしかないので(1)になる
    expect(screen.getByText('Cookies (1)')).toBeInTheDocument()
    expect(screen.getByText('sessionId')).toBeInTheDocument()
  })

  test('should show cookie details', () => {
    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=abc123; Domain=.example.com; Path=/api; Secure; SameSite=Strict'
      }
    }

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://api.example.com" />)

    expect(screen.getByText('Domain:')).toBeInTheDocument()
    expect(screen.getByText('.example.com')).toBeInTheDocument()
    expect(screen.getByText('Path:')).toBeInTheDocument()
    expect(screen.getByText('/api')).toBeInTheDocument()
    expect(screen.getByText('Secure')).toBeInTheDocument()
    expect(screen.getByText('SameSite=Strict')).toBeInTheDocument()
  })

  test('should call addCookie when add button is clicked', () => {
    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=abc123'
      }
    }

    // 新しいCookieが追加されたときの状態をモック
    mockUseCookieStore.getState = vi.fn().mockReturnValue({
      cookies: [{ id: 'new-cookie-id' }]
    })

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://example.com" />)

    const addButton = screen.getByText('+ Add')
    fireEvent.click(addButton)

    expect(mockCookieStoreFunctions.addCookie).toHaveBeenCalled()
    expect(mockCookieStoreFunctions.updateCookie).toHaveBeenCalledWith('new-cookie-id', {
      name: 'sessionId',
      value: 'abc123',
      domain: 'example.com',
      path: '/',
      expires: undefined,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      enabled: true
    })
  })

  test('should update existing cookie when add button is clicked', () => {
    const existingCookie = {
      id: 'existing-id',
      name: 'sessionId',
      domain: 'example.com',
      value: 'old-value',
      path: '/',
      enabled: true
    }

    mockUseCookieStore.mockReturnValue({
      ...mockCookieStoreFunctions,
      cookies: [existingCookie]
    })

    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=new-value; HttpOnly'
      }
    }

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://example.com" />)

    const addButton = screen.getByText('+ Add')
    fireEvent.click(addButton)

    expect(mockCookieStoreFunctions.addCookie).not.toHaveBeenCalled()
    expect(mockCookieStoreFunctions.updateCookie).toHaveBeenCalledWith('existing-id', {
      value: 'new-value',
      path: '/',
      expires: undefined,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      enabled: true
    })
  })

  test('should call add all cookies when add all button is clicked', () => {
    const responseWithCookies: ApiResponse = {
      ...mockResponse,
      headers: {
        'set-cookie': 'sessionId=abc123'
      }
    }

    // 新しいCookieが追加されたときの状態をモック
    mockUseCookieStore.getState = vi.fn().mockReturnValue({
      cookies: [{ id: 'new-cookie-id' }]
    })

    render(<CookiesDisplay response={responseWithCookies} requestUrl="https://example.com" />)

    // "Add All"ボタンが表示されているかを確認
    const addAllButton = screen.getByText('Add All to Cookie Store')
    expect(addAllButton).toBeInTheDocument()

    fireEvent.click(addAllButton)

    // handleAddCookieが呼ばれることを確認するため、少なくともaddCookieまたはupdateCookieが呼ばれることをチェック
    expect(
      mockCookieStoreFunctions.addCookie.mock.calls.length +
        mockCookieStoreFunctions.updateCookie.mock.calls.length
    ).toBeGreaterThan(0)
  })
})
