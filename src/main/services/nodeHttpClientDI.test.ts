import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequest } from '@/types/types'
import { GlobalSettings } from '@renderer/stores/globalSettingsStore'
import { NodeHttpClientDI, createMockNodeHttpClient } from './nodeHttpClientDI'

// 完全なデフォルトGlobalSettings
const DEFAULT_SETTINGS: GlobalSettings = {
  defaultTimeout: 30,
  defaultFollowRedirects: true,
  defaultMaxRedirects: 5,
  defaultValidateSSL: true,
  defaultUserAgent: 'API Tester',
  theme: 'light',
  fontSize: 'medium',
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  debugLogs: false,
  saveHistory: true,
  maxHistorySize: 1000,
  proxyEnabled: false,
  proxyUrl: '',
  proxyAuth: undefined,
  allowInsecureConnections: false,
  certificateValidation: true,
  autoSave: false,
  autoSaveInterval: 300,
  checkForUpdates: true
}

// globalSettingsStoreのモック
vi.mock('@renderer/stores/globalSettingsStore', () => ({
  getGlobalSettings: vi.fn(() => DEFAULT_SETTINGS)
}))

// errorUtilsのモック
vi.mock('@renderer/utils/errorUtils', () => ({
  ErrorHandler: {
    handleValidationError: vi.fn((message: string, context: any) => ({
      message,
      context
    })),
    handleSystemError: vi.fn((error: unknown, context: any) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        message: errorMessage,
        context,
        type: 'system',
        timestamp: new Date().toISOString()
      }
    }),
    logError: vi.fn(),
    extractErrorMessage: vi.fn((error: unknown) =>
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}))

describe('NodeHttpClientDI', () => {
  let httpClient: NodeHttpClientDI
  let mockUndiciRequest: ReturnType<typeof vi.fn>
  let MockProxyAgent: ReturnType<typeof vi.fn>

  const mockApiRequest: ApiRequest = {
    id: 'test-id',
    name: 'Test Request',
    url: 'https://api.example.com/users',
    method: 'GET',
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    params: [{ key: 'limit', value: '10', enabled: true }],
    body: '',
    bodyType: 'json',
    bodyKeyValuePairs: [],
    type: 'rest'
  }

  beforeEach(() => {
    // undiciRequestのモックを作成
    mockUndiciRequest = vi.fn()

    // ProxyAgentのモックを作成
    MockProxyAgent = vi.fn(() => ({
      dispatch: vi.fn(),
      close: vi.fn()
    })) as any

    // DIクライアントを作成
    httpClient = createMockNodeHttpClient(mockUndiciRequest, MockProxyAgent)

    vi.clearAllMocks()
  })

  describe('executeRequest', () => {
    it('should execute GET request successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json'
        },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{"users": []}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
      expect(result.data.type).toBe('json')
      if (result.data.type === 'json') {
        expect(result.data.data).toEqual({ users: [] })
      }
      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers)
        })
      )
    })

    it('should execute POST request with body', async () => {
      const postRequest: ApiRequest = {
        ...mockApiRequest,
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe' }),
        bodyType: 'json'
      }

      const mockResponse = {
        statusCode: 201,
        headers: {
          'content-type': 'application/json'
        },
        body: {
          arrayBuffer: vi
            .fn()
            .mockResolvedValue(new TextEncoder().encode('{"id": 1, "name": "John Doe"}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(postRequest)

      expect(result.status).toBe(201)
      expect(result.statusText).toBe('Created')
      expect(result.data.type).toBe('json')
      if (result.data.type === 'json') {
        expect(result.data.data).toEqual({ id: 1, name: 'John Doe' })
      }
      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John Doe' })
        })
      )
    })

    it('should handle text response', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {
          'content-type': 'text/plain'
        },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('Hello World').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(200)
      expect(result.data.type).toBe('text')
      if (result.data.type === 'text') {
        expect(result.data.data).toBe('Hello World')
      }
    })

    it('should handle binary response', async () => {
      const mockBinaryData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header
      const mockResponse = {
        statusCode: 200,
        headers: {
          'content-type': 'image/png'
        },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(mockBinaryData.buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(200)
      expect(result.data.type).toBe('binary')
      if (result.data.type === 'binary') {
        expect(result.data.mimeType).toBe('image/png')
        expect(result.data.size).toBe(8)
        expect(result.data.data).toMatch(/^data:image\/png;base64,/)
      }
    })

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED')
      ;(networkError as any).code = 'ECONNREFUSED'

      mockUndiciRequest.mockRejectedValue(networkError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Connection Refused')
      expect(result.data.type).toBe('error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      ;(timeoutError as any).code = 'UND_ERR_HEADERS_TIMEOUT'

      mockUndiciRequest.mockRejectedValue(timeoutError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Request Timeout')
      expect(result.data.type).toBe('error')
    })

    it('should handle validation errors', async () => {
      const invalidRequest: ApiRequest = {
        ...mockApiRequest,
        url: '' // 無効なURL
      }

      const result = await httpClient.executeRequest(invalidRequest)

      expect(result.data.type).toBe('error')
      expect(mockUndiciRequest).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON response gracefully', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {
          'content-type': 'application/json'
        },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('invalid json {').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(200)
      expect(result.data.type).toBe('text')
      if (result.data.type === 'text') {
        expect(result.data.data).toBe('invalid json {')
      }
    })
  })

  describe('executeRequestWithCancel', () => {
    it('should support request cancellation', async () => {
      const abortController = new AbortController()
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequestWithCancel(
        mockApiRequest,
        undefined,
        abortController.signal
      )

      expect(result.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: abortController.signal
        })
      )
    })

    it('should handle cancelled requests', async () => {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'

      mockUndiciRequest.mockRejectedValue(abortError)

      const result = await httpClient.executeRequestWithCancel(
        mockApiRequest,
        undefined,
        new AbortController().signal
      )

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Network Error')
      expect(result.data.type).toBe('error')
    })
  })

  describe('validateRequest', () => {
    it('should validate request without executing', () => {
      const errors = httpClient.validateRequest(mockApiRequest)

      expect(Array.isArray(errors)).toBe(true)
      expect(mockUndiciRequest).not.toHaveBeenCalled()
    })

    it('should return validation errors for invalid request', () => {
      const invalidRequest: ApiRequest = {
        ...mockApiRequest,
        url: ''
      }

      const errors = httpClient.validateRequest(invalidRequest)

      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('getRequestDetails', () => {
    it('should return request details for debugging', () => {
      const details = httpClient.getRequestDetails(mockApiRequest)

      expect(details).toHaveProperty('url')
      expect(details).toHaveProperty('method')
      expect(details).toHaveProperty('headers')
      expect(details).toHaveProperty('body')
      expect(details).toHaveProperty('settings')

      if ('url' in details) {
        expect(details.url).toBe('https://api.example.com/users?limit=10')
        expect(details.method).toBe('GET')
      }
    })

    it('should handle errors in getRequestDetails', () => {
      const invalidRequest: ApiRequest = {
        ...mockApiRequest,
        url: 'invalid-url'
      }

      const details = httpClient.getRequestDetails(invalidRequest)

      expect(details).toHaveProperty('error')
      expect(details).toHaveProperty('context')
    })
  })

  describe('cookie resolver', () => {
    it('should use cookie resolver when set', async () => {
      const mockCookieResolver = vi.fn().mockReturnValue('sessionid=abc123')
      httpClient.setCookieResolver(mockCookieResolver)

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockCookieResolver).toHaveBeenCalledWith('api.example.com')
    })
  })

  describe('proxy settings', () => {
    it('should apply proxy settings when enabled', async () => {
      // getGlobalSettingsのモックを一時的に変更
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        proxyEnabled: true,
        proxyUrl: 'http://proxy.example.com:8080',
        proxyAuth: { username: 'user', password: 'pass' }
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET',
          dispatcher: expect.any(Object)
        })
      )

      expect(MockProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
        auth: 'user:pass'
      })

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
    })

    it('should handle proxy configuration errors gracefully', async () => {
      // getGlobalSettingsのモックを一時的に変更
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        proxyEnabled: true,
        proxyUrl: 'invalid-proxy-url',
        proxyAuth: undefined
      })

      // ProxyAgentがエラーをthrowするように設定
      MockProxyAgent.mockImplementation(() => {
        throw new Error('Invalid proxy configuration')
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      // プロキシエラーがあってもリクエストが実行される
      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalled()

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
      MockProxyAgent.mockImplementation(() => ({
        dispatch: vi.fn(),
        close: vi.fn()
      }))
    })
  })

  describe('SSL settings', () => {
    it('should handle insecure connections when allowed', async () => {
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        allowInsecureConnections: true
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET',
          rejectUnauthorized: false
        })
      )

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
    })

    it('should reject unauthorized certificates by default', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET',
          rejectUnauthorized: true
        })
      )
    })
  })

  describe('timeout settings', () => {
    it('should apply timeout settings', async () => {
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        defaultTimeout: 60
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET',
          headersTimeout: 60000,
          bodyTimeout: 60000
        })
      )

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
    })

    it('should not set timeout when defaultTimeout is 0', async () => {
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        defaultTimeout: 0
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      const call = mockUndiciRequest.mock.calls[0]
      const options = call[1]

      expect(options).not.toHaveProperty('headersTimeout')
      expect(options).not.toHaveProperty('bodyTimeout')

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
    })
  })

  describe('variable resolver', () => {
    it('should resolve variables in request', async () => {
      const variableResolver = vi.fn((text: string) =>
        text.replace('{{baseUrl}}', 'https://api.example.com')
      )

      const requestWithVariables: ApiRequest = {
        ...mockApiRequest,
        url: '{{baseUrl}}/users'
      }

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(requestWithVariables, variableResolver)

      expect(variableResolver).toHaveBeenCalled()
      expect(mockUndiciRequest).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/users'),
        expect.any(Object)
      )
    })
  })

  describe('response processing errors', () => {
    it('should handle response processing errors', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockRejectedValue(new Error('Buffer read error'))
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Processing Error')
      expect(result.data.type).toBe('error')
    })
  })

  describe('redirect settings', () => {
    it('should apply redirect settings', async () => {
      const globalSettingsModule = await import('@renderer/stores/globalSettingsStore')
      const mockGetGlobalSettings = vi.mocked(globalSettingsModule.getGlobalSettings)
      mockGetGlobalSettings.mockReturnValue({
        ...DEFAULT_SETTINGS,
        defaultMaxRedirects: 10
      })

      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('{}').buffer)
        }
      }

      mockUndiciRequest.mockResolvedValue(mockResponse)

      await httpClient.executeRequest(mockApiRequest)

      expect(mockUndiciRequest).toHaveBeenCalledWith(
        'https://api.example.com/users?limit=10',
        expect.objectContaining({
          method: 'GET'
        })
      )

      // モックを元に戻す
      mockGetGlobalSettings.mockReturnValue(DEFAULT_SETTINGS)
    })
  })

  describe('error status mapping', () => {
    it('should map ENOTFOUND error correctly', async () => {
      const notFoundError = new Error('Host not found')
      ;(notFoundError as any).code = 'ENOTFOUND'

      mockUndiciRequest.mockRejectedValue(notFoundError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Host Not Found')
      expect(result.data.type).toBe('error')
    })

    it('should map ETIMEDOUT error correctly', async () => {
      const timeoutError = new Error('Connection timeout')
      ;(timeoutError as any).code = 'ETIMEDOUT'

      mockUndiciRequest.mockRejectedValue(timeoutError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Connection Timeout')
      expect(result.data.type).toBe('error')
    })

    it('should map ECONNRESET error correctly', async () => {
      const resetError = new Error('Connection reset')
      ;(resetError as any).code = 'ECONNRESET'

      mockUndiciRequest.mockRejectedValue(resetError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Connection Reset')
      expect(result.data.type).toBe('error')
    })

    it('should map UND_ERR_CONNECT_TIMEOUT error correctly', async () => {
      const connectTimeoutError = new Error('Connect timeout')
      ;(connectTimeoutError as any).code = 'UND_ERR_CONNECT_TIMEOUT'

      mockUndiciRequest.mockRejectedValue(connectTimeoutError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Connection Timeout')
      expect(result.data.type).toBe('error')
    })

    it('should map UND_ERR_BODY_TIMEOUT error correctly', async () => {
      const bodyTimeoutError = new Error('Body timeout')
      ;(bodyTimeoutError as any).code = 'UND_ERR_BODY_TIMEOUT'

      mockUndiciRequest.mockRejectedValue(bodyTimeoutError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Request Timeout')
      expect(result.data.type).toBe('error')
    })

    it('should use default error status for unknown errors', async () => {
      const unknownError = new Error('Unknown error')
      ;(unknownError as any).code = 'UNKNOWN_ERROR'

      mockUndiciRequest.mockRejectedValue(unknownError)

      const result = await httpClient.executeRequest(mockApiRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Network Error')
      expect(result.data.type).toBe('error')
    })
  })
})
