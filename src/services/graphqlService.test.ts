import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiService } from './apiService'
import { GraphQLService } from './graphqlService'

// ApiServiceをモック
vi.mock('./apiService')

describe('GraphQLService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeGraphQLQuery', () => {
    it('should execute GraphQL query with proper format', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { data: { users: [] } },
        duration: 100,
        timestamp: '2024-01-01T10:00:00.000Z'
      }

      vi.mocked(ApiService.executeRequest).mockResolvedValue(mockResponse)

      const result = await GraphQLService.executeGraphQLQuery(
        'https://api.example.com/graphql',
        'query { users { id name } }',
        { limit: 10 }
      )

      expect(ApiService.executeRequest).toHaveBeenCalledWith({
        id: '',
        name: 'GraphQL Query',
        url: 'https://api.example.com/graphql',
        method: 'POST',
        headers: [],
        params: [],
        body: JSON.stringify(
          {
            query: 'query { users { id name } }',
            variables: { limit: 10 },
            operationName: undefined
          },
          null,
          2
        ),
        bodyType: 'graphql',
        type: 'graphql'
      })

      expect(result).toBe(mockResponse)
    })

    it('should include operation name when provided', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        duration: 100,
        timestamp: '2024-01-01T10:00:00.000Z'
      }

      vi.mocked(ApiService.executeRequest).mockResolvedValue(mockResponse)

      await GraphQLService.executeGraphQLQuery(
        'https://api.example.com/graphql',
        'query GetUsers { users { id } }',
        {},
        [],
        'GetUsers'
      )

      const call = vi.mocked(ApiService.executeRequest).mock.calls[0][0]
      const body = JSON.parse(call.body)
      expect(body.operationName).toBe('GetUsers')
    })
  })

  describe('validateGraphQLQuery', () => {
    it('should return no errors for valid queries', () => {
      const validQueries = [
        'query { users { id } }',
        'mutation { createUser(input: $input) { id } }',
        'subscription { messageAdded { id } }',
        '{ users { id } }'
      ]

      validQueries.forEach((query) => {
        const errors = GraphQLService.validateGraphQLQuery(query)
        expect(errors).toHaveLength(0)
      })
    })

    it('should return error for empty query', () => {
      const errors = GraphQLService.validateGraphQLQuery('')
      expect(errors).toContain('GraphQL query is required')
    })

    it('should return error for invalid query start', () => {
      const errors = GraphQLService.validateGraphQLQuery('invalid query')
      expect(errors).toContain('GraphQL query must start with query, mutation, subscription, or {')
    })

    it('should return error for invalid variables JSON', () => {
      const errors = GraphQLService.validateGraphQLQuery('query { users }', 'invalid json')
      expect(errors).toContain('Variables must be valid JSON')
    })

    it('should accept valid variables JSON', () => {
      const errors = GraphQLService.validateGraphQLQuery(
        'query { users }',
        '{"limit": 10, "offset": 0}'
      )
      expect(errors).toHaveLength(0)
    })
  })

  describe('extractOperationName', () => {
    it('should extract operation name from queries', () => {
      expect(GraphQLService.extractOperationName('query GetUsers { users { id } }')).toBe(
        'GetUsers'
      )
      expect(GraphQLService.extractOperationName('mutation CreateUser { createUser { id } }')).toBe(
        'CreateUser'
      )
      expect(
        GraphQLService.extractOperationName('subscription MessageAdded { messageAdded { id } }')
      ).toBe('MessageAdded')
    })

    it('should return undefined for anonymous operations', () => {
      expect(GraphQLService.extractOperationName('query { users { id } }')).toBeUndefined()
      expect(GraphQLService.extractOperationName('{ users { id } }')).toBeUndefined()
    })
  })

  describe('formatGraphQLQuery', () => {
    it('should format GraphQL query with proper indentation', () => {
      const query = 'query{users{id,name,email}}'
      const formatted = GraphQLService.formatGraphQLQuery(query)

      expect(formatted).toContain('{\n')
      expect(formatted).toContain('}\n')
      expect(formatted).not.toBe(query)
    })

    it('should return original query if formatting fails', () => {
      const query = 'invalid query format'
      const formatted = GraphQLService.formatGraphQLQuery(query)
      expect(formatted).toBe(query)
    })
  })

  describe('getIntrospectionQuery', () => {
    it('should return a valid introspection query', () => {
      const query = GraphQLService.getIntrospectionQuery()
      expect(query).toContain('query IntrospectionQuery')
      expect(query).toContain('__schema')
      expect(query).toContain('queryType')
      expect(query).toContain('mutationType')
    })
  })
})
