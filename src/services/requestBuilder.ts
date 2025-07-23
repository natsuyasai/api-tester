import { ApiRequest } from '@/types/types'
import { getGlobalSettings } from '@renderer/stores/globalSettingsStore'
import { ErrorHandler } from '@renderer/utils/errorUtils'
import { KeyValuePairOperations } from '@renderer/utils/keyValueUtils'

/**
 * HTTPリクエスト構築サービス
 */
export class RequestBuilder {
  private request: ApiRequest
  private variableResolver: (text: string) => string
  private getCookieHeader: ((domain: string) => string) | null = null

  constructor(
    request: ApiRequest,
    variableResolver?: (text: string) => string,
    getCookieHeader?: ((domain: string) => string) | null
  ) {
    this.request = request
    this.variableResolver = variableResolver || ((text: string) => text)
    this.getCookieHeader = getCookieHeader || null
  }

  /**
   * リクエスト設定を取得（グローバル設定をフォールバック）
   */
  getRequestSettings() {
    const globalSettings = getGlobalSettings()
    return {
      timeout: this.request.settings?.timeout ?? globalSettings.defaultTimeout,
      followRedirects:
        this.request.settings?.followRedirects ?? globalSettings.defaultFollowRedirects,
      maxRedirects: this.request.settings?.maxRedirects ?? globalSettings.defaultMaxRedirects,
      validateSSL: this.request.settings?.validateSSL ?? globalSettings.defaultValidateSSL,
      userAgent: this.request.settings?.userAgent ?? globalSettings.defaultUserAgent
    }
  }

  /**
   * URLを構築（パラメータ含む）
   */
  buildUrl(): URL {
    try {
      const url = new URL(this.variableResolver(this.request.url))

      // 有効なパラメータを追加
      const enabledParams = KeyValuePairOperations.getEnabled(this.request.params)
      enabledParams.forEach((param) => {
        url.searchParams.set(this.variableResolver(param.key), this.variableResolver(param.value))
      })

      return url
    } catch (_error) {
      const appError = ErrorHandler.handleValidationError('無効なURLです', {
        url: this.request.url,
        context: 'buildUrl'
      })
      throw new Error(appError.message)
    }
  }

  /**
   * ヘッダーを構築
   */
  buildHeaders(): Headers {
    const headers = new Headers()

    // 基本ヘッダーを設定
    const enabledHeaders = KeyValuePairOperations.getEnabled(this.request.headers)
    enabledHeaders.forEach((header) => {
      headers.set(this.variableResolver(header.key), this.variableResolver(header.value))
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
          headers.set('Authorization', `Bearer ${this.variableResolver(auth.bearer.token)}`)
        }
        break

      case 'api-key':
        if (auth.apiKey) {
          const key = this.variableResolver(auth.apiKey.key)
          const value = this.variableResolver(auth.apiKey.value)

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
        const url = new URL(this.variableResolver(this.request.url))
        const cookieHeader = this.getCookieHeader(url.hostname)
        if (cookieHeader) {
          headers.set('Cookie', cookieHeader)
        }
      } catch (error) {
        // Cookie設定エラーは警告レベル
        const appError = ErrorHandler.handleSystemError(error, {
          context: 'addCookieHeaders'
        })
        void ErrorHandler.logError(appError)
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
        return this.variableResolver(this.request.body)

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
      const enabledPairs = KeyValuePairOperations.getEnabled(this.request.bodyKeyValuePairs)
      const params = new URLSearchParams()

      enabledPairs.forEach((pair) => {
        params.append(this.variableResolver(pair.key), this.variableResolver(pair.value))
      })

      return params.toString()
    }
    return this.variableResolver(this.request.body)
  }

  /**
   * FormData bodyを構築
   */
  private buildFormDataBody(): FormData {
    const formData = new FormData()

    if (this.request.bodyKeyValuePairs) {
      const enabledPairs = KeyValuePairOperations.getEnabled(this.request.bodyKeyValuePairs)

      enabledPairs.forEach((pair) => {
        const key = this.variableResolver(pair.key)

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
          formData.append(key, this.variableResolver(pair.value))
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
      const key = this.variableResolver(this.request.auth.apiKey.key)
      const value = this.variableResolver(this.request.auth.apiKey.value)
      url.searchParams.set(key, value)
    }

    return url
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
        new URL(this.variableResolver(this.request.url))
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
