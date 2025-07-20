import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConfigStore } from './configStore'
import { useTabStore } from './tabStore'

// tabStoreをモック
vi.mock('./tabStore', () => ({
  useTabStore: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}))

const mockUseTabStore = vi.mocked(useTabStore)

describe('ConfigStore', () => {
  const mockTabs = [
    {
      id: 'tab-1',
      title: 'Test Tab 1',
      isActive: true,
      response: null,
      request: {
        id: 'req-1',
        name: 'Test Request 1',
        url: 'https://api.example.com/users',
        method: 'GET' as const,
        headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        params: [{ key: 'limit', value: '10', enabled: true }],
        body: '',
        bodyType: 'json' as const,
        type: 'rest' as const
      }
    },
    {
      id: 'tab-2',
      title: 'Test Tab 2',
      isActive: false,
      response: null,
      request: {
        id: 'req-2',
        name: 'Test Request 2',
        url: 'https://api.example.com/posts',
        method: 'POST' as const,
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        params: [],
        body: '{"title": "Test Post"}',
        bodyType: 'json' as const,
        type: 'rest' as const
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseTabStore.getState.mockReturnValue({
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

  describe('Export Configuration', () => {
    it('should export configuration as JSON', () => {
      const { exportConfig } = useConfigStore.getState()

      const config = exportConfig()
      const parsedConfig = JSON.parse(config)

      expect(parsedConfig).toEqual({
        tabs: [
          {
            title: 'Test Tab 1',
            request: mockTabs[0].request
          },
          {
            title: 'Test Tab 2',
            request: mockTabs[1].request
          }
        ],
        activeTabId: 'tab-1',
        version: '1.0'
      })
    })

    it('should export valid JSON format', () => {
      const { exportConfig } = useConfigStore.getState()

      const config = exportConfig()

      expect(() => JSON.parse(config)).not.toThrow()
    })
  })

  describe('Import Configuration', () => {
    it('should import valid configuration', () => {
      const { importConfig } = useConfigStore.getState()

      const config = {
        tabs: [
          {
            title: 'Imported Tab',
            request: {
              name: 'Imported Request',
              url: 'https://imported.example.com',
              method: 'PUT',
              headers: [{ key: 'X-API-Key', value: 'test123', enabled: true }],
              params: [{ key: 'version', value: 'v2', enabled: true }],
              body: '{"data": "test"}',
              bodyType: 'json',
              type: 'rest'
            }
          }
        ],
        activeTabId: 'some-id',
        version: '1.0'
      }

      importConfig(JSON.stringify(config))

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            title: 'Imported Tab',
            isActive: true,
            request: expect.objectContaining({
              name: 'Imported Request',
              url: 'https://imported.example.com',
              method: 'PUT'
            })
          })
        ]),
        activeTabId: expect.any(String)
      })
    })

    it('should handle invalid JSON', () => {
      const { importConfig } = useConfigStore.getState()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        importConfig('invalid json')
      }).toThrow('Unexpected token')

      consoleSpy.mockRestore()
    })

    it('should handle invalid config format', () => {
      const { importConfig } = useConfigStore.getState()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        importConfig('{"tabs": "not an array"}')
      }).toThrow('Invalid config format')

      expect(() => {
        importConfig('{"no_tabs": []}')
      }).toThrow('Invalid config format')

      consoleSpy.mockRestore()
    })

    it('should assign default values for missing fields', () => {
      const { importConfig } = useConfigStore.getState()

      const config = {
        tabs: [
          {
            title: 'Minimal Tab',
            request: {
              url: 'https://minimal.example.com'
            }
          }
        ]
      }

      importConfig(JSON.stringify(config))

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            title: 'Minimal Tab',
            request: expect.objectContaining({
              url: 'https://minimal.example.com',
              method: 'GET',
              headers: [{ key: '', value: '', enabled: true }],
              params: [{ key: '', value: '', enabled: true }],
              body: '',
              bodyType: 'json',
              type: 'rest'
            })
          })
        ]),
        activeTabId: expect.any(String)
      })
    })

    it('should handle empty tabs array', () => {
      const { importConfig } = useConfigStore.getState()

      const config = {
        tabs: []
      }

      importConfig(JSON.stringify(config))

      // 空のタブ配列の場合は何もしない
      expect(mockUseTabStore.setState).not.toHaveBeenCalled()
    })

    it('should generate unique IDs for imported tabs', () => {
      const { importConfig } = useConfigStore.getState()

      const config = {
        tabs: [
          {
            title: 'Tab 1',
            request: { url: 'https://example1.com' }
          },
          {
            title: 'Tab 2',
            request: { url: 'https://example2.com' }
          }
        ]
      }

      importConfig(JSON.stringify(config))

      const setStateCall = mockUseTabStore.setState.mock.calls[0][0]
      const importedTabs = setStateCall.tabs

      expect(importedTabs[0].id).toBeDefined()
      expect(importedTabs[1].id).toBeDefined()
      expect(importedTabs[0].id).not.toBe(importedTabs[1].id)
      expect(importedTabs[0].request.id).toBeDefined()
      expect(importedTabs[1].request.id).toBeDefined()
      expect(importedTabs[0].request.id).not.toBe(importedTabs[1].request.id)
    })
  })

  describe('Reset Store', () => {
    it('should reset store', () => {
      const { resetStore } = useConfigStore.getState()

      resetStore()

      expect(mockUseTabStore.getState().resetTabs).toHaveBeenCalled()
    })
  })
})
