import { ApiRequest, ApiResponse } from '@/types/types'
import { getGlobalSettings } from '@renderer/stores/globalSettingsStore'

// クッキーストアの型を後で追加
let getCookieHeader: ((domain: string) => string) | null = null

// クッキーヘッダー取得関数を設定する関数
export const setCookieResolver = (resolver: (domain: string) => string) => {
  getCookieHeader = resolver
}

export class ApiService {
  static async executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<ApiResponse> {
    const startTime = Date.now()

    try {
      // 変数の解決
      const resolveVariables = variableResolver || ((text: string) => text)

      // リクエスト設定の取得（グローバル設定をフォールバックとして使用）
      const globalSettings = getGlobalSettings()
      const settings = {
        timeout: request.settings?.timeout ?? globalSettings.defaultTimeout,
        followRedirects: request.settings?.followRedirects ?? globalSettings.defaultFollowRedirects,
        maxRedirects: request.settings?.maxRedirects ?? globalSettings.defaultMaxRedirects,
        validateSSL: request.settings?.validateSSL ?? globalSettings.defaultValidateSSL,
        userAgent: request.settings?.userAgent ?? globalSettings.defaultUserAgent
      }

      // URLパラメータの構築
      const url = new URL(resolveVariables(request.url))
      const enabledParams = request.params.filter((param) => param.enabled && param.key)
      enabledParams.forEach((param) => {
        url.searchParams.set(resolveVariables(param.key), resolveVariables(param.value))
      })

      // ヘッダーの構築
      const headers = new Headers()
      const enabledHeaders = request.headers.filter((header) => header.enabled && header.key)
      enabledHeaders.forEach((header) => {
        headers.set(resolveVariables(header.key), resolveVariables(header.value))
      })

      // User-Agentの設定
      if (settings.userAgent && !headers.has('User-Agent')) {
        headers.set('User-Agent', settings.userAgent)
      }

      // クッキーの設定
      if (getCookieHeader && !headers.has('Cookie')) {
        const cookieValue = getCookieHeader(url.hostname)
        if (cookieValue) {
          headers.set('Cookie', cookieValue)
        }
      }

      // 認証処理
      if (request.auth) {
        switch (request.auth.type) {
          case 'basic':
            if (request.auth.basic) {
              const credentials = btoa(
                `${resolveVariables(request.auth.basic.username)}:${resolveVariables(
                  request.auth.basic.password
                )}`
              )
              headers.set('Authorization', `Basic ${credentials}`)
            }
            break
          case 'bearer':
            if (request.auth.bearer) {
              headers.set('Authorization', `Bearer ${resolveVariables(request.auth.bearer.token)}`)
            }
            break
          case 'api-key':
            if (request.auth.apiKey) {
              if (request.auth.apiKey.location === 'header') {
                headers.set(
                  resolveVariables(request.auth.apiKey.key),
                  resolveVariables(request.auth.apiKey.value)
                )
              } else if (request.auth.apiKey.location === 'query') {
                url.searchParams.set(
                  resolveVariables(request.auth.apiKey.key),
                  resolveVariables(request.auth.apiKey.value)
                )
              }
            }
            break
        }
      }

      // リクエストボディの処理
      let body: string | FormData | undefined = undefined
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        if (request.bodyType === 'form-data') {
          // FormDataの場合、bodyKeyValuePairsからFormDataオブジェクトを生成
          const formData = new FormData()
          const enabledPairs =
            request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []

          enabledPairs.forEach((pair) => {
            if (pair.isFile && pair.fileContent) {
              // ファイルの場合
              const fileName = pair.fileName || 'file'
              if (pair.fileEncoding === 'base64') {
                // Base64からBlobに変換
                const byteCharacters = atob(pair.fileContent)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray])
                formData.append(resolveVariables(pair.key), blob, fileName)
              } else {
                // バイナリデータとして扱う
                const blob = new Blob([pair.fileContent])
                formData.append(resolveVariables(pair.key), blob, fileName)
              }
            } else {
              // 通常のテキストフィールド
              formData.append(resolveVariables(pair.key), resolveVariables(pair.value))
            }
          })
          body = formData
        } else if (request.body) {
          if (request.bodyType === 'graphql') {
            // GraphQLの場合、クエリと変数を適切なフォーマットに変換
            const graphqlPayload = {
              query: resolveVariables(request.body),
              variables: request.variables || {},
              operationName: this.extractOperationName(request.body)
            }
            body = JSON.stringify(graphqlPayload)
          } else {
            body = resolveVariables(request.body)
          }
        }

        // Content-Typeの自動設定
        if (!headers.has('Content-Type')) {
          switch (request.bodyType) {
            case 'json':
            case 'graphql':
              headers.set('Content-Type', 'application/json')
              break
            case 'form-data':
              // FormDataの場合、ブラウザが自動でContent-Typeを設定（multipart/form-data; boundary=...）
              break
            case 'x-www-form-urlencoded':
              headers.set('Content-Type', 'application/x-www-form-urlencoded')
              break
            default:
              headers.set('Content-Type', 'text/plain')
          }
        }
      }

      // AbortControllerでタイムアウト制御
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), settings.timeout)

      // リクエストの実行
      const response = await fetch(url.toString(), {
        method: request.method,
        headers,
        body,
        signal: abortController.signal,
        redirect: settings.followRedirects ? 'follow' : 'manual'
      })

      clearTimeout(timeoutId)

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
        responseData = await this.processBinaryResponse(response, contentType)
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

      // エラータイプの判定
      let statusText = 'Network Error'
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          statusText = 'Request Timeout'
        } else if (error.message.includes('fetch')) {
          statusText = 'Fetch Error'
        }
      }

      return {
        status: 0,
        statusText,
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

    if (request.bodyType === 'form-data') {
      const enabledPairs =
        request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []

      if (enabledPairs.length === 0) {
        errors.push('At least one form field is required for form-data')
      }

      // ファイルフィールドの妥当性チェック
      const filePairs = enabledPairs.filter((pair) => pair.isFile)
      filePairs.forEach((pair) => {
        if (!pair.fileContent) {
          errors.push(`File content is missing for field: ${pair.key}`)
        }
      })
    }

    if (request.bodyType === 'graphql') {
      if (!request.body.trim()) {
        errors.push('GraphQL query is required')
      } else {
        const trimmedQuery = request.body.trim()
        const validStarters = ['query', 'mutation', 'subscription', '{']
        const hasValidStart = validStarters.some(
          (starter) =>
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
    const enabledParams = request.params.filter((param) => param.enabled && param.key)
    enabledParams.forEach((param) => {
      url.searchParams.set(param.key, param.value)
    })

    let command = `curl -X ${request.method}`

    // ヘッダーの追加
    const enabledHeaders = request.headers.filter((header) => header.enabled && header.key)
    enabledHeaders.forEach((header) => {
      command += ` -H "${header.key}: ${header.value}"`
    })

    // 認証の追加
    if (request.auth) {
      switch (request.auth.type) {
        case 'basic':
          if (request.auth.basic) {
            command += ` -u "${request.auth.basic.username}:${request.auth.basic.password}"`
          }
          break
        case 'bearer':
          if (request.auth.bearer) {
            command += ` -H "Authorization: Bearer ${request.auth.bearer.token}"`
          }
          break
        case 'api-key':
          if (request.auth.apiKey) {
            if (request.auth.apiKey.location === 'header') {
              command += ` -H "${request.auth.apiKey.key}: ${request.auth.apiKey.value}"`
            } else if (request.auth.apiKey.location === 'query') {
              url.searchParams.set(request.auth.apiKey.key, request.auth.apiKey.value)
            }
          }
          break
      }
    }

    // ボディの追加
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (request.bodyType === 'form-data') {
        // FormDataの場合、-Fオプションを使用
        const enabledPairs =
          request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []

        enabledPairs.forEach((pair) => {
          if (pair.isFile && pair.fileName) {
            // ファイルの場合
            command += ` -F "${pair.key}=@${pair.fileName}"`
          } else {
            // 通常のフィールドの場合
            command += ` -F "${pair.key}=${pair.value}"`
          }
        })
      } else if (request.body) {
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
    }

    command += ` "${url.toString()}"`

    return command
  }

  private static async processBinaryResponse(
    response: Response,
    contentType: string
  ): Promise<unknown> {
    try {
      // レスポンスボディがReadableStreamの場合の処理
      if (response.body) {
        const blob = await response.blob()
        return await this.convertBlobToData(blob, contentType)
      } else {
        // bodyがnullの場合
        return {
          type: 'binary',
          size: 0,
          contentType,
          data: null
        }
      }
    } catch (error) {
      console.error('Failed to process binary response:', error)
      return {
        type: 'binary',
        size: 0,
        contentType,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static async convertBlobToData(blob: Blob, contentType: string): Promise<unknown> {
    const size = blob.size

    // 画像データの場合はBase64に変換
    if (contentType.startsWith('image/')) {
      try {
        const dataUrl = await this.blobToDataUrl(blob)
        const base64Data = await this.blobToBase64(blob)
        return {
          type: 'binary',
          subType: 'image',
          size,
          contentType,
          data: base64Data,
          dataUrl,
          originalBlob: blob,
          isPreviewable: true
        }
      } catch (error) {
        console.error('Failed to convert image to base64:', error)
        return {
          type: 'binary',
          subType: 'image',
          size,
          contentType,
          data: null,
          dataUrl: null,
          originalBlob: blob,
          isPreviewable: false,
          error: error instanceof Error ? error.message : 'Base64 conversion failed'
        }
      }
    }

    // PDFやその他のドキュメントの場合
    if (contentType.includes('pdf') || contentType.includes('document')) {
      try {
        const dataUrl = await this.blobToDataUrl(blob)
        const base64Data = await this.blobToBase64(blob)
        return {
          type: 'binary',
          subType: 'document',
          size,
          contentType,
          data: base64Data,
          dataUrl,
          originalBlob: blob,
          isPreviewable: true
        }
      } catch (error) {
        console.error('Failed to convert document to base64:', error)
        return {
          type: 'binary',
          subType: 'document',
          size,
          contentType,
          data: null,
          dataUrl: null,
          originalBlob: blob,
          isPreviewable: false,
          error: error instanceof Error ? error.message : 'Base64 conversion failed'
        }
      }
    }

    // 音声・動画ファイルの場合
    if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
      try {
        const dataUrl = await this.blobToDataUrl(blob)
        const base64Data = await this.blobToBase64(blob)
        return {
          type: 'binary',
          subType: contentType.startsWith('audio/') ? 'audio' : 'video',
          size,
          contentType,
          data: base64Data,
          dataUrl,
          originalBlob: blob,
          isPreviewable: true
        }
      } catch (error) {
        console.error('Failed to convert media to base64:', error)
        return {
          type: 'binary',
          subType: contentType.startsWith('audio/') ? 'audio' : 'video',
          size,
          contentType,
          data: null,
          dataUrl: null,
          originalBlob: blob,
          isPreviewable: false,
          error: error instanceof Error ? error.message : 'Base64 conversion failed'
        }
      }
    }

    // その他のバイナリデータ
    try {
      // 小さなファイル（1MB以下）はBase64に変換
      if (size <= 1024 * 1024) {
        const base64Data = await this.blobToBase64(blob)
        return {
          type: 'binary',
          subType: 'other',
          size,
          contentType,
          data: base64Data,
          dataUrl: null,
          originalBlob: blob,
          isPreviewable: false
        }
      } else {
        // 大きなファイルはBlobのまま保持
        return {
          type: 'binary',
          subType: 'other',
          size,
          contentType,
          data: null,
          dataUrl: null,
          originalBlob: blob,
          isPreviewable: false,
          notice: 'Large file - blob data preserved, base64 conversion skipped'
        }
      }
    } catch (error) {
      return {
        type: 'binary',
        subType: 'other',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // "data:type/subtype;base64," の部分を除去してBase64データのみを返す
          const base64Data = reader.result.split(',')[1]
          resolve(base64Data)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
  }

  private static async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Data URL全体を返す（data:type/subtype;base64,xxxxx）
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert blob to data URL'))
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
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
