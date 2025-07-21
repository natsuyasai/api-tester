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

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', expect.objectContaining({
        method: 'GET',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: undefined,
        redirect: 'follow'
      }))

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

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', expect.objectContaining({
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: '{"name": "John Doe"}',
        redirect: 'follow'
      }))

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

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?limit=10', expect.objectContaining({
        method: 'GET',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: undefined,
        redirect: 'follow'
      }))
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
      const mockBlob = new Blob(['test binary data'], { type: 'application/octet-stream' })
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        blob: vi.fn().mockResolvedValue(mockBlob),
        body: {} // ReadableStream mock
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await ApiService.executeRequest(basicRequest)

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'other',
        size: expect.any(Number),
        contentType: 'application/octet-stream',
        data: expect.any(String),
        dataUrl: null,
        originalBlob: expect.any(Blob),
        isPreviewable: false
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

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/upload', expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: expect.any(FormData),
        redirect: 'follow'
      }))

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

  describe('Authentication', () => {
    it('should apply Basic authentication to headers', async () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'basic',
          basic: {
            username: 'testuser',
            password: 'testpass'
          }
        },
        type: 'rest'
      }

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await ApiService.executeRequest(request)

      const expectedAuth = btoa('testuser:testpass')
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
        body: undefined,
        redirect: 'follow'
      }))

      // ヘッダーにAuthorizationが設定されていることを確認
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe(`Basic ${expectedAuth}`)
    })

    it('should apply Bearer token authentication to headers', async () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'bearer',
          bearer: {
            token: 'test-token-123'
          }
        },
        type: 'rest'
      }

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await ApiService.executeRequest(request)

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer test-token-123')
    })

    it('should apply API Key authentication to headers', async () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'api-key',
          apiKey: {
            key: 'X-API-Key',
            value: 'secret-key-123',
            location: 'header'
          }
        },
        type: 'rest'
      }

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await ApiService.executeRequest(request)

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('X-API-Key')).toBe('secret-key-123')
    })

    it('should apply API Key authentication to query parameters', async () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'api-key',
          apiKey: {
            key: 'api_key',
            value: 'secret-key-123',
            location: 'query'
          }
        },
        type: 'rest'
      }

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await ApiService.executeRequest(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test?api_key=secret-key-123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
          body: undefined,
          redirect: 'follow'
        })
      )
    })

    it('should build curl command with Basic authentication', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'basic',
          basic: {
            username: 'testuser',
            password: 'testpass'
          }
        },
        type: 'rest'
      }

      const curlCommand = ApiService.buildCurlCommand(request)

      expect(curlCommand).toBe('curl -X GET -u "testuser:testpass" "https://api.example.com/test"')
    })

    it('should build curl command with Bearer token', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        auth: {
          type: 'bearer',
          bearer: {
            token: 'test-token-123'
          }
        },
        type: 'rest'
      }

      const curlCommand = ApiService.buildCurlCommand(request)

      expect(curlCommand).toBe(
        'curl -X GET -H "Authorization: Bearer test-token-123" "https://api.example.com/test"'
      )
    })
  })

  describe('Binary Response Processing', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should process image response as base64', async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71]) // PNG header
      const mockBlob = new Blob([mockImageData], { type: 'image/png' })

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'image/png'
        }),
        blob: vi.fn().mockResolvedValue(mockBlob),
        body: {} // ReadableStream mock
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      // FileReader mock
      const mockFileReader = {
        readAsDataURL: vi.fn().mockImplementation(() => {
          setTimeout(() => {
            if (mockFileReader.onload) {
              mockFileReader.onload({ target: { result: 'data:image/png;base64,iVBORw0KGgo=' } } as any)
            }
          }, 0)
        }),
        result: 'data:image/png;base64,iVBORw0KGgo=',
        onload: null as any,
        onerror: null as any
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/image.png',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'image',
        contentType: 'image/png',
        data: expect.any(String),
        dataUrl: expect.any(String),
        originalBlob: expect.any(Blob),
        isPreviewable: true
      })
    })

    it('should process PDF response as base64', async () => {
      const mockPdfData = new Uint8Array([37, 80, 68, 70]) // PDF header
      const mockBlob = new Blob([mockPdfData], { type: 'application/pdf' })

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/pdf'
        }),
        blob: vi.fn().mockResolvedValue(mockBlob),
        body: {} // ReadableStream mock
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      const mockFileReader = {
        readAsDataURL: vi.fn().mockImplementation(() => {
          setTimeout(() => {
            if (mockFileReader.onload) {
              mockFileReader.onload({ target: { result: 'data:application/pdf;base64,JVBERi0=' } } as any)
            }
          }, 0)
        }),
        result: 'data:application/pdf;base64,JVBERi0=',
        onload: null as any,
        onerror: null as any
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/document.pdf',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'document',
        contentType: 'application/pdf',
        data: expect.any(String),
        dataUrl: expect.any(String),
        originalBlob: expect.any(Blob),
        isPreviewable: true
      })
    })

    it('should handle large binary files without base64 conversion', async () => {
      // 2MB のモックデータ
      const largeData = new Uint8Array(2 * 1024 * 1024)
      const mockBlob = new Blob([largeData], { type: 'application/octet-stream' })

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/octet-stream'
        }),
        blob: vi.fn().mockResolvedValue(mockBlob),
        body: {} // ReadableStream mock
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/largefile.bin',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'other',
        contentType: 'application/octet-stream',
        size: 2 * 1024 * 1024,
        data: null, // 大きなファイルはBase64変換しない
        dataUrl: null,
        originalBlob: expect.any(Blob),
        isPreviewable: false,
        notice: 'Large file - blob data preserved, base64 conversion skipped'
      })
    })

    it('should handle audio response', async () => {
      const mockAudioData = new Uint8Array([73, 68, 51]) // MP3 header
      const mockBlob = new Blob([mockAudioData], { type: 'audio/mpeg' })

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'audio/mpeg'
        }),
        blob: vi.fn().mockResolvedValue(mockBlob),
        body: {} // ReadableStream mock
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      const mockFileReader = {
        readAsDataURL: vi.fn().mockImplementation(() => {
          setTimeout(() => {
            if (mockFileReader.onload) {
              mockFileReader.onload({ target: { result: 'data:audio/mpeg;base64,SUQz' } } as any)
            }
          }, 0)
        }),
        result: 'data:audio/mpeg;base64,SUQz',
        onload: null as any,
        onerror: null as any
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/audio.mp3',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'audio',
        contentType: 'audio/mpeg',
        data: expect.any(String),
        dataUrl: expect.any(String),
        originalBlob: expect.any(Blob),
        isPreviewable: true
      })
    })

    it('should handle empty binary response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/octet-stream'
        }),
        blob: vi.fn().mockResolvedValue(new Blob([])),
        body: null // No body
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/empty',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        size: 0,
        contentType: 'application/octet-stream',
        data: null
      })
    })

    it('should handle binary response processing errors gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/octet-stream'
        }),
        blob: vi.fn().mockRejectedValue(new Error('Blob processing failed')),
        body: {} // ReadableStream mock
      }

      mockFetch.mockResolvedValue(mockResponse as any)

      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test Request',
        url: 'https://api.example.com/error',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }

      const result = await ApiService.executeRequest(request)

      expect(result.status).toBe(200)
      expect(result.data).toMatchObject({
        type: 'binary',
        size: 0,
        contentType: 'application/octet-stream',
        data: null,
        error: 'Blob processing failed'
      })
    })
  })
})
