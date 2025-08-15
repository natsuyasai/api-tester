import type { Dispatcher } from 'undici-types'
import { ApiRequest, ApiResponse } from '@/types/types'

/**
 * HTTPクライアントインターフェース
 * テスタビリティのために依存性注入を可能にする
 */
export interface HttpClientInterface {
  executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): Promise<ApiResponse>

  executeRequestWithCancel(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    cancelToken?: AbortSignal,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): Promise<ApiResponse>

  validateRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): string[]

  getRequestDetails(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ):
    | {
        url: string
        method: string
        headers: Record<string, string>
        body: string | FormData | null
        settings: unknown
      }
    | { error: string; context: string }

  setCookieResolver(resolver: (domain: string) => string): void
}

/**
 * undici request関数のインターフェース
 */
export interface UndiciRequestInterface {
  (
    url: string,
    options?: Dispatcher.RequestOptions
  ): Promise<{
    statusCode: number
    headers: Record<string, string>
    body: {
      arrayBuffer(): Promise<ArrayBuffer>
    }
    url?: string
  }>
}

/**
 * ProxyAgentクラスのインターフェース
 */
export interface ProxyAgentInterface {
  new (options: { uri: string; auth?: string }): Dispatcher
}
