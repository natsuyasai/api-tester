import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileService } from './fileService'

// Fileオブジェクトのモック
class MockFile extends File {
  constructor(parts: BlobPart[], filename: string, properties?: FilePropertyBag) {
    super(parts, filename, properties)
  }
}

// FileReaderのモック
const mockFileReader = {
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  onload: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
  onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null,
  result: null as string | ArrayBuffer | null
}

// globalのFileReaderをモック
Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: vi.fn(() => mockFileReader)
})

describe('FileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFileReader.result = null
    mockFileReader.onload = null
    mockFileReader.onerror = null
  })

  describe('processFile', () => {
    it('should process file as base64', async () => {
      const fileContent = 'Hello, World!'
      const file = new MockFile([fileContent], 'test.txt', { type: 'text/plain' })

      // base64エンコードされた結果をシミュレート
      const base64Result = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='
      mockFileReader.result = base64Result

      // processFileを非同期で実行
      const processPromise = FileService.processFile(file, 'base64')

      // FileReaderのonloadを実行してPromiseを解決
      if (mockFileReader.onload) {
        mockFileReader.onload.call(
          mockFileReader as unknown as FileReader,
          {} as ProgressEvent<FileReader>
        )
      }

      const result = await processPromise

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file)
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==') // base64部分のみ
    })

    it('should process file as binary/text', async () => {
      const fileContent = 'Hello, World!'
      const file = new MockFile([fileContent], 'test.txt', { type: 'text/plain' })

      mockFileReader.result = fileContent

      const processPromise = FileService.processFile(file, 'binary')

      if (mockFileReader.onload) {
        mockFileReader.onload.call(
          mockFileReader as unknown as FileReader,
          {} as ProgressEvent<FileReader>
        )
      }

      const result = await processPromise

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file)
      expect(result).toBe(fileContent)
    })

    it('should handle file read error', async () => {
      const file = new MockFile(['test'], 'test.txt', { type: 'text/plain' })

      const processPromise = FileService.processFile(file, 'base64')

      // エラーを発生させる
      if (mockFileReader.onerror) {
        mockFileReader.onerror.call(
          mockFileReader as unknown as FileReader,
          {} as ProgressEvent<FileReader>
        )
      }

      await expect(processPromise).rejects.toThrow('ファイルの読み取り中にエラーが発生しました')
    })

    it('should handle null result', async () => {
      const file = new MockFile(['test'], 'test.txt', { type: 'text/plain' })

      mockFileReader.result = null

      const processPromise = FileService.processFile(file, 'base64')

      if (mockFileReader.onload) {
        mockFileReader.onload.call(
          mockFileReader as unknown as FileReader,
          {} as ProgressEvent<FileReader>
        )
      }

      await expect(processPromise).rejects.toThrow('ファイルの読み取りに失敗しました')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(FileService.formatFileSize(0)).toBe('0 B')
      expect(FileService.formatFileSize(1024)).toBe('1 KB')
      expect(FileService.formatFileSize(1536)).toBe('1.5 KB')
      expect(FileService.formatFileSize(1048576)).toBe('1 MB')
      expect(FileService.formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle decimal places', () => {
      expect(FileService.formatFileSize(1234)).toBe('1.21 KB')
      expect(FileService.formatFileSize(1234567)).toBe('1.18 MB')
    })
  })

  describe('isFileTypeAllowed', () => {
    const textFile = new MockFile(['test'], 'test.txt', { type: 'text/plain' })
    const imageFile = new MockFile(['test'], 'test.jpg', { type: 'image/jpeg' })

    it('should allow all types when no restrictions', () => {
      expect(FileService.isFileTypeAllowed(textFile)).toBe(true)
      expect(FileService.isFileTypeAllowed(imageFile)).toBe(true)
      expect(FileService.isFileTypeAllowed(textFile, [])).toBe(true)
    })

    it('should check exact MIME type match', () => {
      expect(FileService.isFileTypeAllowed(textFile, ['text/plain'])).toBe(true)
      expect(FileService.isFileTypeAllowed(textFile, ['image/jpeg'])).toBe(false)
    })

    it('should handle wildcard types', () => {
      expect(FileService.isFileTypeAllowed(textFile, ['text/*'])).toBe(true)
      expect(FileService.isFileTypeAllowed(imageFile, ['image/*'])).toBe(true)
      expect(FileService.isFileTypeAllowed(textFile, ['image/*'])).toBe(false)
    })

    it('should check multiple allowed types', () => {
      expect(FileService.isFileTypeAllowed(textFile, ['text/plain', 'image/jpeg'])).toBe(true)
      expect(FileService.isFileTypeAllowed(imageFile, ['text/plain', 'image/jpeg'])).toBe(true)
      expect(FileService.isFileTypeAllowed(textFile, ['image/png', 'video/mp4'])).toBe(false)
    })
  })

  describe('isFileSizeAllowed', () => {
    it('should allow all sizes when no limit', () => {
      const largeFile = new MockFile([new ArrayBuffer(10 * 1024 * 1024)], 'large.bin')
      expect(FileService.isFileSizeAllowed(largeFile)).toBe(true)
    })

    it('should check file size against limit', () => {
      const smallFile = new MockFile([new ArrayBuffer(1024)], 'small.txt') // 1KB
      const largeFile = new MockFile([new ArrayBuffer(2 * 1024 * 1024)], 'large.bin') // 2MB

      expect(FileService.isFileSizeAllowed(smallFile, 1)).toBe(true) // 1MB limit
      expect(FileService.isFileSizeAllowed(largeFile, 1)).toBe(false) // 1MB limit
      expect(FileService.isFileSizeAllowed(largeFile, 5)).toBe(true) // 5MB limit
    })

    it('should handle exact size limits', () => {
      const file = new MockFile([new ArrayBuffer(1024 * 1024)], 'test.bin') // exactly 1MB
      expect(FileService.isFileSizeAllowed(file, 1)).toBe(true)
    })
  })
})
