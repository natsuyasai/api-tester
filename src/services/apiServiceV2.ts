import { ApiRequest, ApiResponse } from '@/types/types'
import { createNodeHttpClient } from '../main/services/nodeHttpClientDI'
import { HttpClient } from './httpClient'
import { HttpClientInterface } from './httpClientInterface'

/**
 * リファクタリング版APIサービス
 * 責任を分離し、型安全性を向上
 */
export class ApiServiceV2 {
  private static httpClientPromise: Promise<HttpClient | HttpClientInterface> | null = null

  /**
   * HTTPクライアントのインスタンスを取得（非同期初期化対応）
   */
  private static async getHttpClient(): Promise<HttpClient | HttpClientInterface> {
    if (!this.httpClientPromise) {
      this.httpClientPromise = this.createHttpClient()
    }
    return await this.httpClientPromise
  }

  /**
   * 実行環境に応じて適切なHTTPクライアントを作成
   */
  private static async createHttpClient(): Promise<HttpClient | HttpClientInterface> {
    // Node.js環境またはElectronメインプロセス（windowが存在しない）
    if (
      typeof process !== 'undefined' &&
      process.versions &&
      (process.versions.node || process.versions.electron) &&
      typeof window === 'undefined'
    ) {
      return await createNodeHttpClient()
    }

    // ブラウザ環境またはElectronレンダラープロセス
    return new HttpClient()
  }

  /**
   * Cookie取得関数を設定
   */
  static async setCookieResolver(resolver: (domain: string) => string): Promise<void> {
    const httpClient = await this.getHttpClient()
    httpClient.setCookieResolver(resolver)
  }

  /**
   * APIリクエストを実行
   */
  static async executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    saveToHistory: boolean = true
  ): Promise<ApiResponse> {
    const startTime = Date.now()
    let executionStatus: 'success' | 'error' = 'success'
    let errorMessage: string | undefined

    try {
      // HTTPリクエストを実行
      const httpClient = await this.getHttpClient()
      const apiResponse = await httpClient.executeRequest(request, variableResolver)

      // ステータスによってエラー判定
      if (apiResponse.status >= 400) {
        executionStatus = 'error'
        errorMessage = `HTTP ${apiResponse.status}: ${apiResponse.statusText}`
      }

      // 実行履歴に保存
      if (saveToHistory) {
        const duration = apiResponse.duration
        this.saveToHistory(request, apiResponse, duration, executionStatus, errorMessage)
      }

      return apiResponse
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      executionStatus = 'error'

      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('API execution error:', errorMessage)

      // エラーレスポンスを作成
      const errorResponse = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: {
          type: 'error' as const,
          error: errorMessage,
          contentType: 'text/plain'
        },
        duration,
        timestamp: new Date().toISOString()
      }

      // エラーの場合も実行履歴に保存
      if (saveToHistory) {
        this.saveToHistory(request, errorResponse, duration, executionStatus, errorMessage)
      }

      return errorResponse
    }
  }

  /**
   * キャンセル可能なリクエスト実行
   */
  static async executeRequestWithCancel(
    request: ApiRequest,
    cancelToken: AbortSignal,
    variableResolver?: (text: string) => string,
    saveToHistory: boolean = true
  ): Promise<ApiResponse> {
    const startTime = Date.now()
    let executionStatus: 'success' | 'error' = 'success'
    let errorMessage: string | undefined

    try {
      const httpClient = await this.getHttpClient()
      const apiResponse = await httpClient.executeRequestWithCancel(
        request,
        variableResolver,
        cancelToken
      )

      if (apiResponse.status >= 400) {
        executionStatus = 'error'
        errorMessage = `HTTP ${apiResponse.status}: ${apiResponse.statusText}`
      }

      if (saveToHistory) {
        this.saveToHistory(
          request,
          apiResponse,
          apiResponse.duration,
          executionStatus,
          errorMessage
        )
      }

      return apiResponse
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      executionStatus = 'error'

      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('API execution error (with cancel):', errorMessage)

      const errorResponse = {
        status: 0,
        statusText:
          error instanceof Error && error.name === 'AbortError' ? 'Cancelled' : 'Network Error',
        headers: {},
        data: {
          type: 'error' as const,
          error: errorMessage,
          contentType: 'text/plain'
        },
        duration,
        timestamp: new Date().toISOString()
      }

      if (saveToHistory) {
        this.saveToHistory(request, errorResponse, duration, executionStatus, errorMessage)
      }

      return errorResponse
    }
  }

  /**
   * リクエストの検証（拡張版）
   */
  static async validateRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<string[]> {
    const httpClient = await this.getHttpClient()
    const basicValidation = httpClient.validateRequest(request, variableResolver)
    const advancedValidation = this.validateRequestAdvanced(request)

    return [...basicValidation, ...advancedValidation]
  }

  /**
   * 高度なリクエスト検証
   */
  private static validateRequestAdvanced(request: ApiRequest): string[] {
    const errors: string[] = []

    // JSON形式の検証
    if (request.bodyType === 'json' && request.body) {
      try {
        JSON.parse(request.body)
      } catch {
        errors.push('Invalid JSON in request body')
      }
    }

    // FormDataの検証
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

    // GraphQLの検証
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

      // GraphQL変数の妥当性チェック
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

  /**
   * リクエストの詳細情報を取得（デバッグ用）
   */
  static async getRequestDetails(request: ApiRequest, variableResolver?: (text: string) => string) {
    const httpClient = await this.getHttpClient()
    return httpClient.getRequestDetails(request, variableResolver)
  }

  /**
   * 実行履歴への保存
   * 注意: Node.js環境では履歴保存は行わない（レンダラープロセス専用機能）
   */
  private static saveToHistory(
    request: ApiRequest,
    response: ApiResponse,
    duration: number,
    executionStatus: 'success' | 'error',
    errorMessage?: string
  ): void {
    // Node.js環境（メインプロセス）では履歴保存をスキップ
    if (typeof window === 'undefined') {
      return
    }

    try {
      // レンダラープロセスでのみ実行
      if (typeof window !== 'undefined' && 'useCollectionStore' in window) {
        // 動的にcollectionStoreにアクセス
        const windowWithStore = window as Window & {
          useCollectionStore?: {
            getState: () => {
              addExecutionHistory?: (
                request: ApiRequest,
                response: ApiResponse,
                duration: number,
                executionStatus: string,
                errorMessage?: string
              ) => void
            }
          }
        }
        const collectionStore = windowWithStore.useCollectionStore
        if (collectionStore && typeof collectionStore.getState === 'function') {
          const { addExecutionHistory } = collectionStore.getState()
          if (typeof addExecutionHistory === 'function') {
            addExecutionHistory(request, response, duration, executionStatus, errorMessage)
          }
        }
      }
    } catch (historyError) {
      console.error('Failed to save execution history:', historyError)
    }
  }

  /**
   * 複数リクエストのバッチ実行
   */
  static async executeBatchRequests(
    requests: ApiRequest[],
    variableResolver?: (text: string) => string,
    maxConcurrency: number = 3
  ): Promise<ApiResponse[]> {
    const results: ApiResponse[] = []

    // 並行実行数を制限
    const chunks = this.chunkArray(requests, maxConcurrency)

    for (const chunk of chunks) {
      const promises = chunk.map((request) => this.executeRequest(request, variableResolver, true))

      const chunkResults = await Promise.all(promises)
      results.push(...chunkResults)
    }

    return results
  }

  /**
   * 配列を指定サイズのチャンクに分割
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * パフォーマンステスト実行
   */
  static async runPerformanceTest(
    request: ApiRequest,
    iterations: number,
    variableResolver?: (text: string) => string
  ): Promise<{
    results: ApiResponse[]
    statistics: {
      averageDuration: number
      minDuration: number
      maxDuration: number
      successRate: number
      errorCount: number
    }
  }> {
    const results: ApiResponse[] = []

    for (let i = 0; i < iterations; i++) {
      const result = await this.executeRequest(request, variableResolver, false)
      results.push(result)
    }

    // 統計情報を計算
    const durations = results.map((r) => r.duration)
    const successCount = results.filter((r) => r.status >= 200 && r.status < 400).length
    const errorCount = iterations - successCount

    const statistics = {
      averageDuration: durations.reduce((a, b) => a + b, 0) / iterations,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / iterations) * 100,
      errorCount
    }

    return { results, statistics }
  }

  /**
   * ヘルスチェック実行
   */
  static async healthCheck(url: string): Promise<{
    isHealthy: boolean
    responseTime: number
    statusCode?: number
    error?: string
  }> {
    const request: ApiRequest = {
      id: 'health-check',
      name: 'Health Check',
      url,
      method: 'GET',
      headers: [],
      params: [],
      body: '',
      bodyType: 'json',
      type: 'rest'
    }

    try {
      const response = await this.executeRequest(request, undefined, false)

      // ステータス0はネットワークエラー
      if (response.status === 0) {
        return {
          isHealthy: false,
          responseTime: response.duration,
          error:
            response.data && typeof response.data === 'object' && 'error' in response.data
              ? String(response.data.error)
              : 'Network error'
        }
      }

      return {
        isHealthy: response.status >= 200 && response.status < 400,
        responseTime: response.duration,
        statusCode: response.status
      }
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * cURLコマンドの生成
   */
  static buildCurlCommand(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): string {
    const resolveVariables = variableResolver || ((text: string) => text)

    try {
      const url = this.buildCurlUrl(request, resolveVariables)
      let command = `curl -X ${request.method}`

      command += this.buildCurlHeaders(request, resolveVariables)
      command += this.buildCurlAuth(request, resolveVariables, url)
      command += this.buildCurlBody(request, resolveVariables)
      command += ` "${url.toString()}"`

      return command
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`Invalid request for cURL generation: ${errorMessage}`)
    }
  }

  /**
   * cURL用のURLを構築
   */
  private static buildCurlUrl(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): URL {
    const url = new URL(resolveVariables(request.url))

    const enabledParams = request.params.filter((param) => param.enabled && param.key)
    enabledParams.forEach((param) => {
      url.searchParams.set(resolveVariables(param.key), resolveVariables(param.value))
    })

    return url
  }

  /**
   * cURL用のヘッダーを構築
   */
  private static buildCurlHeaders(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): string {
    const enabledHeaders = request.headers.filter((header) => header.enabled && header.key)

    return enabledHeaders
      .map((header) => {
        const key = resolveVariables(header.key)
        const value = resolveVariables(header.value)
        return ` -H "${key}: ${value}"`
      })
      .join('')
  }

  /**
   * cURL用の認証を構築
   */
  private static buildCurlAuth(
    request: ApiRequest,
    resolveVariables: (text: string) => string,
    url: URL
  ): string {
    if (!request.auth) {
      return ''
    }

    switch (request.auth.type) {
      case 'basic':
        return this.buildBasicAuth(request.auth.basic)
      case 'bearer':
        return this.buildBearerAuth(request.auth.bearer, resolveVariables)
      case 'api-key':
        return this.buildApiKeyAuth(request.auth.apiKey, resolveVariables, url)
      default:
        return ''
    }
  }

  /**
   * Basic認証のcURL部分を構築
   */
  private static buildBasicAuth(basic: any): string {
    if (!basic) return ''
    return ` -u "${basic.username}:${basic.password}"`
  }

  /**
   * Bearer認証のcURL部分を構築
   */
  private static buildBearerAuth(bearer: any, resolveVariables: (text: string) => string): string {
    if (!bearer) return ''
    const token = resolveVariables(bearer.token)
    return ` -H "Authorization: Bearer ${token}"`
  }

  /**
   * APIキー認証のcURL部分を構築
   */
  private static buildApiKeyAuth(
    apiKey: any,
    resolveVariables: (text: string) => string,
    url: URL
  ): string {
    if (!apiKey) return ''

    const key = resolveVariables(apiKey.key)
    const value = resolveVariables(apiKey.value)

    if (apiKey.location === 'header') {
      return ` -H "${key}: ${value}"`
    }

    if (apiKey.location === 'query') {
      url.searchParams.set(key, value)
    }

    return ''
  }

  /**
   * cURL用のボディを構築
   */
  private static buildCurlBody(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): string {
    if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return ''
    }

    switch (request.bodyType) {
      case 'form-data':
        return this.buildFormDataBody(request, resolveVariables)
      case 'x-www-form-urlencoded':
        return this.buildUrlEncodedBody(request, resolveVariables)
      default:
        return this.buildRawBody(request, resolveVariables)
    }
  }

  /**
   * FormDataボディを構築
   */
  private static buildFormDataBody(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): string {
    const enabledPairs =
      request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []

    return enabledPairs
      .map((pair) => {
        const key = resolveVariables(pair.key)

        if (pair.isFile && pair.fileName) {
          return ` -F "${key}=@${pair.fileName}"`
        }

        const value = resolveVariables(pair.value)
        return ` -F "${key}=${value}"`
      })
      .join('')
  }

  /**
   * URL-encodedボディを構築
   */
  private static buildUrlEncodedBody(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): string {
    const enabledPairs =
      request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []

    if (enabledPairs.length === 0) {
      return ''
    }

    const formData = enabledPairs
      .map((pair) => {
        const key = encodeURIComponent(resolveVariables(pair.key))
        const value = encodeURIComponent(resolveVariables(pair.value))
        return `${key}=${value}`
      })
      .join('&')

    return ` -d "${formData}" -H "Content-Type: application/x-www-form-urlencoded"`
  }

  /**
   * 生のボディを構築
   */
  private static buildRawBody(
    request: ApiRequest,
    resolveVariables: (text: string) => string
  ): string {
    if (!request.body) {
      return ''
    }

    const body = resolveVariables(request.body)

    if (request.bodyType === 'graphql') {
      const graphqlPayload = {
        query: body,
        variables: request.variables || {},
        operationName: this.extractOperationName(body)
      }
      return ` -d '${JSON.stringify(graphqlPayload)}'`
    }

    return ` -d '${body}'`
  }

  /**
   * GraphQLクエリからオペレーション名を抽出
   */
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
