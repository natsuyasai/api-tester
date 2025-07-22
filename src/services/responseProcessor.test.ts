import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResponseProcessor } from './responseProcessor'

// グローバルなFileReaderのモック
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: null,
  onload: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null
}

// FileReader をモック
global.FileReader = vi.fn(() => mockFileReader) as any

describe('ResponseProcessor', () => {
  let mockResponse: Response
  const startTime = Date.now() - 1000 // 1秒前

  beforeEach(() => {
    vi.clearAllMocks()
    
    // デフォルトのResponseモック
    mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: vi.fn(),
      blob: vi.fn(),
      json: vi.fn()
    } as any

    // FileReaderのモックをリセット
    mockFileReader.readAsDataURL.mockClear()
    mockFileReader.result = null
    mockFileReader.onload = null
    mockFileReader.onerror = null
  })

  describe('processResponse', () => {
    it('should process successful JSON response', async () => {
      const jsonData = { users: [{ id: 1, name: 'John' }] }
      mockResponse.text.mockResolvedValue(JSON.stringify(jsonData))

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
      expect(result.headers).toEqual({ 'content-type': 'application/json' })
      expect(result.data).toMatchObject({
        type: 'json',
        data: jsonData
      })
      expect(result.duration).toBeGreaterThan(0)
      expect(result.timestamp).toBeDefined()
    })

    it('should process text response', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'text/plain' })
      mockResponse.text.mockResolvedValue('Hello World')

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'text',
        data: 'Hello World',
        contentType: 'text/plain'
      })
    })

    it('should process XML response', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'application/xml' })
      const xmlData = '<?xml version="1.0"?><root><item>value</item></root>'
      mockResponse.text.mockResolvedValue(xmlData)

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'text',
        data: xmlData,
        contentType: 'application/xml'
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      mockResponse.text.mockResolvedValue('invalid json {')

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'text',
        data: 'invalid json {',
        contentType: 'application/json'
      })
    })
  })

  describe('binary response processing', () => {
    it('should process image response', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'image/jpeg' })
      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' })
      mockResponse.blob.mockResolvedValue(mockBlob)

      // FileReaderの成功をシミュレート
      mockFileReader.readAsDataURL.mockImplementation(() => {
        mockFileReader.result = 'data:image/jpeg;base64,ZmFrZSBpbWFnZSBkYXRh'
        setTimeout(() => mockFileReader.onload?.({ target: mockFileReader }), 0)
      })

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'image',
        contentType: 'image/jpeg',
        isPreviewable: true
      })
    })

    it('should process document response', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'application/pdf' })
      const mockBlob = new Blob(['fake pdf data'], { type: 'application/pdf' })
      mockResponse.blob.mockResolvedValue(mockBlob)

      mockFileReader.readAsDataURL.mockImplementation(() => {
        mockFileReader.result = 'data:application/pdf;base64,ZmFrZSBwZGYgZGF0YQ=='
        setTimeout(() => mockFileReader.onload?.({ target: mockFileReader }), 0)
      })

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'document',
        contentType: 'application/pdf',
        isPreviewable: true
      })
    })

    it('should process audio/video response', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'audio/mpeg' })
      const mockBlob = new Blob(['fake audio data'], { type: 'audio/mpeg' })
      mockResponse.blob.mockResolvedValue(mockBlob)

      mockFileReader.readAsDataURL.mockImplementation(() => {
        mockFileReader.result = 'data:audio/mpeg;base64,ZmFrZSBhdWRpbyBkYXRh'
        setTimeout(() => mockFileReader.onload?.({ target: mockFileReader }), 0)
      })

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'audio',
        contentType: 'audio/mpeg',
        isPreviewable: true
      })
    })

    it('should handle empty blob', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'application/octet-stream' })
      const emptyBlob = new Blob([], { type: 'application/octet-stream' })
      mockResponse.blob.mockResolvedValue(emptyBlob)

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        size: 0,
        contentType: 'application/octet-stream',
        data: null,
        subType: 'other',
        isPreviewable: false
      })
    })

    it('should handle large binary files', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'application/zip' })
      // 大きなファイル（12MB）をシミュレート
      const largeBlob = {
        size: 12 * 1024 * 1024,
        type: 'application/zip'
      } as Blob
      mockResponse.blob.mockResolvedValue(largeBlob)

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'other',
        size: 12 * 1024 * 1024,
        contentType: 'application/zip',
        data: null,
        isPreviewable: false,
        notice: 'Large file - blob data preserved, base64 conversion skipped'
      })
    })
  })

  describe('error handling', () => {
    it('should handle blob processing errors', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'application/octet-stream' })
      mockResponse.blob.mockRejectedValue(new Error('Blob processing failed'))

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        contentType: 'application/octet-stream',
        data: null,
        size: 0
      })
    })

    it('should handle FileReader errors', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'image/png' })
      const mockBlob = new Blob(['image data'], { type: 'image/png' })
      mockResponse.blob.mockResolvedValue(mockBlob)

      mockFileReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => mockFileReader.onerror?.({ target: mockFileReader }), 0)
      })

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'binary',
        subType: 'image',
        data: null,
        isPreviewable: false,
        error: expect.any(String)
      })
    })

    it('should handle text processing errors', async () => {
      mockResponse.headers = new Headers({ 'content-type': 'text/plain' })
      mockResponse.text.mockRejectedValue(new Error('Text processing failed'))

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'error',
        error: 'Text processing failed',
        contentType: 'text/plain'
      })
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response for network error', () => {
      const error = new Error('Network error')
      const startTime = Date.now() - 500
      
      const errorResponse = ResponseProcessor.createErrorResponse(
        error, 
        startTime, 
        'https://api.example.com/test', 
        'GET'
      )

      expect(errorResponse.status).toBe(0)
      expect(errorResponse.statusText).toBe('Network Error')
      expect(errorResponse.headers).toEqual({})
      expect(errorResponse.data).toMatchObject({
        type: 'error',
        error: 'Network error',
        contentType: 'text/plain'
      })
      expect(errorResponse.duration).toBeGreaterThan(0)
    })

    it('should handle timeout error', () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'AbortError'
      
      const errorResponse = ResponseProcessor.createErrorResponse(
        timeoutError, 
        Date.now() - 1000, 
        'https://api.example.com/test', 
        'POST'
      )

      expect(errorResponse.statusText).toBe('Request Timeout')
    })

    it('should handle fetch error', () => {
      const fetchError = new Error('fetch failed')
      
      const errorResponse = ResponseProcessor.createErrorResponse(
        fetchError, 
        Date.now() - 800, 
        'https://api.example.com/test', 
        'PUT'
      )

      expect(errorResponse.statusText).toBe('Fetch Error')
    })
  })

  describe('response headers processing', () => {
    it('should convert Headers to object', async () => {
      const headers = new Headers({
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        'x-custom-header': 'custom-value'
      })
      
      mockResponse.headers = headers
      mockResponse.text.mockResolvedValue('{}')

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.headers).toEqual({
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        'x-custom-header': 'custom-value'
      })
    })
  })

  describe('duration calculation', () => {
    it('should calculate correct duration', async () => {
      const mockStartTime = Date.now() - 2000 // 2秒前
      mockResponse.text.mockResolvedValue('test')

      const processor = new ResponseProcessor(mockResponse, mockStartTime)
      const result = await processor.processResponse()

      expect(result.duration).toBeGreaterThanOrEqual(2000)
      expect(result.duration).toBeLessThan(3000) // 余裕を持たせる
    })
  })
})