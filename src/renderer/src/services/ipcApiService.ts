/**
 * IPC経由でAPI実行を行うサービス
 * Electronのレンダラープロセスから使用される
 */

import { ApiRequest, ApiResponse } from '@/types/types'
import { ApiServiceV2, GlobalVariableCallbacks } from '../../../services/apiServiceV2'
import { executePostScript } from '../../../services/postScriptEngine'

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
    saveToHistory: boolean = true,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string,
    globalVariableCallbacks?: GlobalVariableCallbacks
  ): Promise<ApiResponse> {
    // Electronのレンダラープロセスかどうかを確認
    if (hasApiExecutor()) {
      // 変数を事前に解決したリクエストを作成
      const resolvedRequest = this.resolveVariablesInRequest(
        request,
        variableResolver,
        sessionVariableResolver,
        sessionId
      )
      const result = await window.apiExecutor.executeRequest(
        resolvedRequest,
        undefined,
        saveToHistory
      )

      if (result.success && result.response) {
        const response = result.response as ApiResponse

        // ポストスクリプト実行（グローバル変数コールバックが提供されている場合）
        if (request.postScript && globalVariableCallbacks) {
          try {
            const postScriptResult = executePostScript(
              request.postScript,
              response,
              globalVariableCallbacks.setGlobalVariable,
              globalVariableCallbacks.getGlobalVariable
            )

            // ポストスクリプトのログを出力
            if (postScriptResult.logs.length > 0) {
              console.log('[PostScript Logs]:', postScriptResult.logs)
            }

            // エラーがある場合は警告を出力
            if (postScriptResult.error) {
              console.warn('[PostScript Error]:', postScriptResult.error)
            }
          } catch (error) {
            console.error('PostScript execution failed:', error)
          }
        }

        return response
      } else {
        throw new Error(result.error || 'API実行に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用（履歴保存は無効化）
      const response = await ApiServiceV2.executeRequest(
        request,
        variableResolver,
        false, // 履歴保存は無効化（IPCでの履歴処理と重複を防ぐため）
        sessionVariableResolver,
        sessionId
      )

      // フォールバック時にもポストスクリプトを実行
      if (request.postScript && globalVariableCallbacks) {
        try {
          const postScriptResult = executePostScript(
            request.postScript,
            response,
            globalVariableCallbacks.setGlobalVariable,
            globalVariableCallbacks.getGlobalVariable
          )

          // ポストスクリプトのログを出力
          if (postScriptResult.logs.length > 0) {
            console.log('[PostScript Logs]:', postScriptResult.logs)
          }

          // エラーがある場合は警告を出力
          if (postScriptResult.error) {
            console.warn('[PostScript Error]:', postScriptResult.error)
          }
        } catch (error) {
          console.error('PostScript execution failed:', error)
        }
      }

      return response
    }
  }

  /**
   * キャンセル可能なAPIリクエスト実行（IPC経由）
   */
  static async executeRequestWithCancel(
    request: ApiRequest,
    cancelToken: AbortSignal,
    variableResolver?: (text: string) => string,
    saveToHistory: boolean = true,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string,
    globalVariableCallbacks?: GlobalVariableCallbacks
  ): Promise<ApiResponse> {
    // ElectronのIPCではAbortSignalの転送は複雑なため、通常のexecuteRequestを使用
    if (hasApiExecutor()) {
      // 変数を事前に解決したリクエストを作成
      const resolvedRequest = this.resolveVariablesInRequest(
        request,
        variableResolver,
        sessionVariableResolver,
        sessionId
      )
      const result = await window.apiExecutor.executeRequestWithCancel(
        resolvedRequest,
        undefined,
        saveToHistory
      )

      if (result.success && result.response) {
        const response = result.response as ApiResponse

        // ポストスクリプト実行（グローバル変数コールバックが提供されている場合）
        if (request.postScript && globalVariableCallbacks) {
          try {
            const postScriptResult = executePostScript(
              request.postScript,
              response,
              globalVariableCallbacks.setGlobalVariable,
              globalVariableCallbacks.getGlobalVariable
            )

            // ポストスクリプトのログを出力
            if (postScriptResult.logs.length > 0) {
              console.log('[PostScript Logs]:', postScriptResult.logs)
            }

            // エラーがある場合は警告を出力
            if (postScriptResult.error) {
              console.warn('[PostScript Error]:', postScriptResult.error)
            }
          } catch (error) {
            console.error('PostScript execution failed:', error)
          }
        }

        return response
      } else {
        throw new Error(result.error || 'API実行に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用（履歴保存は無効化）
      return await ApiServiceV2.executeRequestWithCancel(
        request,
        cancelToken,
        variableResolver,
        false // 履歴保存は無効化（IPCでの履歴処理と重複を防ぐため）
      )
    }
  }

  /**
   * APIリクエストの検証（IPC経由）
   */
  static async validateRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): Promise<string[]> {
    if (hasApiExecutor()) {
      // 変数を事前に解決したリクエストを作成
      const resolvedRequest = this.resolveVariablesInRequest(
        request,
        variableResolver,
        sessionVariableResolver,
        sessionId
      )
      const result = await window.apiExecutor.validateRequest(resolvedRequest, undefined)

      if (result.success && result.errors) {
        return result.errors
      } else {
        throw new Error(result.error || 'リクエストの検証に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
      // ApiServiceV2にvalidateRequestメソッドがない場合は空配列を返す
      return []
    }
  }

  /**
   * リクエスト内の変数を事前に解決
   */
  private static resolveVariablesInRequest(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    sessionVariableResolver?: (text: string, sessionId?: string) => string,
    sessionId?: string
  ): ApiRequest {
    // 統合変数解決関数を作成
    const resolveAllVariables = (text: string): string => {
      let resolved = text
      // セッション変数を最初に解決
      if (sessionVariableResolver) {
        resolved = sessionVariableResolver(resolved, sessionId)
      }
      // 次にグローバル変数を解決
      if (variableResolver) {
        resolved = variableResolver(resolved)
      }
      return resolved
    }

    if (!variableResolver && !sessionVariableResolver) {
      return request
    }

    const resolvedRequest: ApiRequest = { ...request }

    // URLの変数解決
    resolvedRequest.url = resolveAllVariables(request.url)

    // ヘッダーの変数解決
    if (request.headers) {
      resolvedRequest.headers = request.headers.map((header) => ({
        ...header,
        key: resolveAllVariables(header.key),
        value: resolveAllVariables(header.value)
      }))
    }

    // クエリパラメータの変数解決
    if (request.params) {
      resolvedRequest.params = request.params.map((param) => ({
        ...param,
        key: resolveAllVariables(param.key),
        value: resolveAllVariables(param.value)
      }))
    }

    // ボディの変数解決
    if (request.body) {
      resolvedRequest.body = resolveAllVariables(request.body)
    }

    // フォームデータの変数解決
    if (request.bodyKeyValuePairs) {
      resolvedRequest.bodyKeyValuePairs = request.bodyKeyValuePairs.map((pair) => ({
        ...pair,
        key: resolveAllVariables(pair.key),
        value: resolveAllVariables(pair.value)
      }))
    }

    // 認証情報の変数解決
    if (request.auth) {
      const resolvedAuth = { ...request.auth }

      if (resolvedAuth.basic) {
        resolvedAuth.basic = {
          ...resolvedAuth.basic,
          username: resolveAllVariables(resolvedAuth.basic.username),
          password: resolveAllVariables(resolvedAuth.basic.password)
        }
      }

      if (resolvedAuth.bearer) {
        resolvedAuth.bearer = {
          ...resolvedAuth.bearer,
          token: resolveAllVariables(resolvedAuth.bearer.token)
        }
      }

      if (resolvedAuth.apiKey) {
        resolvedAuth.apiKey = {
          ...resolvedAuth.apiKey,
          key: resolveAllVariables(resolvedAuth.apiKey.key),
          value: resolveAllVariables(resolvedAuth.apiKey.value)
        }
      }

      resolvedRequest.auth = resolvedAuth
    }

    return resolvedRequest
  }

  /**
   * cURLコマンドの生成（IPC経由）
   */
  static async buildCurlCommand(
    request: ApiRequest,
    variableResolver?: (text: string) => string
  ): Promise<string> {
    if (hasApiExecutor()) {
      // 変数を事前に解決したリクエストを作成
      const resolvedRequest = this.resolveVariablesInRequest(request, variableResolver)
      const result = await window.apiExecutor.buildCurlCommand(resolvedRequest, undefined)

      if (result.success && result.curlCommand) {
        return result.curlCommand
      } else {
        throw new Error(result.error || 'cURLコマンドの生成に失敗しました')
      }
    } else {
      // フォールバック: 直接ApiServiceV2を使用
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
      return await ApiServiceV2.healthCheck(url)
    }
  }

  /**
   * Cookie取得関数を設定
   * 注意: IPC経由では直接設定できないため、フォールバックのみ
   */
  static async setCookieResolver(resolver: (domain: string) => string): Promise<void> {
    // IPC経由では複雑なため、フォールバックのみ実装
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
    return await ApiServiceV2.runPerformanceTest(request, iterations, variableResolver)
  }
}
