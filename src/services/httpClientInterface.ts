import { ApiRequest, ApiResponse } from '@/types/types'

/**
 * HTTPクライアントインターフェース
 * テスタビリティのために依存性注入を可能にする
 */
export interface HttpClientInterface {
  executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<ApiResponse>

  executeRequestWithCancel(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    cancelToken?: AbortSignal
  ): Promise<ApiResponse>

  validateRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): string[]

  getRequestDetails(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): any

  setCookieResolver(resolver: (domain: string) => string): void
}

/**
 * undici request関数のインターフェース
 */
export interface UndiciRequestInterface {
  (url: string, options?: any): Promise<{
    statusCode: number
    headers: Record<string, string>
    body: {
      arrayBuffer(): Promise<ArrayBuffer>
    }
  }>
}

/**
 * ProxyAgentクラスのインターフェース
 */
export interface ProxyAgentInterface {
  new (options: { uri: string; auth?: string }): any
}