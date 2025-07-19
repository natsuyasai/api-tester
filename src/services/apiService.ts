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
        body = request.body
        
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
      command += ` -d '${request.body}'`
    }

    command += ` "${url.toString()}"`

    return command
  }
}