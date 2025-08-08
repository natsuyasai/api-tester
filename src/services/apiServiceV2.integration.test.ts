import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequest } from '@/types/types'
import { ApiServiceV2 } from './apiServiceV2'

// 実際の統合テスト（モックを最小限に抑制）
describe('ApiServiceV2 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRequest: ApiRequest = {
    id: 'test-request',
    name: 'Test Request',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET',
    headers: [],
    params: [],
    body: '',
    bodyType: 'json',
    type: 'rest'
  }

  describe('buildCurlCommand', () => {
    it('should generate valid curl command for GET request', () => {
      const curl = ApiServiceV2.buildCurlCommand(mockRequest)

      expect(curl).toContain('curl')
      expect(curl).toContain('-X GET')
      expect(curl).toContain(mockRequest.url)
    })

    it('should include headers in curl command', () => {
      const requestWithHeaders: ApiRequest = {
        ...mockRequest,
        headers: [
          { key: 'Authorization', value: 'Bearer token123', enabled: true },
          { key: 'Content-Type', value: 'application/json', enabled: true },
          { key: 'Disabled-Header', value: 'should-not-appear', enabled: false }
        ]
      }

      const curl = ApiServiceV2.buildCurlCommand(requestWithHeaders)

      expect(curl).toContain('-H "Authorization: Bearer token123"')
      expect(curl).toContain('-H "Content-Type: application/json"')
      expect(curl).not.toContain('Disabled-Header')
    })

    it('should include query parameters', () => {
      const requestWithParams: ApiRequest = {
        ...mockRequest,
        params: [
          { key: 'page', value: '1', enabled: true },
          { key: 'limit', value: '10', enabled: true },
          { key: 'disabled', value: 'ignore', enabled: false }
        ]
      }

      const curl = ApiServiceV2.buildCurlCommand(requestWithParams)

      expect(curl).toContain('page=1')
      expect(curl).toContain('limit=10')
      expect(curl).not.toContain('disabled=ignore')
    })

    it('should handle POST request with JSON body', () => {
      const postRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST',
        body: '{"title": "test", "body": "content"}'
      }

      const curl = ApiServiceV2.buildCurlCommand(postRequest)

      expect(curl).toContain('-X POST')
      expect(curl).toContain('-d \'{"title": "test", "body": "content"}\'')
    })

    it('should handle form-data body type', () => {
      const formRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John Doe', enabled: true },
          { key: 'email', value: 'john@example.com', enabled: true },
          { key: 'disabled', value: 'ignore', enabled: false }
        ]
      }

      const curl = ApiServiceV2.buildCurlCommand(formRequest)

      expect(curl).toContain('-F "name=John Doe"')
      expect(curl).toContain('-F "email=john@example.com"')
      expect(curl).not.toContain('disabled=ignore')
    })

    it('should handle urlencoded body type', () => {
      const urlEncodedRequest: ApiRequest = {
        ...mockRequest,
        method: 'POST',
        bodyType: 'x-www-form-urlencoded',
        bodyKeyValuePairs: [
          { key: 'username', value: 'testuser', enabled: true },
          { key: 'password', value: 'secret123', enabled: true }
        ]
      }

      const curl = ApiServiceV2.buildCurlCommand(urlEncodedRequest)

      expect(curl).toContain('-d "username=testuser&password=secret123"')
      expect(curl).toContain('-H "Content-Type: application/x-www-form-urlencoded"')
    })

    it('should resolve variables in curl command', () => {
      const requestWithVariables: ApiRequest = {
        ...mockRequest,
        url: 'https://{{host}}/api/{{endpoint}}',
        headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }]
      }

      const variableResolver = (text: string) =>
        text
          .replace('{{host}}', 'api.example.com')
          .replace('{{endpoint}}', 'users')
          .replace('{{token}}', 'abc123')

      const curl = ApiServiceV2.buildCurlCommand(requestWithVariables, variableResolver)

      expect(curl).toContain('https://api.example.com/api/users')
      expect(curl).toContain('Bearer abc123')
    })
  })

  describe('validateRequest', () => {
    it('should return no errors for valid request', () => {
      const errors = ApiServiceV2.validateRequest(mockRequest)

      expect(Array.isArray(errors)).toBe(true)
      expect(errors.length).toBe(0)
    })

    it('should return error for empty URL', () => {
      const invalidRequest: ApiRequest = {
        ...mockRequest,
        url: ''
      }

      const errors = ApiServiceV2.validateRequest(invalidRequest)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((error) => error.includes('URL'))).toBe(true)
    })

    it('should return error for invalid URL format', () => {
      const invalidRequest: ApiRequest = {
        ...mockRequest,
        url: 'not-a-valid-url'
      }

      const errors = ApiServiceV2.validateRequest(invalidRequest)

      expect(errors.length).toBeGreaterThan(0)
    })

    it('should validate authentication settings', () => {
      const requestWithInvalidAuth: ApiRequest = {
        ...mockRequest,
        auth: {
          type: 'basic',
          basic: {
            username: '',
            password: 'password'
          }
        }
      }

      const errors = ApiServiceV2.validateRequest(requestWithInvalidAuth)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((error) => error.includes('ユーザー名'))).toBe(true)
    })
  })

  describe('healthCheck', () => {
    it('should check if URL is reachable', async () => {
      // JSONPlaceholderを使用した実際のヘルスチェック
      const result = await ApiServiceV2.healthCheck('https://jsonplaceholder.typicode.com/posts/1')

      expect(result).toBeDefined()
      expect(typeof result.isHealthy).toBe('boolean')
      expect(typeof result.responseTime).toBe('number')

      if (result.isHealthy) {
        expect(result.statusCode).toBe(200)
      }
    })

    it('should handle unreachable URLs', async () => {
      const result = await ApiServiceV2.healthCheck(
        'https://invalid-domain-that-does-not-exist.com'
      )

      expect(result.isHealthy).toBe(false)
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
    })
  })
})
