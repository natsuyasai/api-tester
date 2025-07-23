/**
 * IPC経由でAPI実行を行うサービス
 * Electronのレンダラープロセスから使用される
 */

import { ApiRequest, ApiResponse } from '@/types/types'

// 型ガード関数
function hasApiExecutor(): boolean {
  return (
    typeof window !== 'undefined' && 'apiExecutor' in window && window.apiExecutor !== undefined
  )
}

export class IpcApiService {
  /**
   * APIリクエストを実行（IPC経由）
   */
  static async executeRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    saveToHistory: boolean = true
  ): Promise<ApiResponse> {
    // Electronのレンダラープロセスかどうかを確認
    if (hasApiExecutor()) {
      const result = await window.apiExecutor.executeRequest(
        request,
        variableResolver,
        saveToHistory
      )

      if (result.success && result.response) {
        return result.response as ApiResponse
      } else {
        throw new Error(result.error || 'API実行に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      const { ApiServiceV2 } = await import('./apiServiceV2')
      return await ApiServiceV2.executeRequest(request, variableResolver, saveToHistory)
    }
  }

  /**
   * キャンセル可能なAPIリクエスト実行（IPC経由）
   */
  static async executeRequestWithCancel(
    request: ApiRequest,
    cancelToken: AbortSignal,
    variableResolver?: (text: string) => string,
    saveToHistory: boolean = true
  ): Promise<ApiResponse> {
    // ElectronのIPCではAbortSignalの転送は複雑なため、通常のexecuteRequestを使用
    if (hasApiExecutor()) {
      const result = await window.apiExecutor.executeRequestWithCancel(
        request,
        variableResolver,
        saveToHistory
      )

      if (result.success && result.response) {
        return result.response as ApiResponse
      } else {
        throw new Error(result.error || 'API実行に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      const { ApiServiceV2 } = await import('./apiServiceV2')
      return await ApiServiceV2.executeRequestWithCancel(
        request,
        cancelToken,
        variableResolver,
        saveToHistory
      )
    }
  }

  /**
   * APIリクエストの検証（IPC経由）
   */
  static async validateRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<string[]> {
    if (hasApiExecutor()) {
      const result = await window.apiExecutor.validateRequest(request, variableResolver)

      if (result.success && result.errors) {
        return result.errors
      } else {
        throw new Error(result.error || 'リクエストの検証に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      const { ApiServiceV2 } = await import('./apiServiceV2')
      return await ApiServiceV2.validateRequest(request, variableResolver)
    }
  }

  /**
   * cURLコマンドの生成（IPC経由）
   */
  static async buildCurlCommand(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<string> {
    if (hasApiExecutor()) {
      const result = await window.apiExecutor.buildCurlCommand(request, variableResolver)

      if (result.success && result.curlCommand) {
        return result.curlCommand
      } else {
        throw new Error(result.error || 'cURLコマンドの生成に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      const { ApiServiceV2 } = await import('./apiServiceV2')
      return ApiServiceV2.buildCurlCommand(request, variableResolver)
    }
  }

  /**
   * ヘルスチェック実行（IPC経由）
   */
  static async healthCheck(url: string): Promise<{
    isHealthy: boolean
    responseTime: number
    statusCode?: number
    error?: string
  }> {
    if (hasApiExecutor()) {
      const result = await window.apiExecutor.healthCheck(url)

      if (result.success && result.result) {
        return result.result as {
          isHealthy: boolean
          responseTime: number
          statusCode?: number
          error?: string
        }
      } else {
        throw new Error(result.error || 'ヘルスチェックに失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      const { ApiServiceV2 } = await import('./apiServiceV2')
      return await ApiServiceV2.healthCheck(url)
    }
  }

  /**
   * Cookie取得関数を設定
   * 注意: IPC経由では直接設定できないため、フォールバックのみ
   */
  static async setCookieResolver(resolver: (domain: string) => string): Promise<void> {
    // IPC経由では複雑なため、フォールバックのみ実装
    const { ApiServiceV2 } = await import('./apiServiceV2')
    return await ApiServiceV2.setCookieResolver(resolver)
  }

  /**
   * バッチリクエスト実行
   * IPC経由では非効率なため、フォールバックのみ
   */
  static async executeBatchRequests(
    requests: ApiRequest[],
    variableResolver?: (text: string) => string,
    maxConcurrency: number = 3
  ): Promise<ApiResponse[]> {
    // IPC経由では非効率なため、フォールバックのみ実装
    const { ApiServiceV2 } = await import('./apiServiceV2')
    return await ApiServiceV2.executeBatchRequests(requests, variableResolver, maxConcurrency)
  }

  /**
   * パフォーマンステスト実行
   * IPC経由では非効率なため、フォールバックのみ
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
    // IPC経由では非効率なため、フォールバックのみ実装
    const { ApiServiceV2 } = await import('./apiServiceV2')
    return await ApiServiceV2.runPerformanceTest(request, iterations, variableResolver)
  }
}
