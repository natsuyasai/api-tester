import { Cookie } from '@/types/types'
import { useCookieStore } from '@renderer/stores/cookieStore'
import { useSessionStore } from '@renderer/stores/sessionStore'

/**
 * 統合Cookieリゾルバーサービス
 * CookieストアとSessionストアの両方からCookieを取得し、
 * HTTPリクエストのCookieヘッダーを生成する
 */
export class CookieResolverService {
  /**
   * 指定ドメインに対するCookieヘッダーを生成
   * @param domain リクエスト先のドメイン
   * @param sessionId アクティブなセッションID（省略可）
   * @returns Cookieヘッダー文字列
   */
  static generateCookieHeader(domain: string, sessionId?: string): string {
    const allCookies = this.getAllMatchingCookies(domain, sessionId)

    if (allCookies.length === 0) {
      return ''
    }

    // Cookie名=値の形式で結合
    return allCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  }

  /**
   * ドメインにマッチするすべてのCookieを取得
   * グローバルCookieストア + アクティブセッションのCookie
   * @param domain リクエスト先のドメイン
   * @param sessionId セッションID（省略可）
   * @returns マッチするCookieの配列
   */
  static getAllMatchingCookies(domain: string, sessionId?: string): Cookie[] {
    const allCookies: Cookie[] = []

    try {
      // 1. グローバルCookieストアからCookieを取得
      const cookieStore = useCookieStore.getState()
      const globalCookies = cookieStore.getCookiesForDomain(domain)
      allCookies.push(...globalCookies)

      // 2. セッションストアからCookieを取得
      const sessionStore = useSessionStore.getState()
      const effectiveSessionId = sessionId || sessionStore.activeSessionId

      if (effectiveSessionId) {
        const sessionCookies = sessionStore.getSessionCookies(effectiveSessionId)
        const matchingSessionCookies = sessionCookies.filter((cookie) =>
          this.isDomainMatch(cookie.domain, domain)
        )
        allCookies.push(...matchingSessionCookies)
      }

      // 3. 重複を除去（セッションCookieが優先）
      const uniqueCookies = this.removeDuplicates(allCookies)

      // 4. 有効期限チェック
      const validCookies = uniqueCookies.filter((cookie) => this.isValidCookie(cookie))

      return validCookies
    } catch (error) {
      console.error('Error getting matching cookies:', error)
      return []
    }
  }

  /**
   * ドメインがマッチするかチェック
   * @param cookieDomain Cookieのドメイン設定
   * @param requestDomain リクエスト先ドメイン
   * @returns マッチするかどうか
   */
  private static isDomainMatch(cookieDomain: string, requestDomain: string): boolean {
    if (!cookieDomain) return true // 空の場合はすべてのドメインにマッチ

    // 完全一致
    if (cookieDomain === requestDomain) return true

    // サブドメインマッチング (.example.com は subdomain.example.com にマッチ)
    if (cookieDomain.startsWith('.') && requestDomain.endsWith(cookieDomain.substring(1))) {
      return true
    }

    return false
  }

  /**
   * 重複Cookieを除去（同名の場合、セッションCookieを優先）
   * @param cookies Cookie配列
   * @returns 重複除去後のCookie配列
   */
  private static removeDuplicates(cookies: Cookie[]): Cookie[] {
    const cookieMap = new Map<string, Cookie>()

    cookies.forEach((cookie) => {
      const key = `${cookie.name}:${cookie.domain}:${cookie.path}`

      // 既存のCookieがない、または新しいCookieがセッションCookieの場合は上書き
      if (!cookieMap.has(key)) {
        cookieMap.set(key, cookie)
      }
    })

    return Array.from(cookieMap.values())
  }

  /**
   * Cookieが有効かチェック（有効期限など）
   * @param cookie チェック対象のCookie
   * @returns 有効かどうか
   */
  private static isValidCookie(cookie: Cookie): boolean {
    // 無効化されているCookieは除外
    if (!cookie.enabled) return false

    // 有効期限チェック
    if (cookie.expires) {
      const expiryDate = new Date(cookie.expires)
      const now = new Date()
      if (expiryDate <= now) {
        return false
      }
    }

    return true
  }

  /**
   * デバッグ用：現在のCookie状態を出力
   * @param domain ドメイン
   * @param sessionId セッションID
   */
  static debugCookieState(domain: string, sessionId?: string): void {
    console.group(`Cookie Debug - Domain: ${domain}`)

    try {
      const cookieStore = useCookieStore.getState()
      const sessionStore = useSessionStore.getState()
      const effectiveSessionId = sessionId || sessionStore.activeSessionId

      console.log('Global Cookies:', cookieStore.getEnabledCookies())

      if (effectiveSessionId) {
        console.log('Session Cookies:', sessionStore.getSessionCookies(effectiveSessionId))
      }

      const matchingCookies = this.getAllMatchingCookies(domain, sessionId)
      console.log('Matching Cookies:', matchingCookies)

      const cookieHeader = this.generateCookieHeader(domain, sessionId)
      console.log('Generated Cookie Header:', cookieHeader)
    } catch (error) {
      console.error('Debug error:', error)
    }

    console.groupEnd()
  }

  /**
   * 指定セッションにCookieを追加（レスポンスから自動追加用）
   * @param sessionId セッションID
   * @param cookies 追加するCookie配列
   */
  static addCookiesToSession(sessionId: string, cookies: Cookie[]): void {
    const sessionStore = useSessionStore.getState()

    cookies.forEach((cookie) => {
      // 既存の同名Cookieをチェック
      const existingCookies = sessionStore.getSessionCookies(sessionId)
      const existingCookie = existingCookies.find(
        (existing) => existing.name === cookie.name && existing.domain === cookie.domain
      )

      if (existingCookie) {
        // 既存Cookieを更新
        sessionStore.updateSessionCookie(sessionId, existingCookie.id, {
          value: cookie.value,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          enabled: true
        })
      } else {
        // 新しいCookieを追加
        sessionStore.addSessionCookie(sessionId, {
          ...cookie,
          enabled: true
        })
      }
    })
  }
}

/**
 * ファクトリー関数：APIサービス用のCookieリゾルバーを作成
 * @param sessionId デフォルトのセッションID
 * @returns Cookieリゾルバー関数
 */
export function createCookieResolver(sessionId?: string) {
  return (domain: string): string => {
    return CookieResolverService.generateCookieHeader(domain, sessionId)
  }
}
