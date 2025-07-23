import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YamlService } from '@renderer/services/yamlService'
import { useTabStore } from '@renderer/stores/tabStore'
import { useYamlOperations } from './useYamlOperations'

// モジュールをモック
const mockSetState = vi.fn()
vi.mock('@renderer/stores/tabStore', () => ({
  useTabStore: vi.fn(() => ({
    tabs: [],
    activeTabId: '',
    addTab: vi.fn(),
    closeTab: vi.fn(),
    setActiveTab: vi.fn(),
    updateTabTitle: vi.fn(),
    getActiveTab: vi.fn(),
    getTab: vi.fn(),
    resetTabs: vi.fn()
  })),
  __esModule: true
}))

// useTabStore.setStateを別途モック
Object.defineProperty(useTabStore, 'setState', {
  value: mockSetState,
  writable: true
})

vi.mock('@/services/yamlService', () => ({
  YamlService: {
    exportToYaml: vi.fn(),
    importFromYaml: vi.fn()
  }
}))

// グローバルのwindowオブジェクトをモック
const mockShowSaveDialog = vi.fn()
const mockShowOpenDialog = vi.fn()
const mockWriteFile = vi.fn()
const mockReadFile = vi.fn()

Object.defineProperty(window, 'dialogAPI', {
  value: {
    showSaveDialog: mockShowSaveDialog,
    showOpenDialog: mockShowOpenDialog
  }
})

Object.defineProperty(window, 'fileAPI', {
  value: {
    writeFile: mockWriteFile,
    readFile: mockReadFile
  }
})

const mockUseTabStore = vi.mocked(useTabStore)
const mockYamlService = vi.mocked(YamlService)

describe('useYamlOperations', () => {
  const mockTabs = [
    {
      id: 'tab-1',
      title: 'Test Tab',
      isActive: true,
      response: null,
      request: {
        id: 'req-1',
        name: 'Test Request',
        url: 'https://api.example.com',
        method: 'GET' as const,
        headers: [{ key: '', value: '', enabled: true }],
        params: [{ key: '', value: '', enabled: true }],
        body: '',
        bodyType: 'json' as const,
        type: 'rest' as const
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseTabStore.mockReturnValue({
      tabs: mockTabs,
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      setActiveTab: vi.fn(),
      updateTabTitle: vi.fn(),
      getActiveTab: vi.fn(),
      getTab: vi.fn(),
      resetTabs: vi.fn()
    })
  })

  describe('exportYaml', () => {
    it('should export tabs to YAML', () => {
      const mockYamlOutput =
        'tabs:\n  - title: Test Tab\n    request:\n      url: https://api.example.com'
      mockYamlService.exportToYaml.mockReturnValue(mockYamlOutput)

      const { result } = renderHook(() => useYamlOperations())

      const yamlOutput = result.current.exportYaml()

      expect(mockYamlService.exportToYaml).toHaveBeenCalledWith(mockTabs)
      expect(yamlOutput).toBe(mockYamlOutput)
    })
  })

  describe('importYaml', () => {
    it('should import YAML and update tab store', () => {
      const yamlContent = 'tabs:\n  - title: Imported Tab'
      const importedTabs = [
        {
          id: 'imported-1',
          title: 'Imported Tab',
          isActive: false,
          response: null,
          request: {
            id: 'imported-req-1',
            name: 'Imported Request',
            url: 'https://imported.example.com',
            method: 'GET' as const,
            headers: [{ key: '', value: '', enabled: true }],
            params: [{ key: '', value: '', enabled: true }],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          }
        }
      ]

      mockYamlService.importFromYaml.mockReturnValue(importedTabs)

      const { result } = renderHook(() => useYamlOperations())

      act(() => {
        result.current.importYaml(yamlContent)
      })

      expect(mockYamlService.importFromYaml).toHaveBeenCalledWith(yamlContent)
      expect(mockSetState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'imported-1',
            title: 'Imported Tab',
            isActive: true
          })
        ]),
        activeTabId: 'imported-1'
      })
    })

    it('should handle import errors', () => {
      const yamlContent = 'invalid yaml content'
      const error = new Error('Invalid YAML')

      mockYamlService.importFromYaml.mockImplementation(() => {
        throw error
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useYamlOperations())

      expect(() => {
        result.current.importYaml(yamlContent)
      }).toThrow('Invalid YAML')

      // エラーダイアログに置き換えたため、console.errorは呼ばれない
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle empty imported tabs', () => {
      const yamlContent = 'tabs: []'

      mockYamlService.importFromYaml.mockReturnValue([])

      const { result } = renderHook(() => useYamlOperations())

      act(() => {
        result.current.importYaml(yamlContent)
      })

      expect(mockSetState).not.toHaveBeenCalled()
    })
  })

  describe('saveToFile', () => {
    it('should save YAML to file', async () => {
      const mockYamlOutput = 'tabs:\n  - title: Test Tab'
      mockYamlService.exportToYaml.mockReturnValue(mockYamlOutput)
      mockShowSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/path/to/file.yaml'
      })
      mockWriteFile.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.saveToFile()
      })

      expect(mockShowSaveDialog).toHaveBeenCalledWith({
        title: 'Save API Collection',
        defaultPath: 'api-collection.yaml',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      expect(mockWriteFile).toHaveBeenCalledWith('/path/to/file.yaml', mockYamlOutput)
    })

    it('should handle save dialog cancellation', async () => {
      mockShowSaveDialog.mockResolvedValue({
        canceled: true,
        filePath: undefined
      })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.saveToFile()
      })

      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it('should handle file write errors', async () => {
      const mockYamlOutput = 'tabs:\n  - title: Test Tab'
      mockYamlService.exportToYaml.mockReturnValue(mockYamlOutput)
      mockShowSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/path/to/file.yaml'
      })
      mockWriteFile.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useYamlOperations())

      await expect(async () => {
        await act(async () => {
          await result.current.saveToFile()
        })
      }).rejects.toThrow('Permission denied')

      consoleSpy.mockRestore()
    })
  })

  describe('loadFromFile', () => {
    it('should load YAML from file', async () => {
      const yamlContent = 'tabs:\n  - title: Loaded Tab'
      const importedTabs = [
        {
          id: 'loaded-1',
          title: 'Loaded Tab',
          isActive: false,
          response: null,
          request: {
            id: 'loaded-req-1',
            name: 'Loaded Request',
            url: 'https://loaded.example.com',
            method: 'GET' as const,
            headers: [{ key: '', value: '', enabled: true }],
            params: [{ key: '', value: '', enabled: true }],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          }
        }
      ]

      mockShowOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/file.yaml']
      })
      mockReadFile.mockResolvedValue({
        success: true,
        data: yamlContent
      })
      mockYamlService.importFromYaml.mockReturnValue(importedTabs)

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.loadFromFile()
      })

      expect(mockShowOpenDialog).toHaveBeenCalledWith({
        title: 'Load API Collection',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.yaml')
      expect(mockYamlService.importFromYaml).toHaveBeenCalledWith(yamlContent)
    })

    it('should handle load dialog cancellation', async () => {
      mockShowOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.loadFromFile()
      })

      expect(mockReadFile).not.toHaveBeenCalled()
    })

    it('should handle file read errors', async () => {
      mockShowOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/file.yaml']
      })
      mockReadFile.mockResolvedValue({
        success: false,
        error: 'File not found'
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useYamlOperations())

      await expect(async () => {
        await act(async () => {
          await result.current.loadFromFile()
        })
      }).rejects.toThrow('File not found')

      consoleSpy.mockRestore()
    })

    it('should handle empty file content', async () => {
      mockShowOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/file.yaml']
      })
      mockReadFile.mockResolvedValue({
        success: true,
        data: null
      })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.loadFromFile()
      })

      expect(mockYamlService.importFromYaml).not.toHaveBeenCalled()
    })
  })
})
