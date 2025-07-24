import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
// import { YamlService } from '@renderer/services/yamlService' // モックで使用するため不要
import { useTabStore } from '@renderer/stores/tabStore'
import { useYamlOperations } from './useYamlOperations'

// モジュールをモック
const mockSetState = vi.fn()
const mockStore = {
  tabs: [] as any[],
  activeTabId: '',
  addTab: vi.fn(),
  closeTab: vi.fn(),
  setActiveTab: vi.fn(),
  updateTabTitle: vi.fn(),
  getActiveTab: vi.fn(),
  getTab: vi.fn(),
  resetTabs: vi.fn()
}

vi.mock('@renderer/stores/tabStore', () => ({
  useTabStore: vi.fn(() => mockStore),
  __esModule: true
}))

// useTabStore.setStateを別途モック
const mockUseTabStoreWithSetState = Object.assign(
  vi.fn(() => mockStore),
  {
    setState: mockSetState,
    getState: vi.fn(() => mockStore)
  }
)

vi.mocked(useTabStore).mockImplementation(mockUseTabStoreWithSetState)

// useCollectionStoreのモック
const mockCollectionStore = {
  collections: [],
  activeCollectionId: null
}

vi.mock('@renderer/stores/collectionStore', () => ({
  useCollectionStore: {
    getState: vi.fn(() => mockCollectionStore)
  }
}))

const mockYamlServiceMethods = {
  exportToYaml: vi.fn(),
  importFromYaml: vi.fn(),
  importCollectionsFromYaml: vi.fn()
}

vi.mock('@/services/yamlService', () => ({
  YamlService: mockYamlServiceMethods
}))

// TabCollectionManagerのモック
const mockTabCollectionManager = {
  importTabsWithMerge: vi.fn(),
  importTabsWithReplace: vi.fn(),
  importCollectionsWithMerge: vi.fn(),
  importCollectionsWithReplace: vi.fn()
}

vi.mock('@renderer/services/tabCollectionManager', () => ({
  TabCollectionManager: mockTabCollectionManager
}))

// グローバルのwindowオブジェクトをモック
const mockShowSaveDialog = vi.fn()
const mockShowOpenDialog = vi.fn()
const mockWriteFile = vi.fn()
const mockReadFile = vi.fn()
const mockShowModalMessageBox = vi.fn()

Object.defineProperty(window, 'dialogAPI', {
  value: {
    showSaveDialog: mockShowSaveDialog,
    showOpenDialog: mockShowOpenDialog,
    showModalMessageBox: mockShowModalMessageBox
  }
})

Object.defineProperty(window, 'fileAPI', {
  value: {
    writeFile: mockWriteFile,
    readFile: mockReadFile
  }
})

Object.defineProperty(window, 'alert', {
  value: vi.fn()
})

// const mockYamlService = vi.mocked(YamlService) // 削除

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

    // モックストアの状態を更新
    mockStore.tabs = mockTabs
    mockStore.activeTabId = 'tab-1'

    // getStateモックも更新
    mockUseTabStoreWithSetState.getState.mockReturnValue(mockStore)

    // YamlServiceのモックをリセット
    mockYamlServiceMethods.exportToYaml.mockReset()
    mockYamlServiceMethods.importFromYaml.mockReset()

    // TabCollectionManagerのモックをリセット
    Object.values(mockTabCollectionManager).forEach((mock) => mock.mockReset())

    // dialogAPIのモックをリセット
    mockShowModalMessageBox.mockReset()
    mockShowSaveDialog.mockReset()
    mockShowOpenDialog.mockReset()
    mockWriteFile.mockReset()
    mockReadFile.mockReset()
  })

  describe('exportYaml', () => {
    it('should export tabs to YAML', () => {
      const mockYamlOutput =
        'tabs:\n  - title: Test Tab\n    request:\n      url: https://api.example.com'
      mockYamlServiceMethods.exportToYaml.mockReturnValue(mockYamlOutput)

      const { result } = renderHook(() => useYamlOperations())

      const yamlOutput = result.current.exportYaml()

      expect(mockYamlServiceMethods.exportToYaml).toHaveBeenCalledWith(mockTabs)
      expect(yamlOutput).toBe(mockYamlOutput)
    })
  })

  describe('importYaml', () => {
    it('should import YAML and call TabCollectionManager', async () => {
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

      mockYamlServiceMethods.importFromYaml.mockReturnValue(importedTabs)

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.importYaml(yamlContent)
      })

      expect(mockYamlServiceMethods.importFromYaml).toHaveBeenCalledWith(yamlContent)
      expect(mockTabCollectionManager.importTabsWithReplace).toHaveBeenCalledWith(importedTabs)
    })

    it('should handle import errors', async () => {
      const yamlContent = 'invalid yaml content'
      const error = new Error('Invalid YAML')

      mockYamlServiceMethods.importFromYaml.mockImplementation(() => {
        throw error
      })

      const { result } = renderHook(() => useYamlOperations())

      await expect(
        act(async () => {
          await result.current.importYaml(yamlContent)
        })
      ).rejects.toThrow('Invalid YAML')
    })

    it('should handle empty imported tabs', async () => {
      const yamlContent = 'tabs: []'

      mockYamlServiceMethods.importFromYaml.mockReturnValue([])

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.importYaml(yamlContent)
      })

      // 空のタブの場合は何も処理されない（エラーダイアログが表示される）
      expect(mockTabCollectionManager.importTabsWithReplace).not.toHaveBeenCalled()
    })
  })

  describe('saveToFile', () => {
    it('should save YAML to file', async () => {
      const mockYamlOutput =
        'version: "1.0"\ncollections:\n  - name: API Collection\n    requests:\n      - name: Test Tab'
      mockYamlServiceMethods.exportToYaml.mockReturnValue(mockYamlOutput)
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
      const mockYamlOutput = 'version: "1.0"\ncollections:\n  - name: API Collection'
      mockYamlServiceMethods.exportToYaml.mockReturnValue(mockYamlOutput)
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
      mockYamlServiceMethods.importFromYaml.mockReturnValue(importedTabs)

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
      expect(mockYamlServiceMethods.importFromYaml).toHaveBeenCalledWith(yamlContent)
      expect(mockTabCollectionManager.importTabsWithReplace).toHaveBeenCalledWith(importedTabs)
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

      expect(mockYamlServiceMethods.importFromYaml).not.toHaveBeenCalled()
    })
  })
})
