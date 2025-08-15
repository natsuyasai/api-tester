import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
// import { YamlService } from '@renderer/services/yamlService' // モックで使用するため不要
import { TabCollectionManager } from '@renderer/services/tabCollectionManager'
import { YamlService } from '@renderer/services/yamlService'
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

vi.mock('@renderer/services/yamlService')

// YamlServiceのモック参照を取得
const mockYamlService = vi.mocked(YamlService)

vi.mock('@renderer/services/tabCollectionManager')

// TabCollectionManagerのモック参照を取得
const mockTabCollectionManager = vi.mocked(TabCollectionManager)

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

// showModalMessageBoxのデフォルトレスポンスを設定
mockShowModalMessageBox.mockResolvedValue({ response: 2 }) // デフォルトで「置き換え」を選択

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
    mockYamlService.exportToYaml.mockReset()
    mockYamlService.exportToYamlWithVariables.mockReset()
    mockYamlService.importFromYaml.mockReset()
    mockYamlService.importCollectionsFromYaml.mockReset()

    // 個別にモックをリセット（vi.mocked()の場合はmockClear()を使用）
    if (mockTabCollectionManager.importTabsWithMerge) {
      mockTabCollectionManager.importTabsWithMerge.mockClear()
    }
    if (mockTabCollectionManager.importTabsWithReplace) {
      mockTabCollectionManager.importTabsWithReplace.mockClear()
    }
    if (mockTabCollectionManager.importCollectionsWithMerge) {
      mockTabCollectionManager.importCollectionsWithMerge.mockClear()
    }
    if (mockTabCollectionManager.importCollectionsWithReplace) {
      mockTabCollectionManager.importCollectionsWithReplace.mockClear()
    }

    // dialogAPIのモックをリセットして、デフォルトレスポンスを再設定
    mockShowModalMessageBox.mockReset()
    mockShowModalMessageBox.mockResolvedValue({ response: 2 }) // デフォルトで「置き換え」を選択
    mockShowSaveDialog.mockReset()
    mockShowOpenDialog.mockReset()
    mockWriteFile.mockReset()
    mockReadFile.mockReset()
  })

  describe('exportYaml', () => {
    it('should export tabs to YAML', () => {
      const mockYamlOutput =
        'version: "1.0"\ncollections:\n  - name: API Collection\n    description: Exported collection with 1 requests\n    requests:\n      - name: Test Tab\n        method: GET\n        url: https://api.example.com'
      mockYamlService.exportToYamlWithVariables.mockReturnValue(mockYamlOutput)

      const { result } = renderHook(() => useYamlOperations())

      const yamlOutput = result.current.exportYaml()

      expect(mockYamlService.exportToYamlWithVariables).toHaveBeenCalledWith(mockTabs)
      expect(yamlOutput).toBe(mockYamlOutput)
    })
  })

  describe('importYaml', () => {
    it('should import YAML and call TabCollectionManager', async () => {
      // const yamlContent = 'tabs:\n  - title: Imported Tab'
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

      // v2形式のYAMLをモック
      const yamlV2Content = 'version: "2.0"\ncollections:\n  - name: Imported Collection'
      mockYamlService.importCollectionsFromYaml.mockReturnValue({
        collections: [
          {
            id: 'col-1',
            name: 'Imported Collection',
            description: '',
            requests: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        ],
        tabs: importedTabs
      })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.importYaml(yamlV2Content)
      })

      expect(mockYamlService.importCollectionsFromYaml).toHaveBeenCalledWith(yamlV2Content)
      expect(mockTabCollectionManager.importCollectionsWithReplace).toHaveBeenCalled()
    })

    it('should handle import errors', async () => {
      const yamlContent = 'invalid yaml content'
      const error = new Error('Invalid YAML')

      mockYamlService.importFromYaml.mockImplementation(() => {
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
      // v2形式のYAMLで空のコレクション
      const yamlV2Content = 'version: "2.0"\ncollections: []'
      mockYamlService.importCollectionsFromYaml.mockReturnValue({
        collections: [],
        tabs: []
      })

      const { result } = renderHook(() => useYamlOperations())

      await act(async () => {
        await result.current.importYaml(yamlV2Content)
      })

      // 空のコレクションの場合は何も処理されない（エラーダイアログが表示される）
      expect(mockTabCollectionManager.importCollectionsWithReplace).not.toHaveBeenCalled()
    })
  })

  describe('saveToFile', () => {
    it('should save YAML to file', async () => {
      const mockYamlOutput =
        "version: '1.0'\ncollections:\n  - name: API Collection\n    description: Exported collection with 1 requests\n    requests:\n      - name: Test Tab\n        method: GET\n        url: https://api.example.com"
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
      const mockYamlOutput = "version: '1.0'\ncollections:\n  - name: API Collection"
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
      // v2形式のYAMLとレスポンス
      const yamlContent = 'version: "2.0"\ncollections:\n  - name: Loaded Collection'
      const importedCollections = [
        {
          id: 'loaded-col-1',
          name: 'Loaded Collection',
          description: '',
          requests: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      ]
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
      mockYamlService.importCollectionsFromYaml.mockReturnValue({
        collections: importedCollections,
        tabs: importedTabs
      })

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
      expect(mockYamlService.importCollectionsFromYaml).toHaveBeenCalledWith(yamlContent)
      expect(mockTabCollectionManager.importCollectionsWithReplace).toHaveBeenCalled()
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
      expect(mockYamlService.importCollectionsFromYaml).not.toHaveBeenCalled()
    })
  })
})
