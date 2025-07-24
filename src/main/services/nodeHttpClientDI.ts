import { ApiRequest, ApiResponse, ApiResponseData } from '@/types/types'
import {
  HttpClientInterface,
  UndiciRequestInterface,
  ProxyAgentInterface
} from '../../services/httpClientInterface'
import { RequestBuilder } from '../../services/requestBuilder'
import { getMainProcessConfig } from '../config/defaultConfig'

// クライアント証明書の型定義
interface ClientCertificate {
  id: string
  name: string
  host?: string
  certPath: string
  keyPath: string
  passphrase?: string
  enabled: boolean
}

interface ClientCertificateConfig {
  enabled: boolean
  certificates: ClientCertificate[]
}

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
        throw new Error(`Request validation failed: ${validationErrors.join(', ')}`)
      }

      // URL と オプションを構築
      let url = builder.buildUrl()
      url = builder.adjustUrlForApiKey(url)
      const fetchOptions = builder.buildFetchOptions()

      // undici用のオプションに変換
      const undiciOptions = this.convertToUndiciOptions(fetchOptions, url.toString())

      // デバッグ情報をログ出力
      console.debug('NodeHttpClientDI Request:', {
        url: url.toString(),
        method: undiciOptions.method,
        timeout: undiciOptions.headersTimeout,
        timestamp: new Date().toISOString()
      })

      // リクエスト実行
      const response = await this.undiciRequest(url.toString(), undiciOptions)

      // レスポンス処理
      return await this.processUndiciResponse(response, startTime)
    } catch (error) {
      // エラー詳細をログ出力
      console.error('NodeHttpClientDI Request failed:', {
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })

      // エラーレスポンスを作成
      return this.createNodeErrorResponse(error, startTime)
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
        throw new Error(`Request validation failed: ${validationErrors.join(', ')}`)
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

      // デバッグ情報をログ出力
      console.debug('NodeHttpClientDI Request (with cancel):', {
        url: url.toString(),
        method: undiciOptions.method,
        timeout: undiciOptions.headersTimeout,
        hasSignal: !!undiciOptions.signal,
        timestamp: new Date().toISOString()
      })

      // リクエスト実行
      const response = await this.undiciRequest(url.toString(), undiciOptions)

      // レスポンス処理
      return await this.processUndiciResponse(response, startTime)
    } catch (error) {
      // エラー詳細をログ出力
      console.error('NodeHttpClientDI Request (with cancel) failed:', {
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })

      return this.createNodeErrorResponse(error, startTime)
    }
  }

  /**
   * Fetch APIのオプションをundici用に変換
   */
  private convertToUndiciOptions(fetchOptions: RequestInit, _url: string) {
    const globalSettings = getMainProcessConfig()

    const undiciOptions: Record<string, unknown> = {
      method: fetchOptions.method,
      headers: fetchOptions.headers,
      body: fetchOptions.body
    }

    // undici 7.12.0ではmaxRedirectionsはinterceptorで処理されるため、ここでは設定しない

    // タイムアウト設定（シンプルに統一）
    if (globalSettings.defaultTimeout > 0) {
      const timeoutMs = globalSettings.defaultTimeout * 1000
      undiciOptions.headersTimeout = Math.min(timeoutMs, 30000) // 最大30秒
      undiciOptions.bodyTimeout = timeoutMs
    }

    // SSL検証設定
    undiciOptions.rejectUnauthorized = !globalSettings.allowInsecureConnections

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
        console.error('Proxy configuration error:', error)
      }
    }

    // キャンセルシグナル（既存のsignalがある場合は優先）
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error processing undici response:', errorMessage)

      return {
        status: 0,
        statusText: 'Processing Error',
        headers: {},
        data: {
          type: 'error' as const,
          error: errorMessage
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
  private createNodeErrorResponse(error: unknown, startTime: number): ApiResponse {
    const duration = Date.now() - startTime

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Node HTTP client error:', errorMessage)

    const status = 0
    let statusText = 'Network Error'

    // undiciエラーとAbortErrorの特定の処理
    if (error && typeof error === 'object') {
      // AbortError（タイムアウト含む）の処理
      if ('name' in error && error.name === 'AbortError') {
        statusText = 'Request Timeout'
      } else if ('code' in error) {
        const errorCode = (error as Error & { code?: string }).code

        switch (errorCode) {
          case 'ECONNREFUSED':
            statusText = 'Connection Refused'
            break
          case 'ENOTFOUND':
            statusText = 'Host Not Found'
            break
          case 'ETIMEDOUT':
            statusText = 'Connection Timeout'
            break
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
    }

    // エラーメッセージからタイムアウト関連の検出
    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      statusText = 'Request Timeout'
    }

    return {
      status,
      statusText,
      headers: {},
      data: {
        type: 'error' as const,
        error: errorMessage
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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
    const { request, ProxyAgent, getGlobalDispatcher, interceptors, Agent } = await import('undici')
    const fs = await import('fs')

    // グローバル設定を取得
    const globalSettings = getMainProcessConfig()

    // 基本的なdispatcherを作成（redirect interceptor付き）
    const dispatcher = getGlobalDispatcher().compose(
      interceptors.redirect({
        maxRedirections: globalSettings.defaultMaxRedirects || 5
      })
    )

    // レンダラープロセスからクライアント証明書設定を取得する関数
    const getClientCertificateConfig = (): ClientCertificateConfig => {
      try {
        // グローバル設定からクライアント証明書を取得
        // 実際の実装では、レンダラープロセスから設定を取得する方法を実装する必要がある
        // 今は空の配列を返す
        return {
          enabled: false,
          certificates: []
        }
      } catch (error) {
        console.warn('Failed to get client certificate config:', error)
        return {
          enabled: false,
          certificates: []
        }
      }
    }

    // クライアント証明書対応のリクエスト関数を作成
    const requestWithRedirect: UndiciRequestInterface = async (
      url: string,
      options: Parameters<UndiciRequestInterface>[1]
    ) => {
      const certConfig = getClientCertificateConfig()
      let finalDispatcher = dispatcher

      // クライアント証明書が有効で、URLにマッチする証明書がある場合
      if (certConfig.enabled && certConfig.certificates.length > 0) {
        const targetUrl = new URL(url)
        const matchingCert = certConfig.certificates.find(
          (cert) =>
            cert.enabled &&
            (!cert.host ||
              cert.host === targetUrl.hostname ||
              targetUrl.hostname.endsWith('.' + cert.host))
        )

        if (matchingCert) {
          try {
            // 証明書ファイルを読み込み
            const cert = fs.readFileSync(matchingCert.certPath, 'utf8')
            const key = fs.readFileSync(matchingCert.keyPath, 'utf8')

            // TLS設定でAgentを作成
            const tlsAgent = new Agent({
              connect: {
                cert,
                key,
                passphrase: matchingCert.passphrase || undefined,
                rejectUnauthorized: !globalSettings.allowInsecureConnections
              }
            })

            // redirect interceptorも適用
            finalDispatcher = tlsAgent.compose(
              interceptors.redirect({
                maxRedirections: globalSettings.defaultMaxRedirects || 5
              })
            )

            console.debug(
              `Using client certificate: ${matchingCert.name} for ${targetUrl.hostname}`
            )
          } catch (error) {
            console.error(`Failed to load client certificate ${matchingCert.name}:`, error)
            // 証明書読み込みに失敗した場合は、通常のdispatcherを使用
          }
        }
      }

      const response = await request(url, {
        ...options,
        dispatcher: finalDispatcher
      } as Parameters<UndiciRequestInterface>[1])

      // レスポンス型を統一
      return {
        statusCode: response.statusCode,
        headers: Object.fromEntries(
          Object.entries(response.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(', ') : String(value || '')
          ])
        ),
        body: response.body
      }
    }

    return new NodeHttpClientDI(requestWithRedirect, ProxyAgent as ProxyAgentInterface)
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
