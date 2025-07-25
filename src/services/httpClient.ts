import { ApiRequest, ApiResponse } from '@/types/types'
import { RequestBuilder } from './requestBuilder'
import { ResponseProcessor } from './responseProcessor'

/**
 * HTTP通信クライアント
 */
export class HttpClient {
  private getCookieHeader: ((domain: string) => string) | null = null

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
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): Promise<ApiResponse> {
    const startTime = Date.now()
    const resolveVariables = variableResolver || ((text: string) => text)

    try {
      // リクエストビルダーを作成
      const builder = new RequestBuilder(
        request,
        resolveVariables,
        this.getCookieHeader,
        sessionVariableResolver,
        sessionId
      )

      // リクエスト検証
      const validationErrors = builder.validate()
      if (validationErrors.length > 0) {
        throw new Error(`Request validation failed: ${validationErrors.join(', ')}`)
      }

      // URL と fetch オプションを構築
      let url = builder.buildUrl()
      url = builder.adjustUrlForApiKey(url)
      const fetchOptions = builder.buildFetchOptions()

      // プロキシ設定を適用
      const finalOptions = this.applyProxySettings(fetchOptions, url.toString())

      // リクエスト実行
      const response = await fetch(url.toString(), finalOptions)

      // レスポンス処理
      const processor = new ResponseProcessor(response, startTime)
      return await processor.processResponse()
    } catch (error) {
      // エラーレスポンスを作成
      return ResponseProcessor.createErrorResponse(error, startTime)
    }
  }

  /**
   * プロキシ設定を適用
   */
  private applyProxySettings(options: RequestInit, _url: string): RequestInit {
    // プロキシ設定はElectronメインプロセスで処理されるため、レンダラープロセスでは無効
    return options
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

      // URL と fetch オプションを構築
      let url = builder.buildUrl()
      url = builder.adjustUrlForApiKey(url)
      const fetchOptions = builder.buildFetchOptions()

      // キャンセルトークンを設定
      if (cancelToken) {
        fetchOptions.signal = cancelToken
      }

      // プロキシ設定を適用
      const finalOptions = this.applyProxySettings(fetchOptions, url.toString())

      // リクエスト実行
      const response = await fetch(url.toString(), finalOptions)

      // レスポンス処理
      const processor = new ResponseProcessor(response, startTime)
      return await processor.processResponse()
    } catch (error) {
      return ResponseProcessor.createErrorResponse(error, startTime)
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
