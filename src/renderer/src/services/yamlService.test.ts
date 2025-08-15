import { describe, it, expect, vi } from 'vitest'
import { ApiTab } from '@/types/types'
import { YamlService } from './yamlService'

// uuid をモック
vi.mock('uuid', () => ({
  v4: () => 'test-uuid'
}))

describe('YamlService', () => {
  const sampleTab: ApiTab = {
    id: 'tab-1',
    title: 'Test API',
    isActive: true,
    request: {
      id: 'req-1',
      name: 'Test Request',
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: [
        { key: 'Authorization', value: 'Bearer token123', enabled: true },
        { key: '', value: '', enabled: true }
      ],
      params: [
        { key: 'limit', value: '10', enabled: true },
        { key: '', value: '', enabled: true }
      ],
      body: '',
      bodyType: 'json',
      type: 'rest'
    },
    response: null
  }

  describe('exportToYaml', () => {
    it('should export tabs to YAML format', () => {
      const result = YamlService.exportToYaml([sampleTab])

      expect(result).toContain("version: '1.0'")
      expect(result).toContain('collections:')
      expect(result).toContain('name: API Collection')
      expect(result).toContain('requests:')
      expect(result).toContain('- name: Test API')
      expect(result).toContain('method: GET')
      expect(result).toContain('url: https://api.example.com/users')
      expect(result).toContain('headers:')
      expect(result).toContain('Authorization: Bearer token123')
      expect(result).toContain('params:')
      expect(result).toContain("limit: '10'")
    })

    it('should handle empty tabs array', () => {
      const result = YamlService.exportToYaml([])

      expect(result).toContain("version: '1.0'")
      expect(result).toContain('collections: []')
    })

    it('should handle GraphQL requests with variables', () => {
      const graphqlTab: ApiTab = {
        ...sampleTab,
        request: {
          ...sampleTab.request,
          body: 'query GetUsers($limit: Int) { users(limit: $limit) { id name } }',
          bodyType: 'graphql',
          type: 'graphql',
          variables: { limit: 10, includeInactive: false }
        }
      }

      const result = YamlService.exportToYaml([graphqlTab])

      expect(result).toContain('bodyType: graphql')
      expect(result).toContain('variables:')
      expect(result).toContain('limit: 10')
      expect(result).toContain('includeInactive: false')
    })
  })

  describe('importFromYaml', () => {
    const sampleYaml = `
version: '1.0'
collections:
  - name: Test Collection
    description: Sample collection
    requests:
      - name: Get Users
        method: GET
        url: https://api.example.com/users
        headers:
          Authorization: Bearer token123
          Content-Type: application/json
        params:
          limit: "10"
          offset: "0"
      - name: Create User
        method: POST
        url: https://api.example.com/users
        body:
          name: John Doe
          email: john@example.com
        bodyType: json
`

    it('should import YAML to tabs', () => {
      const result = YamlService.importFromYaml(sampleYaml)

      expect(result).toHaveLength(2)

      // First request
      expect(result[0].title).toBe('Get Users')
      expect(result[0].request.method).toBe('GET')
      expect(result[0].request.url).toBe('https://api.example.com/users')
      expect(result[0].request.headers).toContainEqual({
        key: 'Authorization',
        value: 'Bearer token123',
        enabled: true
      })
      expect(result[0].request.params).toContainEqual({
        key: 'limit',
        value: '10',
        enabled: true
      })

      // Second request
      expect(result[1].title).toBe('Create User')
      expect(result[1].request.method).toBe('POST')
      expect(result[1].request.body).toContain('John Doe')
      expect(result[1].request.bodyType).toBe('json')
    })

    it('should throw error for invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: content: ['

      expect(() => YamlService.importFromYaml(invalidYaml)).toThrow('YAML parsing error')
    })

    it('should throw error for missing collections', () => {
      const yamlWithoutCollections = `
version: '1.0'
data: some other data
`

      expect(() => YamlService.importFromYaml(yamlWithoutCollections)).toThrow(
        'No collections found in YAML'
      )
    })
  })

  describe('convertPostmanToYaml', () => {
    const samplePostmanCollection = {
      info: {
        name: 'Test Collection',
        description: 'Sample Postman collection'
      },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users',
            header: [
              { key: 'Authorization', value: 'Bearer token123' },
              { key: 'Content-Type', value: 'application/json' }
            ]
          }
        },
        {
          name: 'Create User',
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/users' },
            body: {
              raw: '{"name": "John Doe", "email": "john@example.com"}',
              mode: 'raw'
            }
          }
        }
      ]
    }

    it('should convert Postman collection to YAML', () => {
      const result = YamlService.convertPostmanToYaml(samplePostmanCollection)

      expect(result).toContain("version: '1.0'")
      expect(result).toContain('name: Test Collection')
      expect(result).toContain('description: Sample Postman collection')
      expect(result).toContain('- name: Get Users')
      expect(result).toContain('method: GET')
      expect(result).toContain('url: https://api.example.com/users')
      expect(result).toContain('Authorization: Bearer token123')
      expect(result).toContain('- name: Create User')
      expect(result).toContain('method: POST')
    })

    it('should throw error for invalid Postman collection', () => {
      const invalidCollection = { invalid: 'data' }

      expect(() => YamlService.convertPostmanToYaml(invalidCollection)).toThrow(
        'Invalid Postman collection format'
      )
    })
  })

  describe('convertOpenApiToYaml', () => {
    const sampleOpenApiSpec = {
      info: {
        title: 'User API',
        description: 'API for managing users'
      },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          get: {
            summary: 'List users'
          },
          post: {
            summary: 'Create user'
          }
        },
        '/users/{id}': {
          get: {
            summary: 'Get user by ID'
          }
        }
      }
    }

    it('should convert OpenAPI spec to YAML', () => {
      const result = YamlService.convertOpenApiToYaml(sampleOpenApiSpec)

      expect(result).toContain("version: '1.0'")
      expect(result).toContain('name: User API')
      expect(result).toContain('description: API for managing users')
      expect(result).toContain('- name: List users')
      expect(result).toContain('method: GET')
      expect(result).toContain('url: https://api.example.com/users')
      expect(result).toContain('- name: Create user')
      expect(result).toContain('method: POST')
      expect(result).toContain('- name: Get user by ID')
      expect(result).toContain('url: https://api.example.com/users/{id}')
    })

    it('should throw error for OpenAPI spec without paths', () => {
      const invalidSpec = { info: { title: 'Test API' } }

      expect(() => YamlService.convertOpenApiToYaml(invalidSpec)).toThrow(
        'No paths found in OpenAPI specification'
      )
    })
  })
})
