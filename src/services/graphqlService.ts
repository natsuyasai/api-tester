import { ApiRequest, ApiResponse } from '@/types/types'
import { ApiService } from './apiService'

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

export class GraphQLService {
  /**
   * GraphQLクエリを実行する
   */
  static async executeGraphQLQuery(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
    headers?: Array<{ key: string; value: string; enabled: boolean }>,
    operationName?: string
  ): Promise<ApiResponse> {
    const graphqlRequest: GraphQLRequest = {
      query,
      variables,
      operationName
    }

    const apiRequest: ApiRequest = {
      id: '',
      name: 'GraphQL Query',
      url,
      method: 'POST',
      headers: headers || [],
      params: [],
      body: JSON.stringify(graphqlRequest, null, 2),
      bodyType: 'graphql',
      type: 'graphql'
    }

    return ApiService.executeRequest(apiRequest)
  }

  /**
   * GraphQLクエリの妥当性を検証する
   */
  static validateGraphQLQuery(query: string, variables?: string): string[] {
    const errors: string[] = []

    if (!query.trim()) {
      errors.push('GraphQL query is required')
      return errors
    }

    // 基本的なGraphQLクエリの構文チェック
    const trimmedQuery = query.trim()
    const validStarters = ['query', 'mutation', 'subscription', '{']
    const hasValidStart = validStarters.some(starter => 
      trimmedQuery.toLowerCase().startsWith(starter) || trimmedQuery.startsWith('{')
    )

    if (!hasValidStart) {
      errors.push('GraphQL query must start with query, mutation, subscription, or {')
    }

    // 変数の妥当性チェック
    if (variables) {
      try {
        JSON.parse(variables)
      } catch {
        errors.push('Variables must be valid JSON')
      }
    }

    return errors
  }

  /**
   * GraphQLクエリから操作名を抽出する
   */
  static extractOperationName(query: string): string | undefined {
    const trimmedQuery = query.trim()
    
    // query OperationName や mutation OperationName の形式をチェック
    const operationMatch = trimmedQuery.match(/^(query|mutation|subscription)\s+(\w+)/i)
    if (operationMatch) {
      return operationMatch[2]
    }

    return undefined
  }

  /**
   * GraphQLクエリを整形する
   */
  static formatGraphQLQuery(query: string): string {
    try {
      // 基本的な整形：改行とインデントを適切に設定
      let formatted = query
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/\s*}\s*/g, '\n}')
        .replace(/\s*,\s*/g, ',\n  ')
        .replace(/\n\s*\n/g, '\n')
        .trim()

      return formatted
    } catch {
      return query
    }
  }

  /**
   * GraphQLスキーマイントロスペクションクエリ
   */
  static getIntrospectionQuery(): string {
    return `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}

fragment InputValue on __InputValue {
  name
  description
  type { ...TypeRef }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}`.trim()
  }
}