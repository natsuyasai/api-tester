import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResponseProcessor } from './responseProcessor'

// グローバルなFileReaderのモック
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: null as string | null,
  onload: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null
}

// FileReader をモック
global.FileReader = vi.fn(() => mockFileReader) as any

describe('ResponseProcessor', () => {
  let mockResponse: Response
  let mockText: ReturnType<typeof vi.fn>
  let mockBlob: ReturnType<typeof vi.fn>
  let mockJson: ReturnType<typeof vi.fn>
  const startTime = Date.now() - 1000 // 1秒前

  beforeEach(() => {
    vi.clearAllMocks()

    // モック関数を作成
    mockText = vi.fn()
    mockBlob = vi.fn()
    mockJson = vi.fn()

    // デフォルトのResponseモック（書き込み可能なheadersプロパティ）
    mockResponse = {
      status: 200,
      statusText: 'OK',
      text: mockText,
      blob: mockBlob,
      json: mockJson
    } as any

    // headersプロパティを書き込み可能として定義
    Object.defineProperty(mockResponse, 'headers', {
      value: new Headers({ 'content-type': 'application/json' }),
      writable: true,
      configurable: true
    })

    // FileReaderのモックをリセット
    mockFileReader.readAsDataURL.mockClear()
    mockFileReader.result = null
    mockFileReader.onload = null
    mockFileReader.onerror = null
  })

  describe('processResponse', () => {
    it('should process successful JSON response', async () => {
      const jsonData = { users: [{ id: 1, name: 'John' }] }
      mockText.mockResolvedValue(JSON.stringify(jsonData))

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'text/plain' }),
        writable: true,
        configurable: true
      })
      mockText.mockResolvedValue('Hello World')

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'text',
        data: 'Hello World',
        contentType: 'text/plain'
      })
    })

    it('should process XML response', async () => {
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'application/xml' }),
        writable: true,
        configurable: true
      })
      const xmlData = '<?xml version="1.0"?><root><item>value</item></root>'
      mockText.mockResolvedValue(xmlData)

      const processor = new ResponseProcessor(mockResponse, startTime)
      const result = await processor.processResponse()

      expect(result.data).toMatchObject({
        type: 'text',
        data: xmlData,
        contentType: 'application/xml'
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      mockText.mockResolvedValue('invalid json {')

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'image/jpeg' }),
        writable: true,
        configurable: true
      })
      const imageBlobData = new Blob(['fake image data'], { type: 'image/jpeg' })
      mockBlob.mockResolvedValue(imageBlobData)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'application/pdf' }),
        writable: true,
        configurable: true
      })
      const pdfBlobData = new Blob(['fake pdf data'], { type: 'application/pdf' })
      mockBlob.mockResolvedValue(pdfBlobData)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'audio/mpeg' }),
        writable: true,
        configurable: true
      })
      const audioBlobData = new Blob(['fake audio data'], { type: 'audio/mpeg' })
      mockBlob.mockResolvedValue(audioBlobData)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'application/octet-stream' }),
        writable: true,
        configurable: true
      })
      const emptyBlob = new Blob([], { type: 'application/octet-stream' })
      mockBlob.mockResolvedValue(emptyBlob)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'application/zip' }),
        writable: true,
        configurable: true
      })
      // 大きなファイル（12MB）をシミュレート
      const largeBlob = {
        size: 12 * 1024 * 1024,
        type: 'application/zip'
      } as Blob
      mockBlob.mockResolvedValue(largeBlob)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'application/octet-stream' }),
        writable: true,
        configurable: true
      })
      mockBlob.mockRejectedValue(new Error('Blob processing failed'))

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'image/png' }),
        writable: true,
        configurable: true
      })
      const imageBlobData = new Blob(['image data'], { type: 'image/png' })
      mockBlob.mockResolvedValue(imageBlobData)

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
      Object.defineProperty(mockResponse, 'headers', {
        value: new Headers({ 'content-type': 'text/plain' }),
        writable: true,
        configurable: true
      })
      mockText.mockRejectedValue(new Error('Text processing failed'))

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

      const errorResponse = ResponseProcessor.createErrorResponse(error, startTime)

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

      const errorResponse = ResponseProcessor.createErrorResponse(timeoutError, Date.now() - 1000)

      expect(errorResponse.statusText).toBe('Request Timeout')
    })

    it('should handle fetch error', () => {
      const fetchError = new Error('fetch failed')

      const errorResponse = ResponseProcessor.createErrorResponse(fetchError, Date.now() - 800)

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

      Object.defineProperty(mockResponse, 'headers', {
        value: headers,
        writable: true,
        configurable: true
      })
      mockText.mockResolvedValue('{}')

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
      mockText.mockResolvedValue('test')

      const processor = new ResponseProcessor(mockResponse, mockStartTime)
      const result = await processor.processResponse()

      expect(result.duration).toBeGreaterThanOrEqual(2000)
      expect(result.duration).toBeLessThan(3000) // 余裕を持たせる
    })
  })
})
