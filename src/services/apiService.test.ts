import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiRequest } from '@/types/types'
import { ApiService } from './apiService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeRequest', () => {
    const basicRequest: ApiRequest = {
      id: 'test-1',
      name: 'Test Request',
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer token', enabled: false }
      ],
      params: [
        { key: 'limit', value: '10', enabled: true },
        { key: 'offset', value: '0', enabled: false }
      ],
      body: '',
      bodyType: 'json',
      type: 'rest'
    }

    it('should execute a GET request successfully', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ users: [] })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(basicRequest)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', {
        method: 'GET',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: undefined
      })

      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
      expect(result.data).toEqual({ users: [] })
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeDefined()
    })

    it('should execute a POST request with body', async () => {
      const postRequest: ApiRequest = {
        ...basicRequest,
        method: 'POST',
        body: '{"name": "John Doe"}',
        bodyType: 'json'
      }

      const mockResponse = {
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ id: 1, name: 'John Doe' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(postRequest)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: '{"name": "John Doe"}'
      })

      expect(result.status).toBe(201)
      expect(result.data).toEqual({ id: 1, name: 'John Doe' })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await ApiService.executeRequest(basicRequest)

      expect(result.status).toBe(0)
      expect(result.statusText).toBe('Network Error')
      expect(result.data).toEqual({
        error: 'Network error',
        type: 'error'
      })
    })

    it('should filter enabled headers and params only', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('response')
      }
      mockFetch.mockResolvedValue(mockResponse)

      await ApiService.executeRequest(basicRequest)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', {
        method: 'GET',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: undefined
      })
    })

    it('should handle text responses', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue('Plain text response')
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(basicRequest)

      expect(result.data).toBe('Plain text response')
    })

    it('should handle binary responses', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(basicRequest)

      expect(result.data).toEqual({
        type: 'binary',
        size: 1024,
        contentType: 'application/octet-stream'
      })
    })
  })

  describe('validateRequest', () => {
    it('should return no errors for valid request', () => {
      const validRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const errors = ApiService.validateRequest(validRequest)
      expect(errors).toHaveLength(0)
    })

    it('should return error for missing URL', () => {
      const invalidRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: '',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const errors = ApiService.validateRequest(invalidRequest)
      expect(errors).toContain('URL is required')
    })

    it('should return error for invalid URL format', () => {
      const invalidRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'invalid-url',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const errors = ApiService.validateRequest(invalidRequest)
      expect(errors).toContain('Invalid URL format')
    })

    it('should return error for invalid JSON body', () => {
      const invalidRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com',
        method: 'POST',
        headers: [],
        params: [],
        body: '{ invalid json',
        bodyType: 'json',
        type: 'rest'
      }

      const errors = ApiService.validateRequest(invalidRequest)
      expect(errors).toContain('Invalid JSON in request body')
    })
  })

  describe('buildCurlCommand', () => {
    it('should build correct curl command for GET request', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        params: [{ key: 'limit', value: '10', enabled: true }],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const curlCommand = ApiService.buildCurlCommand(request)

      expect(curlCommand).toBe(
        'curl -X GET -H "Authorization: Bearer token" "https://api.example.com/users?limit=10"'
      )
    })

    it('should build correct curl command for POST request with body', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        params: [],
        body: '{"name": "John"}',
        bodyType: 'json',
        type: 'rest'
      }

      const curlCommand = ApiService.buildCurlCommand(request)

      expect(curlCommand).toBe(
        'curl -X POST -H "Content-Type: application/json" -d \'{"name": "John"}\' "https://api.example.com/users"'
      )
    })

    it('should build curl command for form-data request', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/upload',
        method: 'POST',
        headers: [],
        params: [],
        body: '',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John', enabled: true },
          { key: 'age', value: '25', enabled: true },
          {
            key: 'avatar',
            value: 'avatar.jpg',
            enabled: true,
            isFile: true,
            fileName: 'avatar.jpg'
          },
          { key: 'disabled', value: 'test', enabled: false }
        ],
        type: 'rest'
      }

      const curlCommand = ApiService.buildCurlCommand(request)

      expect(curlCommand).toBe(
        'curl -X POST -F "name=John" -F "age=25" -F "avatar=@avatar.jpg" "https://api.example.com/upload"'
      )
    })
  })

  describe('form-data requests', () => {
    it('should execute form-data request with FormData object', async () => {
      const formDataRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Upload',
        url: 'https://api.example.com/upload',
        method: 'POST',
        headers: [],
        params: [],
        body: '',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John', enabled: true },
          { key: 'age', value: '25', enabled: true }
        ],
        type: 'rest'
      }

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(formDataRequest)

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', {
        method: 'POST',
        headers: expect.any(Headers),
        body: expect.any(FormData)
      })

      expect(result.status).toBe(200)
    })
  })

  describe('validateRequest - form-data', () => {
    it('should return error for form-data with no enabled fields', () => {
      const invalidRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/upload',
        method: 'POST',
        headers: [],
        params: [],
        body: '',
        bodyType: 'form-data',
        bodyKeyValuePairs: [{ key: 'name', value: 'John', enabled: false }],
        type: 'rest'
      }

      const errors = ApiService.validateRequest(invalidRequest)
      expect(errors).toContain('At least one form field is required for form-data')
    })

    it('should return error for form-data with file field missing content', () => {
      const invalidRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/upload',
        method: 'POST',
        headers: [],
        params: [],
        body: '',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John', enabled: true },
          { key: 'file', value: '', enabled: true, isFile: true, fileName: 'test.txt' }
        ],
        type: 'rest'
      }

      const errors = ApiService.validateRequest(invalidRequest)
      expect(errors).toContain('File content is missing for field: file')
    })

    it('should validate form-data with valid fields', () => {
      const validRequest: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/upload',
        method: 'POST',
        headers: [],
        params: [],
        body: '',
        bodyType: 'form-data',
        bodyKeyValuePairs: [
          { key: 'name', value: 'John', enabled: true },
          {
            key: 'file',
            value: 'base64content',
            enabled: true,
            isFile: true,
            fileName: 'test.txt',
            fileContent: 'base64content'
          }
        ],
        type: 'rest'
      }

      const errors = ApiService.validateRequest(validRequest)
      expect(errors).toHaveLength(0)
    })
  })
})
