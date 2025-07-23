import { ApiRequest, ApiResponse, ApiResponseData } from '@/types/types'
import { getGlobalSettings } from '@renderer/stores/globalSettingsStore'
import { ErrorHandler } from '@renderer/utils/errorUtils'
import {
  HttpClientInterface,
  UndiciRequestInterface,
  ProxyAgentInterface
} from './httpClientInterface'
import { RequestBuilder } from './requestBuilder'

/**
 * 依存性注入対応のNode.js環境用HTTP通信クライアント
 */
export class NodeHttpClientDI implements HttpClientInterface {
  private getCookieHeader: ((domain: string) => string) | null = null

  constructor(
    private undiciRequest: UndiciRequestInterface,
    private ProxyAgentClass?: ProxyAgentInterface
  ) {}

  /**
   * Cookie取得関数を設定
   */
  setCookieResolver(resolver: (domain: string) => string): void {
    this.getCookieHeader = resolver
  }

  /**
   * HTTPリクエストを実行
   */
  async executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<ApiResponse> {
    const startTime = Date.now()
    const resolveVariables = variableResolver || ((text: string) => text)

    try {
      // リクエストビルダーを作成
      const builder = new RequestBuilder(request, resolveVariables, this.getCookieHeader)

      // リクエスト検証
      const validationErrors = builder.validate()
      if (validationErrors.length > 0) {
        const appError = ErrorHandler.handleValidationError(validationErrors.join(', '), {
          context: 'requestValidation'
        })
        throw new Error(appError.message)
      }

      // URL と オプションを構築
      let url = builder.buildUrl()
      url = builder.adjustUrlForApiKey(url)
      const fetchOptions = builder.buildFetchOptions()

      // undici用のオプションに変換
      const undiciOptions = this.convertToUndiciOptions(fetchOptions, url.toString())

      // リクエスト実行
      const response = await this.undiciRequest(url.toString(), undiciOptions)

      // レスポンス処理
      return await this.processUndiciResponse(response, startTime)
    } catch (error) {
      // エラーレスポンスを作成
      return this.createNodeErrorResponse(error, startTime, request.url, request.method)
    }
  }

  /**
   * リクエストをキャンセル可能な形で実行
   */
  async executeRequestWithCancel(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    cancelToken?: AbortSignal
  ): Promise<ApiResponse> {
    const startTime = Date.now()
    const resolveVariables = variableResolver || ((text: string) => text)

    try {
      const builder = new RequestBuilder(request, resolveVariables, this.getCookieHeader)

      // リクエスト検証
      const validationErrors = builder.validate()
      if (validationErrors.length > 0) {
        const appError = ErrorHandler.handleValidationError(validationErrors.join(', '), {
          context: 'requestValidation'
        })
        throw new Error(appError.message)
      }

      // URL と オプションを構築
      let url = builder.buildUrl()
      url = builder.adjustUrlForApiKey(url)
      const fetchOptions = builder.buildFetchOptions()

      // キャンセルトークンを設定
      if (cancelToken) {
        fetchOptions.signal = cancelToken
      }

      // undici用のオプションに変換
      const undiciOptions = this.convertToUndiciOptions(fetchOptions, url.toString())

      // リクエスト実行
      const response = await this.undiciRequest(url.toString(), undiciOptions)

      // レスポンス処理
      return await this.processUndiciResponse(response, startTime)
    } catch (error) {
      return this.createNodeErrorResponse(error, startTime, request.url, request.method)
    }
  }

  /**
   * Fetch APIのオプションをundici用に変換
   */
  private convertToUndiciOptions(fetchOptions: RequestInit, _url: string) {
    const globalSettings = getGlobalSettings()

    const undiciOptions: Record<string, unknown> = {
      method: fetchOptions.method,
      headers: fetchOptions.headers,
      body: fetchOptions.body
    }

    // タイムアウト設定
    if (globalSettings.defaultTimeout > 0) {
      undiciOptions.headersTimeout = globalSettings.defaultTimeout * 1000
      undiciOptions.bodyTimeout = globalSettings.defaultTimeout * 1000
    }

    // SSL検証設定
    if (!globalSettings.allowInsecureConnections) {
      undiciOptions.rejectUnauthorized = true
    } else {
      undiciOptions.rejectUnauthorized = false
    }

    // リダイレクト設定
    undiciOptions.maxRedirections = globalSettings.defaultMaxRedirects || 5

    // プロキシ設定
    if (globalSettings.proxyEnabled && globalSettings.proxyUrl && this.ProxyAgentClass) {
      try {
        // プロキシ認証が設定されている場合のみauth値を設定
        const proxyOptions: { uri: string; auth?: string } = {
          uri: globalSettings.proxyUrl
        }
        if (globalSettings.proxyAuth) {
          // proxyAuthオブジェクトから文字列形式に変換
          proxyOptions.auth = `${globalSettings.proxyAuth.username}:${globalSettings.proxyAuth.password}`
        }
        undiciOptions.dispatcher = new this.ProxyAgentClass(proxyOptions) as unknown
      } catch (error) {
        const appError = ErrorHandler.handleSystemError(error, {
          context: 'proxyConfiguration',
          proxyUrl: globalSettings.proxyUrl
        })
        void ErrorHandler.logError(appError)
      }
    }

    // キャンセルシグナル
    if (fetchOptions.signal) {
      undiciOptions.signal = fetchOptions.signal
    }

    return undiciOptions
  }

  /**
   * undiciレスポンスを処理
   */
  private async processUndiciResponse(
    response: {
      statusCode: number
      headers: Record<string, string>
      body: { arrayBuffer(): Promise<ArrayBuffer> }
    },
    startTime: number
  ): Promise<ApiResponse> {
    try {
      const duration = Date.now() - startTime

      // ヘッダーをRecord形式に変換
      const headers: Record<string, string> = {}
      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          headers[key] = String(value)
        }
      }

      // ボディを取得
      const buffer = await response.body.arrayBuffer()
      const bodyText = new TextDecoder().decode(buffer)

      // Content-Typeに基づいてレスポンスデータを処理
      const contentType = headers['content-type'] || ''
      let responseData: ApiResponseData

      if (contentType.includes('application/json')) {
        try {
          const jsonData = JSON.parse(bodyText) as Record<string, unknown> | unknown[]
          responseData = {
            type: 'json' as const,
            data: jsonData,
            raw: bodyText
          }
        } catch {
          responseData = {
            type: 'text' as const,
            data: bodyText
          }
        }
      } else if (
        contentType.startsWith('image/') ||
        contentType.startsWith('video/') ||
        contentType.startsWith('audio/') ||
        contentType === 'application/pdf'
      ) {
        // バイナリデータの処理
        const base64Data = Buffer.from(buffer).toString('base64')
        responseData = {
          type: 'binary' as const,
          data: `data:${contentType};base64,${base64Data}`,
          size: buffer.byteLength,
          mimeType: contentType
        }
      } else {
        responseData = {
          type: 'text' as const,
          data: bodyText
        }
      }

      return {
        status: response.statusCode,
        statusText: this.getStatusText(response.statusCode),
        headers,
        data: responseData,
        duration,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const appError = ErrorHandler.handleSystemError(error, {
        context: 'processUndiciResponse',
        status: response?.statusCode
      })
      void ErrorHandler.logError(appError)

      return {
        status: 0,
        statusText: 'Processing Error',
        headers: {},
        data: {
          type: 'error' as const,
          error: appError.message
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * ステータスコードからステータステキストを取得
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    }

    return statusTexts[statusCode] || 'Unknown Status'
  }

  /**
   * Node.js環境用エラーレスポンスを作成
   */
  private createNodeErrorResponse(
    error: unknown,
    startTime: number,
    requestUrl: string,
    requestMethod: string
  ): ApiResponse {
    const duration = Date.now() - startTime

    const appError = ErrorHandler.handleSystemError(error, {
      requestUrl,
      requestMethod,
      context: 'executeRequest'
    })
    void ErrorHandler.logError(appError)

    const status = 0
    let statusText = 'Network Error'

    // undiciエラーの特定の処理
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as Error & { code?: string }).code

      switch (errorCode) {
        case 'ECONNREFUSED':
          statusText = 'Connection Refused'
          break
        case 'ENOTFOUND':
          statusText = 'Host Not Found'
          break
        case 'ETIMEDOUT':
        case 'UND_ERR_CONNECT_TIMEOUT':
          statusText = 'Connection Timeout'
          break
        case 'UND_ERR_HEADERS_TIMEOUT':
        case 'UND_ERR_BODY_TIMEOUT':
          statusText = 'Request Timeout'
          break
        case 'ECONNRESET':
          statusText = 'Connection Reset'
          break
      }
    }

    return {
      status,
      statusText,
      headers: {},
      data: {
        type: 'error' as const,
        error: appError.message
      },
      duration,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * リクエストの事前チェック（実行せずに検証のみ）
   */
  validateRequest(request: ApiRequest, variableResolver?: (text: string) => string): string[] {
    const resolveVariables = variableResolver || ((text: string) => text)
    const builder = new RequestBuilder(request, resolveVariables, this.getCookieHeader)
    return builder.validate()
  }

  /**
   * リクエストの詳細情報を取得（デバッグ用）
   */
  getRequestDetails(request: ApiRequest, variableResolver?: (text: string) => string) {
    const resolveVariables = variableResolver || ((text: string) => text)
    const builder = new RequestBuilder(request, resolveVariables, this.getCookieHeader)

    try {
      const url = builder.buildUrl()
      const headers = builder.buildHeaders()
      const body = builder.buildBody()
      const settings = builder.getRequestSettings()

      return {
        url: url.toString(),
        method: request.method,
        headers: Object.fromEntries(headers.entries()),
        body: body instanceof FormData ? '[FormData]' : body,
        settings
      }
    } catch (error) {
      return {
        error: ErrorHandler.extractErrorMessage(error),
        context: 'getRequestDetails'
      }
    }
  }
}

/**
 * ファクトリー関数：本物のundiciを使用
 */
export async function createNodeHttpClient(): Promise<NodeHttpClientDI> {
  try {
    // 実際のundiciをインポート
    const { request, ProxyAgent } = await import('undici')
    return new NodeHttpClientDI(
      request as UndiciRequestInterface,
      ProxyAgent as ProxyAgentInterface
    )
  } catch (error) {
    console.error('Failed to import undici:', error)
    throw new Error('Failed to initialize NodeHttpClient: undici is not available')
  }
}

/**
 * ファクトリー関数：テスト用モック
 */
export function createMockNodeHttpClient(
  mockUndiciRequest: UndiciRequestInterface,
  MockProxyAgent?: ProxyAgentInterface
): NodeHttpClientDI {
  return new NodeHttpClientDI(mockUndiciRequest, MockProxyAgent)
}
