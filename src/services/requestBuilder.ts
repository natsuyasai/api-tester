import { ApiRequest } from '@/types/types'

/**
 * HTTPリクエスト構築サービス
 */
export class RequestBuilder {
  private request: ApiRequest
  private variableResolver: (text: string) => string
  private getCookieHeader: ((domain: string) => string) | null = null
  private sessionVariableResolver: ((text: string, sessionId?: string) => string) | null = null
  private sessionId?: string

  constructor(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    getCookieHeader?: ((domain: string) => string) | null,
    sessionVariableResolver?: ((text: string, sessionId?: string) => string) | null,
    sessionId?: string
  ) {
    this.request = request
    this.variableResolver = variableResolver || ((text: string) => text)
    this.getCookieHeader = getCookieHeader || null
    this.sessionVariableResolver = sessionVariableResolver || null
    this.sessionId = sessionId
  }

  /**
   * リクエスト設定を取得（デフォルト値をフォールバック）
   */
  getRequestSettings() {
    return {
      timeout: this.request.settings?.timeout ?? 30000,
      followRedirects: this.request.settings?.followRedirects ?? true,
      maxRedirects: this.request.settings?.maxRedirects ?? 5,
      validateSSL: this.request.settings?.validateSSL ?? true,
      userAgent: this.request.settings?.userAgent ?? 'API-Tester/1.0'
    }
  }

  /**
   * 変数を解決するためのヘルパーメソッド
   */
  private resolveAllVariables(text: string): string {
    let resolved = text

    // セッション変数を最初に解決
    if (this.sessionVariableResolver) {
      resolved = this.sessionVariableResolver(resolved, this.sessionId)
    }

    // 次にグローバル変数を解決
    resolved = this.variableResolver(resolved)

    return resolved
  }

  /**
   * URLを構築（パラメータ含む）
   */
  buildUrl(): URL {
    try {
      const url = new URL(this.resolveAllVariables(this.request.url))

      // 有効なパラメータを追加
      const enabledParams = this.request.params.filter((param) => param.enabled && param.key.trim())
      enabledParams.forEach((param) => {
        url.searchParams.set(
          this.resolveAllVariables(param.key),
          this.resolveAllVariables(param.value)
        )
      })

      return url
    } catch (_error) {
      throw new Error(`無効なURLです: ${this.request.url}`)
    }
  }

  /**
   * ヘッダーを構築
   */
  buildHeaders(): Headers {
    const headers = new Headers()

    // 基本ヘッダーを設定
    const enabledHeaders = this.request.headers.filter(
      (header) => header.enabled && header.key.trim()
    )
    enabledHeaders.forEach((header) => {
      headers.set(this.resolveAllVariables(header.key), this.resolveAllVariables(header.value))
    })

    // 認証ヘッダーを追加
    this.addAuthHeaders(headers)

    // Cookieヘッダーを追加
    this.addCookieHeaders(headers)

    // Content-Typeを自動設定
    this.setContentType(headers)

    // User-Agentを設定
    const settings = this.getRequestSettings()
    if (settings.userAgent && !headers.has('User-Agent')) {
      headers.set('User-Agent', settings.userAgent)
    }

    return headers
  }

  /**
   * 認証ヘッダーを追加
   */
  private addAuthHeaders(headers: Headers): void {
    if (!this.request.auth || this.request.auth.type === 'none') {
      return
    }

    const auth = this.request.auth

    switch (auth.type) {
      case 'basic':
        if (auth.basic) {
          const credentials = btoa(`${auth.basic.username}:${auth.basic.password}`)
          headers.set('Authorization', `Basic ${credentials}`)
        }
        break

      case 'bearer':
        if (auth.bearer) {
          headers.set('Authorization', `Bearer ${this.resolveAllVariables(auth.bearer.token)}`)
        }
        break

      case 'api-key':
        if (auth.apiKey) {
          const key = this.resolveAllVariables(auth.apiKey.key)
          const value = this.resolveAllVariables(auth.apiKey.value)

          if (auth.apiKey.location === 'header') {
            headers.set(key, value)
          }
          // Query parameter API keys are handled in buildUrl()
        }
        break
    }
  }

  /**
   * Cookieヘッダーを追加
   */
  private addCookieHeaders(headers: Headers): void {
    if (this.getCookieHeader) {
      try {
        const url = new URL(this.resolveAllVariables(this.request.url))
        const cookieHeader = this.getCookieHeader(url.hostname)
        if (cookieHeader) {
          headers.set('Cookie', cookieHeader)
        }
      } catch (error) {
        // Cookie設定エラーは警告レベル
        console.warn('Cookie設定エラー:', error)
      }
    }
  }

  /**
   * Content-Typeを自動設定
   */
  private setContentType(headers: Headers): void {
    if (this.request.method === 'GET' || this.request.method === 'HEAD') {
      return
    }

    if (!headers.has('Content-Type')) {
      switch (this.request.bodyType) {
        case 'json':
        case 'graphql':
          headers.set('Content-Type', 'application/json')
          break
        case 'x-www-form-urlencoded':
          headers.set('Content-Type', 'application/x-www-form-urlencoded')
          break
        case 'form-data':
          // FormDataのContent-Typeはブラウザが自動設定
          break
        case 'raw':
          headers.set('Content-Type', 'text/plain')
          break
      }
    }
  }

  /**
   * リクエストボディを構築
   */
  buildBody(): string | FormData | null {
    if (this.request.method === 'GET' || this.request.method === 'HEAD') {
      return null
    }

    switch (this.request.bodyType) {
      case 'json':
      case 'raw':
      case 'graphql':
        return this.resolveAllVariables(this.request.body)

      case 'x-www-form-urlencoded':
        return this.buildFormUrlEncodedBody()

      case 'form-data':
        return this.buildFormDataBody()

      default:
        return null
    }
  }

  /**
   * URL-encoded form bodyを構築
   */
  private buildFormUrlEncodedBody(): string {
    if (this.request.bodyKeyValuePairs) {
      const enabledPairs = this.request.bodyKeyValuePairs.filter(
        (pair) => pair.enabled && pair.key.trim()
      )
      const params = new URLSearchParams()

      enabledPairs.forEach((pair) => {
        params.append(this.resolveAllVariables(pair.key), this.resolveAllVariables(pair.value))
      })

      return params.toString()
    }
    return this.resolveAllVariables(this.request.body)
  }

  /**
   * FormData bodyを構築
   */
  private buildFormDataBody(): FormData {
    const formData = new FormData()

    if (this.request.bodyKeyValuePairs) {
      const enabledPairs = this.request.bodyKeyValuePairs.filter(
        (pair) => pair.enabled && pair.key.trim()
      )

      enabledPairs.forEach((pair) => {
        const key = this.resolveAllVariables(pair.key)

        if (pair.isFile && pair.fileContent) {
          // ファイルの場合
          let blob: Blob

          if (pair.fileEncoding === 'base64') {
            const binaryString = atob(pair.fileContent)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            blob = new Blob([bytes])
          } else {
            blob = new Blob([pair.fileContent])
          }

          formData.append(key, blob, pair.fileName || 'file')
        } else {
          // 通常の値
          formData.append(key, this.resolveAllVariables(pair.value))
        }
      })
    }

    return formData
  }

  /**
   * fetch APIのオプションを構築
   */
  buildFetchOptions(): RequestInit {
    const settings = this.getRequestSettings()

    return {
      method: this.request.method,
      headers: this.buildHeaders(),
      body: this.buildBody(),
      redirect: settings.followRedirects ? 'follow' : 'manual',
      signal: AbortSignal.timeout(settings.timeout)
    }
  }

  /**
   * APIキーがクエリパラメータの場合のURL調整
   */
  adjustUrlForApiKey(url: URL): URL {
    if (this.request.auth?.type === 'api-key' && this.request.auth.apiKey?.location === 'query') {
      const key = this.resolveAllVariables(this.request.auth.apiKey.key)
      const value = this.resolveAllVariables(this.request.auth.apiKey.value)
      url.searchParams.set(key, value)
    }

    return url
  }

  /**
   * 実行時のリクエスト内容を取得（変数展開済み）
   */
  getExecutedRequest(): ApiRequest {
    // 元のリクエストをコピー
    const executedRequest: ApiRequest = {
      ...this.request,
      // 基本情報を変数展開
      url: this.resolveAllVariables(this.request.url),
      // ヘッダーを変数展開
      headers: this.request.headers.map((header) => ({
        ...header,
        key: this.resolveAllVariables(header.key),
        value: this.resolveAllVariables(header.value)
      })),
      // パラメータを変数展開
      params: this.request.params.map((param) => ({
        ...param,
        key: this.resolveAllVariables(param.key),
        value: this.resolveAllVariables(param.value)
      })),
      // ボディを変数展開
      body: this.resolveAllVariables(this.request.body),
      // ボディキーバリューペアを変数展開
      bodyKeyValuePairs: this.request.bodyKeyValuePairs?.map((pair) => ({
        ...pair,
        key: this.resolveAllVariables(pair.key),
        value: this.resolveAllVariables(pair.value),
        fileName: pair.fileName ? this.resolveAllVariables(pair.fileName) : pair.fileName
      }))
    }

    // 認証情報を変数展開
    if (this.request.auth && this.request.auth.type !== 'none') {
      executedRequest.auth = { ...this.request.auth }

      switch (this.request.auth.type) {
        case 'bearer':
          if (this.request.auth.bearer) {
            executedRequest.auth.bearer = {
              token: this.resolveAllVariables(this.request.auth.bearer.token)
            }
          }
          break
        case 'api-key':
          if (this.request.auth.apiKey) {
            executedRequest.auth.apiKey = {
              ...this.request.auth.apiKey,
              key: this.resolveAllVariables(this.request.auth.apiKey.key),
              value: this.resolveAllVariables(this.request.auth.apiKey.value)
            }
          }
          break
        // Basic認証は平文なのでそのまま
      }
    }

    // GraphQL変数も変数展開
    if (this.request.variables) {
      executedRequest.variables = { ...this.request.variables }
      for (const [key, value] of Object.entries(this.request.variables)) {
        if (typeof value === 'string') {
          executedRequest.variables[key] = this.resolveAllVariables(value)
        }
      }
    }

    // PostScriptも変数展開
    if (this.request.postScript) {
      executedRequest.postScript = this.resolveAllVariables(this.request.postScript)
    }

    return executedRequest
  }

  /**
   * リクエスト検証
   */
  validate(): string[] {
    const errors: string[] = []

    // URL検証
    if (!this.request.url.trim()) {
      errors.push('URLは必須です')
    } else {
      try {
        new URL(this.resolveAllVariables(this.request.url))
      } catch {
        errors.push('無効なURL形式です')
      }
    }

    // ヘッダー検証
    const invalidHeaders = this.request.headers
      .filter((h) => h.enabled && h.key.trim())
      .filter((h) => !/^[a-zA-Z0-9\-_]+$/.test(h.key))

    if (invalidHeaders.length > 0) {
      errors.push('無効なヘッダー名があります')
    }

    // 認証設定検証
    if (this.request.auth && this.request.auth.type !== 'none') {
      const authErrors = this.validateAuth()
      errors.push(...authErrors)
    }

    return errors
  }

  /**
   * 認証設定の検証
   */
  private validateAuth(): string[] {
    const errors: string[] = []
    const auth = this.request.auth!

    switch (auth.type) {
      case 'basic':
        if (!auth.basic?.username) errors.push('Basic認証のユーザー名は必須です')
        if (!auth.basic?.password) errors.push('Basic認証のパスワードは必須です')
        break

      case 'bearer':
        if (!auth.bearer?.token) errors.push('Bearer tokenは必須です')
        break

      case 'api-key':
        if (!auth.apiKey?.key) errors.push('API Keyの名前は必須です')
        if (!auth.apiKey?.value) errors.push('API Keyの値は必須です')
        break
    }

    return errors
  }
}
