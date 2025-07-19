import { ApiRequest, ApiResponse } from '@/types/types'

export class ApiService {
  static async executeRequest(request: ApiRequest): Promise<ApiResponse> {
    const startTime = Date.now()
    
    try {
      // URLパラメータの構築
      const url = new URL(request.url)
      const enabledParams = request.params.filter(param => param.enabled && param.key)
      enabledParams.forEach(param => {
        url.searchParams.set(param.key, param.value)
      })

      // ヘッダーの構築
      const headers = new Headers()
      const enabledHeaders = request.headers.filter(header => header.enabled && header.key)
      enabledHeaders.forEach(header => {
        headers.set(header.key, header.value)
      })

      // リクエストボディの処理
      let body: string | undefined = undefined
      if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
        if (request.bodyType === 'graphql') {
          // GraphQLの場合、クエリと変数を適切なフォーマットに変換
          const graphqlPayload = {
            query: request.body,
            variables: request.variables || {},
            operationName: this.extractOperationName(request.body)
          }
          body = JSON.stringify(graphqlPayload)
        } else {
          body = request.body
        }
        
        // Content-Typeの自動設定
        if (!headers.has('Content-Type')) {
          switch (request.bodyType) {
            case 'json':
            case 'graphql':
              headers.set('Content-Type', 'application/json')
              break
            case 'form-data':
              // FormDataの場合、ブラウザが自動でContent-Typeを設定
              break
            case 'x-www-form-urlencoded':
              headers.set('Content-Type', 'application/x-www-form-urlencoded')
              break
            default:
              headers.set('Content-Type', 'text/plain')
          }
        }
      }

      // リクエストの実行
      const response = await fetch(url.toString(), {
        method: request.method,
        headers,
        body
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // レスポンスヘッダーの取得
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // レスポンスボディの取得
      let responseData: unknown
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json()
        } catch {
          responseData = await response.text()
        }
      } else if (contentType.includes('text/')) {
        responseData = await response.text()
      } else {
        // バイナリデータの場合
        const arrayBuffer = await response.arrayBuffer()
        responseData = {
          type: 'binary',
          size: arrayBuffer.byteLength,
          contentType
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime

      return {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'error'
        },
        duration,
        timestamp: new Date().toISOString()
      }
    }
  }

  static validateRequest(request: ApiRequest): string[] {
    const errors: string[] = []

    if (!request.url) {
      errors.push('URL is required')
    } else {
      try {
        new URL(request.url)
      } catch {
        errors.push('Invalid URL format')
      }
    }

    if (request.bodyType === 'json' && request.body) {
      try {
        JSON.parse(request.body)
      } catch {
        errors.push('Invalid JSON in request body')
      }
    }

    if (request.bodyType === 'graphql') {
      if (!request.body.trim()) {
        errors.push('GraphQL query is required')
      } else {
        const trimmedQuery = request.body.trim()
        const validStarters = ['query', 'mutation', 'subscription', '{']
        const hasValidStart = validStarters.some(starter => 
          trimmedQuery.toLowerCase().startsWith(starter) || trimmedQuery.startsWith('{')
        )

        if (!hasValidStart) {
          errors.push('GraphQL query must start with query, mutation, subscription, or {')
        }
      }

      // 変数の妥当性チェック
      if (request.variables) {
        try {
          JSON.stringify(request.variables)
        } catch {
          errors.push('GraphQL variables must be valid JSON')
        }
      }
    }

    return errors
  }

  static buildCurlCommand(request: ApiRequest): string {
    const url = new URL(request.url)
    const enabledParams = request.params.filter(param => param.enabled && param.key)
    enabledParams.forEach(param => {
      url.searchParams.set(param.key, param.value)
    })

    let command = `curl -X ${request.method}`
    
    // ヘッダーの追加
    const enabledHeaders = request.headers.filter(header => header.enabled && header.key)
    enabledHeaders.forEach(header => {
      command += ` -H "${header.key}: ${header.value}"`
    })

    // ボディの追加
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
      if (request.bodyType === 'graphql') {
        const graphqlPayload = {
          query: request.body,
          variables: request.variables || {},
          operationName: this.extractOperationName(request.body)
        }
        command += ` -d '${JSON.stringify(graphqlPayload)}'`
      } else {
        command += ` -d '${request.body}'`
      }
    }

    command += ` "${url.toString()}"`

    return command
  }

  private static extractOperationName(query: string): string | undefined {
    const trimmedQuery = query.trim()
    
    // query OperationName や mutation OperationName の形式をチェック
    const operationMatch = trimmedQuery.match(/^(query|mutation|subscription)\s+(\w+)/i)
    if (operationMatch) {
      return operationMatch[2]
    }

    return undefined
  }
}