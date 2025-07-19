import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApiStore } from './apiStore'
import { ApiResponse } from '@/types/types'

// UUID をモック
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid')
}))

describe('ApiStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useApiStore.getState().resetStore()
  })

  describe('Initial State', () => {
    it('should initialize with one tab', () => {
      const state = useApiStore.getState()
      
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].title).toBe('New Request')
      expect(state.tabs[0].isActive).toBe(true)
      expect(state.activeTabId).toBe('mocked-uuid')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Tab Management', () => {
    it('should add a new tab', () => {
      const store = useApiStore.getState()
      store.addTab()
      
      const state = useApiStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].isActive).toBe(true)
      expect(state.tabs[0].isActive).toBe(false)
      expect(state.activeTabId).toBe('mocked-uuid')
    })

    it('should set active tab', () => {
      const store = useApiStore.getState()
      store.addTab()
      
      const state1 = useApiStore.getState()
      const firstTabId = state1.tabs[0].id
      store.setActiveTab(firstTabId)
      
      const state = useApiStore.getState()
      expect(state.activeTabId).toBe(firstTabId)
      expect(state.tabs[0].isActive).toBe(true)
      expect(state.tabs[1].isActive).toBe(false)
    })

    it('should close a tab when multiple tabs exist', () => {
      const store = useApiStore.getState()
      store.addTab()
      
      const state1 = useApiStore.getState()
      const firstTabId = state1.tabs[0].id
      store.closeTab(firstTabId)
      
      const state = useApiStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].isActive).toBe(true)
    })

    it('should not close the last remaining tab', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.closeTab(tabId)
      
      const state = useApiStore.getState()
      expect(state.tabs).toHaveLength(1)
    })

    it('should update tab title', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateTabTitle(tabId, 'Updated Title')
      
      const state = useApiStore.getState()
      expect(state.tabs[0].title).toBe('Updated Title')
    })
  })

  describe('Request Management', () => {
    it('should update request URL', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateUrl(tabId, 'https://api.example.com')
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.url).toBe('https://api.example.com')
    })

    it('should update request method', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateMethod(tabId, 'POST')
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.method).toBe('POST')
    })

    it('should update request body', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateBody(tabId, '{"test": true}')
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.body).toBe('{"test": true}')
    })

    it('should update body type', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateBodyType(tabId, 'form-data')
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.bodyType).toBe('form-data')
    })
  })

  describe('Headers Management', () => {
    it('should add a new header', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.addHeader(tabId)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.headers).toHaveLength(2)
      expect(state.tabs[0].request.headers[1]).toEqual({
        key: '',
        value: '',
        enabled: true
      })
    })

    it('should update header', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateHeader(tabId, 0, { key: 'Authorization', value: 'Bearer token' })
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.headers[0].key).toBe('Authorization')
      expect(state.tabs[0].request.headers[0].value).toBe('Bearer token')
      expect(state.tabs[0].request.headers[0].enabled).toBe(true)
    })

    it('should remove header', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.addHeader(tabId)
      store.removeHeader(tabId, 0)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.headers).toHaveLength(1)
    })
  })

  describe('Parameters Management', () => {
    it('should add a new parameter', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.addParam(tabId)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.params).toHaveLength(2)
      expect(state.tabs[0].request.params[1]).toEqual({
        key: '',
        value: '',
        enabled: true
      })
    })

    it('should update parameter', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateParam(tabId, 0, { key: 'limit', value: '10' })
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.params[0].key).toBe('limit')
      expect(state.tabs[0].request.params[0].value).toBe('10')
      expect(state.tabs[0].request.params[0].enabled).toBe(true)
    })

    it('should remove parameter', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.addParam(tabId)
      store.removeParam(tabId, 0)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].request.params).toHaveLength(1)
    })
  })

  describe('Response Management', () => {
    it('should set response', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      const mockResponse: ApiResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' },
        duration: 150,
        timestamp: '2024-01-01T00:00:00.000Z'
      }
      
      store.setResponse(tabId, mockResponse)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].response).toEqual(mockResponse)
    })

    it('should clear response', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      const mockResponse: ApiResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        duration: 150,
        timestamp: '2024-01-01T00:00:00.000Z'
      }
      
      store.setResponse(tabId, mockResponse)
      store.clearResponse(tabId)
      
      const state = useApiStore.getState()
      expect(state.tabs[0].response).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('should set loading state', () => {
      const store = useApiStore.getState()
      
      store.setLoading(true)
      
      expect(useApiStore.getState().isLoading).toBe(true)
      
      store.setLoading(false)
      
      expect(useApiStore.getState().isLoading).toBe(false)
    })
  })

  describe('Data Import/Export', () => {
    it('should export configuration', () => {
      const store = useApiStore.getState()
      const tabId = store.tabs[0].id
      
      store.updateUrl(tabId, 'https://api.example.com')
      store.updateMethod(tabId, 'POST')
      
      const config = store.exportConfig()
      const parsedConfig = JSON.parse(config)
      
      expect(parsedConfig.tabs).toHaveLength(1)
      expect(parsedConfig.tabs[0].request.url).toBe('https://api.example.com')
      expect(parsedConfig.tabs[0].request.method).toBe('POST')
      expect(parsedConfig.version).toBe('1.0')
    })

    it('should import configuration', () => {
      const store = useApiStore.getState()
      
      const importConfig = JSON.stringify({
        tabs: [
          {
            title: 'Imported Tab',
            request: {
              name: 'Imported Request',
              url: 'https://imported.example.com',
              method: 'PUT',
              headers: [],
              params: [],
              body: '',
              bodyType: 'json',
              type: 'rest'
            }
          }
        ],
        version: '1.0'
      })
      
      store.importConfig(importConfig)
      
      const state = useApiStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0].title).toBe('Imported Tab')
      expect(state.tabs[0].request.url).toBe('https://imported.example.com')
      expect(state.tabs[0].request.method).toBe('PUT')
    })

    it('should handle invalid import configuration', () => {
      const store = useApiStore.getState()
      
      expect(() => {
        store.importConfig('invalid json')
      }).toThrow()
      
      expect(() => {
        store.importConfig('{"tabs": "not an array"}')
      }).toThrow('Invalid config format')
    })
  })
})