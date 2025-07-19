import { describe, it, expect } from 'vitest'
import { 
  HttpMethod, 
  ApiRequest, 
  ApiResponse, 
  ApiTab, 
  KeyValuePair,
  ApiConfig 
} from './types'

describe('型定義のテスト', () => {
  describe('HttpMethod', () => {
    it('有効なHTTPメソッドが定義されていること', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
      methods.forEach(method => {
        expect(typeof method).toBe('string')
      })
    })
  })

  describe('KeyValuePair', () => {
    it('キーと値のペアが正しく定義されていること', () => {
      const pair: KeyValuePair = {
        key: 'Content-Type',
        value: 'application/json',
        enabled: true
      }
      
      expect(pair.key).toBe('Content-Type')
      expect(pair.value).toBe('application/json')
      expect(pair.enabled).toBe(true)
    })

    it('enabledがfalseの場合も正しく動作すること', () => {
      const pair: KeyValuePair = {
        key: 'Authorization',
        value: 'Bearer token',
        enabled: false
      }
      
      expect(pair.enabled).toBe(false)
    })
  })

  describe('ApiRequest', () => {
    it('REST APIリクエストが正しく定義されていること', () => {
      const request: ApiRequest = {
        id: 'test-1',
        name: 'Test API',
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true }
        ],
        params: [
          { key: 'limit', value: '10', enabled: true }
        ],
        body: '',
        bodyType: 'json',
        type: 'rest'
      }
      
      expect(request.id).toBe('test-1')
      expect(request.type).toBe('rest')
      expect(request.method).toBe('GET')
    })

    it('GraphQLリクエストが正しく定義されていること', () => {
      const request: ApiRequest = {
        id: 'gql-1',
        name: 'GraphQL Query',
        url: 'https://api.example.com/graphql',
        method: 'POST',
        headers: [],
        params: [],
        body: 'query { users { id name } }',
        bodyType: 'graphql',
        type: 'graphql',
        variables: {}
      }
      
      expect(request.type).toBe('graphql')
      expect(request.bodyType).toBe('graphql')
      expect(request.variables).toEqual({})
    })
  })

  describe('ApiResponse', () => {
    it('APIレスポンスが正しく定義されていること', () => {
      const response: ApiResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' },
        duration: 150,
        timestamp: new Date().toISOString()
      }
      
      expect(response.status).toBe(200)
      expect(response.duration).toBe(150)
      expect(typeof response.timestamp).toBe('string')
    })
  })

  describe('ApiTab', () => {
    it('タブが正しく定義されていること', () => {
      const tab: ApiTab = {
        id: 'tab-1',
        title: 'Users API',
        request: {
          id: 'req-1',
          name: 'Get Users',
          url: 'https://api.example.com/users',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null,
        isActive: true
      }
      
      expect(tab.id).toBe('tab-1')
      expect(tab.isActive).toBe(true)
      expect(tab.response).toBe(null)
    })
  })

  describe('ApiConfig', () => {
    it('API設定が正しく定義されていること', () => {
      const config: ApiConfig = {
        tabs: [
          {
            id: 'tab-1',
            title: 'Test Tab',
            request: {
              id: 'req-1',
              name: 'Test Request',
              url: 'https://api.example.com',
              method: 'GET',
              headers: [],
              params: [],
              body: '',
              bodyType: 'json',
              type: 'rest'
            },
            response: null,
            isActive: true
          }
        ],
        activeTabId: 'tab-1'
      }
      
      expect(config.tabs).toHaveLength(1)
      expect(config.activeTabId).toBe('tab-1')
    })
  })
})