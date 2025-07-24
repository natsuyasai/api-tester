import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequest } from '@/types/types'
import { getGlobalSettings, GlobalSettings } from '@renderer/stores/globalSettingsStore'
import { RequestBuilder } from './requestBuilder'

// モック設定
vi.mock('@renderer/stores/globalSettingsStore')

const mockGlobalSettings: GlobalSettings = {
  defaultTimeout: 30000,
  defaultFollowRedirects: true,
  defaultMaxRedirects: 5,
  defaultValidateSSL: true,
  defaultUserAgent: 'API-Tester/1.0',
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
  
  // クライアント証明書設定
  clientCertificates: {
    enabled: false,
    certificates: []
  },
  
  autoSave: false,
  autoSaveInterval: 300,
  checkForUpdates: true
}

describe('RequestBuilder', () => {
  beforeEach(() => {
    vi.mocked(getGlobalSettings).mockReturnValue(mockGlobalSettings)
  })

  const mockRequest: ApiRequest = {
    id: 'test-request',
    name: 'Test Request',
    url: 'https://api.example.com/users',
    method: 'GET',
    headers: [
      { key: 'Authorization', value: 'Bearer token123', enabled: true },
      { key: 'X-Custom', value: 'custom-value', enabled: true },
      { key: 'Disabled', value: 'disabled-value', enabled: false }
    ],
    params: [
      { key: 'limit', value: '10', enabled: true },
      { key: 'offset', value: '0', enabled: true },
      { key: 'disabled', value: 'disabled-param', enabled: false }
    ],
    body: '{"name": "test"}',
    bodyType: 'json',
    type: 'rest'
  }

  describe('constructor', () => {
    it('should initialize with request and default variable resolver', () => {
      const builder = new RequestBuilder(mockRequest)
      expect(builder).toBeInstanceOf(RequestBuilder)
    })

    it('should initialize with custom variable resolver', () => {
      const customResolver = (text: string) => text.replace('{{var}}', 'value')
      const builder = new RequestBuilder(mockRequest, customResolver)
      expect(builder).toBeInstanceOf(RequestBuilder)
    })
  })

  describe('getRequestSettings', () => {
    it('should return global settings when request settings are not provided', () => {
      const builder = new RequestBuilder(mockRequest)
      const settings = builder.getRequestSettings()

      expect(settings).toEqual({
        timeout: 30000,
        followRedirects: true,
        maxRedirects: 5,
        validateSSL: true,
        userAgent: 'API-Tester/1.0'
      })
    })

    it('should return request settings when provided', () => {
      const requestWithSettings: ApiRequest = {
        ...mockRequest,
        settings: {
          timeout: 60000,
          followRedirects: false,
          maxRedirects: 10,
          validateSSL: false,
          userAgent: 'Custom-Agent/2.0'
        }
      }

      const builder = new RequestBuilder(requestWithSettings)
      const settings = builder.getRequestSettings()

      expect(settings).toEqual({
        timeout: 60000,
        followRedirects: false,
        maxRedirects: 10,
        validateSSL: false,
        userAgent: 'Custom-Agent/2.0'
      })
    })
  })

  describe('buildUrl', () => {
    it('should build URL with enabled parameters', () => {
      const builder = new RequestBuilder(mockRequest)
      const url = builder.buildUrl()

      expect(url.toString()).toBe('https://api.example.com/users?limit=10&offset=0')
    })

    it('should resolve variables in URL and parameters', () => {
      const requestWithVariables: ApiRequest = {
        ...mockRequest,
        url: 'https://{{host}}/users',
        params: [{ key: 'limit', value: '{{limit}}', enabled: true }]
      }

      const variableResolver = (text: string) =>
        text.replace('{{host}}', 'api.test.com').replace('{{limit}}', '20')

      const builder = new RequestBuilder(requestWithVariables, variableResolver)
      const url = builder.buildUrl()

      expect(url.toString()).toBe('https://api.test.com/users?limit=20')
    })

    it('should throw error for invalid URL', () => {
      const invalidRequest: ApiRequest = {
        ...mockRequest,
        url: 'invalid-url'
      }

      const builder = new RequestBuilder(invalidRequest)
      expect(() => builder.buildUrl()).toThrow()
    })
  })

  describe('buildHeaders', () => {
    it('should build headers with enabled headers only', () => {
      const builder = new RequestBuilder(mockRequest)
      const headers = builder.buildHeaders()

      expect(headers.get('Authorization')).toBe('Bearer token123')
      expect(headers.get('X-Custom')).toBe('custom-value')
      expect(headers.has('Disabled')).toBe(false)
    })

    it('should set Content-Type automatically for JSON body in POST request', () => {
      const postRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST'
      }
      const builder = new RequestBuilder(postRequest)
      const headers = builder.buildHeaders()

      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('should set User-Agent from settings', () => {
      const builder = new RequestBuilder(mockRequest)
      const headers = builder.buildHeaders()

      expect(headers.get('User-Agent')).toBe('API-Tester/1.0')
    })

    it('should not override existing Content-Type', () => {
      const requestWithContentType: ApiRequest = {
        ...mockRequest,
        headers: [{ key: 'Content-Type', value: 'application/custom', enabled: true }]
      }

      const builder = new RequestBuilder(requestWithContentType)
      const headers = builder.buildHeaders()

      expect(headers.get('Content-Type')).toBe('application/custom')
    })
  })

  describe('buildBody', () => {
    it('should return null for GET request', () => {
      const builder = new RequestBuilder(mockRequest)
      const body = builder.buildBody()

      expect(body).toBeNull()
    })

    it('should return body string for POST request', () => {
      const postRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST'
      }

      const builder = new RequestBuilder(postRequest)
      const body = builder.buildBody()

      expect(body).toBe('{"name": "test"}')
    })

    it('should build FormData for form-data body type', () => {
      const formDataRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John', enabled: true },
          { key: 'age', value: '25', enabled: true },
          { key: 'disabled', value: 'disabled-value', enabled: false }
        ]
      }

      const builder = new RequestBuilder(formDataRequest)
      const body = builder.buildBody()

      expect(body).toBeInstanceOf(FormData)
      const formData = body as FormData
      expect(formData.get('name')).toBe('John')
      expect(formData.get('age')).toBe('25')
      expect(formData.has('disabled')).toBe(false)
    })

    it('should build URL-encoded form data', () => {
      const urlEncodedRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST',
        bodyType: 'x-www-form-urlencoded',
        bodyKeyValuePairs: [
          { key: 'username', value: 'john', enabled: true },
          { key: 'password', value: 'secret', enabled: true }
        ]
      }

      const builder = new RequestBuilder(urlEncodedRequest)
      const body = builder.buildBody()

      expect(body).toBe('username=john&password=secret')
    })
  })

  describe('buildFetchOptions', () => {
    it('should build complete fetch options', () => {
      const postRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST'
      }

      const builder = new RequestBuilder(postRequest)
      const options = builder.buildFetchOptions()

      expect(options.method).toBe('POST')
      expect(options.headers).toBeInstanceOf(Headers)
      expect(options.body).toBe('{"name": "test"}')
      expect(options.redirect).toBe('follow')
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('validate', () => {
    it('should return no errors for valid request', () => {
      const builder = new RequestBuilder(mockRequest)
      const errors = builder.validate()

      expect(errors).toEqual([])
    })

    it('should return error for missing URL', () => {
      const invalidRequest: ApiRequest = {
        ...mockRequest,
        url: ''
      }

      const builder = new RequestBuilder(invalidRequest)
      const errors = builder.validate()

      expect(errors).toContain('URLは必須です')
    })

    it('should return error for invalid URL format', () => {
      const invalidRequest: ApiRequest = {
        ...mockRequest,
        url: 'invalid-url'
      }

      const builder = new RequestBuilder(invalidRequest)
      const errors = builder.validate()

      expect(errors).toContain('無効なURL形式です')
    })

    it('should validate authentication settings', () => {
      const requestWithAuth: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'basic',
          basic: {
            username: '',
            password: 'secret'
          }
        }
      }

      const builder = new RequestBuilder(requestWithAuth)
      const errors = builder.validate()

      expect(errors).toContain('Basic認証のユーザー名は必須です')
    })
  })

  describe('authentication handling', () => {
    it('should handle Basic authentication', () => {
      const requestWithBasicAuth: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'basic',
          basic: {
            username: 'user',
            password: 'pass'
          }
        }
      }

      const builder = new RequestBuilder(requestWithBasicAuth)
      const headers = builder.buildHeaders()

      const authHeader = headers.get('Authorization')
      expect(authHeader).toBe(`Basic ${btoa('user:pass')}`)
    })

    it('should handle Bearer token authentication', () => {
      const requestWithBearerAuth: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'bearer',
          bearer: {
            token: 'bearer-token-123'
          }
        }
      }

      const builder = new RequestBuilder(requestWithBearerAuth)
      const headers = builder.buildHeaders()

      expect(headers.get('Authorization')).toBe('Bearer bearer-token-123')
    })

    it('should handle API key in header', () => {
      const requestWithApiKey: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'api-key',
          apiKey: {
            key: 'X-API-Key',
            value: 'api-key-123',
            location: 'header'
          }
        }
      }

      const builder = new RequestBuilder(requestWithApiKey)
      const headers = builder.buildHeaders()

      expect(headers.get('X-API-Key')).toBe('api-key-123')
    })

    it('should handle API key in query', () => {
      const requestWithApiKey: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'api-key',
          apiKey: {
            key: 'api_key',
            value: 'api-key-123',
            location: 'query'
          }
        }
      }

      const builder = new RequestBuilder(requestWithApiKey)
      const url = builder.adjustUrlForApiKey(builder.buildUrl())

      expect(url.searchParams.get('api_key')).toBe('api-key-123')
    })
  })
})
