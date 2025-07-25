import { ApiRequest, ApiResponse, ApiResponseData } from '@/types/types'
import {
  HttpClientInterface,
  UndiciRequestInterface,
  ProxyAgentInterface
} from '../../services/httpClientInterface'
import { RequestBuilder } from '../../services/requestBuilder'
import {
  MainProcessConfigProvider,
  DefaultConfigProvider,
  DynamicConfigProvider,
  MainProcessConfig
} from '../config/defaultConfig'
import { getCurrentMainProcessConfig } from '../handlers/configHandlers'
import {
  UndiciLibraryInterface,
  FsInterface,
  ClientCertificateConfigProvider,
  ClientCertificateConfig,
  ClientCertificate,
  RealUndiciLibrary,
  RealFsModule,
  DefaultClientCertificateProvider
} from './undiciInterface'

/**
 * 依存性注入対応のNode.js環境用HTTP通信クライアント
 */
export class NodeHttpClientDI implements HttpClientInterface {
  private getCookieHeader: ((domain: string) => string) | null = null

  constructor(
    private undiciRequest: UndiciRequestInterface,
    private ProxyAgentClass?: ProxyAgentInterface,
    private configProvider: MainProcessConfigProvider = new DefaultConfigProvider()
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
    const globalSettings = this.configProvider.getConfig()

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
      const headers = this.convertHeaders(response.headers)
      const buffer = await response.body.arrayBuffer()
      const bodyText = new TextDecoder().decode(buffer)
      const contentType = headers['content-type'] || ''

      const responseData = this.processResponseBody(bodyText, contentType, buffer)

      return {
        status: response.statusCode,
        statusText: this.getStatusText(response.statusCode),
        headers,
        data: responseData,
        duration,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return this.createProcessingErrorResponse(error, startTime)
    }
  }

  /**
   * ヘッダーをRecord形式に変換
   */
  private convertHeaders(headers: Record<string, string>): Record<string, string> {
    const convertedHeaders: Record<string, string> = {}
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        convertedHeaders[key] = String(value)
      }
    }
    return convertedHeaders
  }

  /**
   * レスポンスボディを処理してApiResponseDataに変換
   */
  private processResponseBody(
    bodyText: string,
    contentType: string,
    buffer: ArrayBuffer
  ): ApiResponseData {
    if (contentType.includes('application/json')) {
      return this.processJsonResponse(bodyText)
    }

    if (this.isBinaryContentType(contentType)) {
      return this.processBinaryResponse(buffer, contentType)
    }

    return {
      type: 'text' as const,
      data: bodyText
    }
  }

  /**
   * JSONレスポンスを処理
   */
  private processJsonResponse(bodyText: string): ApiResponseData {
    try {
      const jsonData = JSON.parse(bodyText) as Record<string, unknown> | unknown[]
      return {
        type: 'json' as const,
        data: jsonData,
        raw: bodyText
      }
    } catch {
      return {
        type: 'text' as const,
        data: bodyText
      }
    }
  }

  /**
   * バイナリレスポンスを処理
   */
  private processBinaryResponse(buffer: ArrayBuffer, contentType: string): ApiResponseData {
    const base64Data = Buffer.from(buffer).toString('base64')
    return {
      type: 'binary' as const,
      data: `data:${contentType};base64,${base64Data}`,
      size: buffer.byteLength,
      mimeType: contentType
    }
  }

  /**
   * バイナリコンテンツタイプかどうかを判定
   */
  private isBinaryContentType(contentType: string): boolean {
    return (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType === 'application/pdf'
    )
  }

  /**
   * レスポンス処理エラー時のレスポンスを作成
   */
  private createProcessingErrorResponse(error: unknown, startTime: number): ApiResponse {
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

    const statusText = this.determineErrorStatusText(error, errorMessage)

    return {
      status: 0,
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
   * エラーの種類に基づいてステータステキストを決定
   */
  private determineErrorStatusText(error: unknown, errorMessage: string): string {
    if (this.isAbortError(error)) {
      return 'Request Timeout'
    }

    const errorCode = this.extractErrorCode(error)
    if (errorCode) {
      const statusFromCode = this.getStatusTextFromErrorCode(errorCode)
      if (statusFromCode) {
        return statusFromCode
      }
    }

    if (this.isTimeoutError(errorMessage)) {
      return 'Request Timeout'
    }

    return 'Network Error'
  }

  /**
   * AbortErrorかどうかを判定
   */
  private isAbortError(error: unknown): boolean {
    return Boolean(
      error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
    )
  }

  /**
   * エラーコードを抽出
   */
  private extractErrorCode(error: unknown): string | null {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as Error & { code?: string }).code || null
    }
    return null
  }

  /**
   * エラーコードからステータステキストを取得
   */
  private getStatusTextFromErrorCode(errorCode: string): string | null {
    const errorCodeMap: Record<string, string> = {
      ECONNREFUSED: 'Connection Refused',
      ENOTFOUND: 'Host Not Found',
      ETIMEDOUT: 'Connection Timeout',
      UND_ERR_CONNECT_TIMEOUT: 'Connection Timeout',
      UND_ERR_HEADERS_TIMEOUT: 'Request Timeout',
      UND_ERR_BODY_TIMEOUT: 'Request Timeout',
      ECONNRESET: 'Connection Reset'
    }

    return errorCodeMap[errorCode] || null
  }

  /**
   * タイムアウトエラーかどうかを判定
   */
  private isTimeoutError(errorMessage: string): boolean {
    return errorMessage.includes('timeout') || errorMessage.includes('aborted')
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
 * NodeHttpClientの作成を担当するファクトリークラス
 */
class NodeHttpClientFactory {
  constructor(
    private undiciLib: UndiciLibraryInterface,
    private fsModule: FsInterface,
    private certProvider: ClientCertificateConfigProvider
  ) {}

  /**
   * リクエスト関数を作成
   */
  createRequestFunction(globalSettings: MainProcessConfig): UndiciRequestInterface {
    const dispatcher = this.createDispatcher(globalSettings)

    return async (url: string, options: Parameters<UndiciRequestInterface>[1]) => {
      const finalDispatcher = this.createFinalDispatcher(url, dispatcher, globalSettings)

      const response = await this.undiciLib.request(url, {
        ...options,
        dispatcher: finalDispatcher
      })

      return this.normalizeResponse(response)
    }
  }

  /**
   * 基本ディスパッチャーを作成
   */
  private createDispatcher(globalSettings: MainProcessConfig): unknown {
    return this.undiciLib.getGlobalDispatcher().compose(
      this.undiciLib.interceptors.redirect({
        maxRedirections: globalSettings.defaultMaxRedirects || 5
      })
    )
  }

  /**
   * 最終的なディスパッチャーを作成（証明書対応含む）
   */
  private createFinalDispatcher(
    url: string,
    baseDispatcher: unknown,
    globalSettings: MainProcessConfig
  ): unknown {
    const certConfig = this.certProvider.getConfig()

    if (!certConfig.enabled || certConfig.certificates.length === 0) {
      return baseDispatcher
    }

    const matchingCert = this.findMatchingCertificate(url, certConfig)
    if (!matchingCert) {
      return baseDispatcher
    }

    return this.createTlsDispatcher(matchingCert, globalSettings, baseDispatcher)
  }

  /**
   * URLに一致する証明書を検索
   */
  private findMatchingCertificate(url: string, certConfig: ClientCertificateConfig) {
    const targetUrl = new URL(url)
    return certConfig.certificates.find(
      (cert) =>
        cert.enabled &&
        (!cert.host ||
          cert.host === targetUrl.hostname ||
          targetUrl.hostname.endsWith('.' + cert.host))
    )
  }

  /**
   * TLS証明書対応のディスパッチャーを作成
   */
  private createTlsDispatcher(
    cert: ClientCertificate,
    globalSettings: MainProcessConfig,
    baseDispatcher: unknown
  ): unknown {
    try {
      const certData = this.fsModule.readFileSync(cert.certPath, 'utf8')
      const keyData = this.fsModule.readFileSync(cert.keyPath, 'utf8')

      const tlsAgent = new this.undiciLib.Agent({
        connect: {
          cert: certData,
          key: keyData,
          passphrase: cert.passphrase || undefined,
          rejectUnauthorized: !globalSettings.allowInsecureConnections
        }
      })

      const dispatcher = tlsAgent.compose(
        this.undiciLib.interceptors.redirect({
          maxRedirections: globalSettings.defaultMaxRedirects || 5
        })
      )

      console.debug(`Using client certificate: ${cert.name}`)
      return dispatcher
    } catch (error) {
      console.error(`Failed to load client certificate ${cert.name}:`, error)
      return baseDispatcher
    }
  }

  /**
   * レスポンスを正規化
   */
  private normalizeResponse(response: {
    statusCode: number
    headers: Record<string, string | string[]>
    body: { arrayBuffer(): Promise<ArrayBuffer> }
  }) {
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
}

/**
 * ファクトリー関数：本物のundiciを使用
 */
export async function createNodeHttpClient(
  configProvider?: MainProcessConfigProvider,
  undiciLib?: UndiciLibraryInterface,
  fsModule?: FsInterface,
  certProvider?: ClientCertificateConfigProvider
): Promise<NodeHttpClientDI> {
  const realUndici = undiciLib || new RealUndiciLibrary()
  const realFs = fsModule || new RealFsModule()
  const realCertProvider = certProvider || new DefaultClientCertificateProvider()

  if (realUndici instanceof RealUndiciLibrary) {
    await realUndici.initialize()
  }
  if (realFs instanceof RealFsModule) {
    await realFs.initialize()
  }

  const provider = configProvider || new DynamicConfigProvider(getCurrentMainProcessConfig)
  const globalSettings = provider.getConfig()

  const factory = new NodeHttpClientFactory(realUndici, realFs, realCertProvider)
  const requestWithRedirect = factory.createRequestFunction(globalSettings)

  return new NodeHttpClientDI(
    requestWithRedirect,
    realUndici.ProxyAgent as ProxyAgentInterface,
    provider
  )
}

/**
 * ファクトリー関数：テスト用モック
 */
export function createMockNodeHttpClient(
  mockUndiciRequest: UndiciRequestInterface,
  MockProxyAgent?: ProxyAgentInterface,
  configProvider?: MainProcessConfigProvider
): NodeHttpClientDI {
  const provider = configProvider || new DefaultConfigProvider()
  return new NodeHttpClientDI(mockUndiciRequest, MockProxyAgent, provider)
}
