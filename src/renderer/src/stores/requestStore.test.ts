import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRequestStore } from './requestStore'
import { useTabStore } from './tabStore'

// tabStoreをモック
vi.mock('./tabStore', () => ({
  useTabStore: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}))

const mockUseTabStore = vi.mocked(useTabStore)

describe('RequestStore', () => {
  const mockTab = {
    id: 'tab-1',
    title: 'Test Tab',
    isActive: true,
    response: null,
    request: {
      id: 'req-1',
      name: 'Test Request',
      url: 'https://api.example.com',
      method: 'GET' as const,
      headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      params: [{ key: 'limit', value: '10', enabled: true }],
      body: '',
      bodyType: 'json' as const,
      type: 'rest' as const
    }
  }

  const mockTabs = [mockTab]

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseTabStore.getState = vi.fn().mockReturnValue({
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

    useRequestStore.setState({
      isLoading: false
    })
  })

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { setLoading } = useRequestStore.getState()

      setLoading(true)
      expect(useRequestStore.getState().isLoading).toBe(true)

      setLoading(false)
      expect(useRequestStore.getState().isLoading).toBe(false)
    })
  })

  describe('Request Updates', () => {
    it('should update request URL', () => {
      const { updateUrl } = useRequestStore.getState()

      updateUrl('tab-1', 'https://new-api.example.com')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              url: 'https://new-api.example.com'
            })
          })
        ])
      })
    })

    it('should update request method', () => {
      const { updateMethod } = useRequestStore.getState()

      updateMethod('tab-1', 'POST')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              method: 'POST'
            })
          })
        ])
      })
    })

    it('should update request body', () => {
      const { updateBody } = useRequestStore.getState()

      updateBody('tab-1', '{"test": true}')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              body: '{"test": true}'
            })
          })
        ])
      })
    })

    it('should update request body type', () => {
      const { updateBodyType } = useRequestStore.getState()

      updateBodyType('tab-1', 'form-data')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              bodyType: 'form-data'
            })
          })
        ])
      })
    })

    it('should update GraphQL variables', () => {
      const { updateGraphQLVariables } = useRequestStore.getState()
      const variables = { userId: 123, active: true }

      updateGraphQLVariables('tab-1', variables)

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              variables
            })
          })
        ])
      })
    })
  })

  describe('Header Management', () => {
    it('should add a new header', () => {
      const { addHeader } = useRequestStore.getState()

      addHeader('tab-1')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              headers: expect.arrayContaining([
                { key: 'Authorization', value: 'Bearer token', enabled: true },
                { key: '', value: '', enabled: false }
              ])
            })
          })
        ])
      })
    })

    it('should update a header', () => {
      const { updateHeader } = useRequestStore.getState()

      updateHeader('tab-1', 0, { key: 'Content-Type', value: 'application/json' })

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              headers: expect.arrayContaining([
                { key: 'Content-Type', value: 'application/json', enabled: true }
              ])
            })
          })
        ])
      })
    })

    it('should remove a header', () => {
      const { removeHeader } = useRequestStore.getState()

      removeHeader('tab-1', 0)

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              headers: []
            })
          })
        ])
      })
    })
  })

  describe('Parameter Management', () => {
    it('should add a new parameter', () => {
      const { addParam } = useRequestStore.getState()

      addParam('tab-1')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              params: expect.arrayContaining([
                { key: 'limit', value: '10', enabled: true },
                { key: '', value: '', enabled: false }
              ])
            })
          })
        ])
      })
    })

    it('should update a parameter', () => {
      const { updateParam } = useRequestStore.getState()

      updateParam('tab-1', 0, { key: 'page', value: '1' })

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              params: expect.arrayContaining([{ key: 'page', value: '1', enabled: true }])
            })
          })
        ])
      })
    })

    it('should remove a parameter', () => {
      const { removeParam } = useRequestStore.getState()

      removeParam('tab-1', 0)

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            request: expect.objectContaining({
              params: []
            })
          })
        ])
      })
    })
  })

  describe('Response Management', () => {
    it('should set response', () => {
      const { setResponse } = useRequestStore.getState()
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
        duration: 150,
        timestamp: '2024-01-01T10:30:00.000Z'
      }

      setResponse('tab-1', mockResponse)

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            response: mockResponse
          })
        ])
      })
    })

    it('should clear response', () => {
      const { clearResponse } = useRequestStore.getState()

      clearResponse('tab-1')

      expect(mockUseTabStore.setState).toHaveBeenCalledWith({
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'tab-1',
            response: null
          })
        ])
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle operations on non-existent tab gracefully', () => {
      mockUseTabStore.getState = vi.fn().mockReturnValue({
        tabs: [],
        activeTabId: '',
        addTab: vi.fn(),
        closeTab: vi.fn(),
        setActiveTab: vi.fn(),
        updateTabTitle: vi.fn(),
        getActiveTab: vi.fn(),
        getTab: vi.fn(),
        resetTabs: vi.fn()
      })

      const { updateUrl, addHeader, setResponse } = useRequestStore.getState()

      // これらの操作は例外を投げるべきではない
      expect(() => {
        updateUrl('non-existent', 'https://example.com')
        addHeader('non-existent')
        setResponse('non-existent', {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {},
          duration: 100,
          timestamp: '2024-01-01T10:30:00.000Z'
        })
      }).not.toThrow()
    })
  })
})
