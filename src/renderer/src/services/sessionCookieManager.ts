import { ApiServiceV2 } from '@/services/apiServiceV2'
import { ApiResponse } from '@/types/types'
import { useCookieStore } from '@renderer/stores/cookieStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { extractCookiesFromResponse } from '@renderer/utils/cookieUtils'
import { CookieResolverService, createCookieResolver } from './cookieResolverService'

/**
 * セッションとCookieの統合管理サービス
 */
export class SessionCookieManager {
  /**
   * セッション変更時にCookieリゾルバーを更新
   * @param sessionId 新しいアクティブセッションID
   */
  static updateCookieResolverForSession(sessionId?: string): void {
    try {
      const cookieResolver = createCookieResolver(sessionId)
      ApiServiceV2.setCookieResolver(cookieResolver)

      console.log('Cookie resolver updated for session:', {
        sessionId,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to update cookie resolver for session:', error)
    }
  }

  /**
   * レスポンスからCookieを抽出してセッションに追加
   * @param response APIレスポンス
   * @param requestUrl リクエストURL
   * @param sessionId 対象セッションID（省略時はアクティブセッション）
   */
  static addCookiesFromResponse(
    response: ApiResponse,
    requestUrl: string,
    sessionId?: string
  ): void {
    try {
      const sessionStore = useSessionStore.getState()
      const targetSessionId = sessionId || sessionStore.activeSessionId

      if (!targetSessionId) {
        console.warn('No active session to add cookies to')
        return
      }

      // レスポンスヘッダーからCookieを抽出
      const cookies = extractCookiesFromResponse(response.headers, requestUrl)

      if (cookies.length > 0) {
        // セッションにCookieを追加
        CookieResolverService.addCookiesToSession(targetSessionId, cookies)

        console.log(
          `Added ${cookies.length} cookies to session ${targetSessionId}:`,
          cookies.map((c) => `${c.name}=${c.value}`)
        )
      }
    } catch (error) {
      console.error('Failed to add cookies from response:', error)
    }
  }

  /**
   * セッション切り替えの完全な処理
   * Cookieリゾルバーの更新とログ出力を含む
   * @param sessionId 新しいセッションID
   */
  static switchSession(sessionId?: string): void {
    try {
      // セッションストアを更新
      const sessionStore = useSessionStore.getState()
      sessionStore.setActiveSession(sessionId)

      // Cookieリゾルバーを更新
      this.updateCookieResolverForSession(sessionId)

      // 現在のCookie状態をデバッグ出力
      this.debugCurrentCookieState(sessionId)
    } catch (error) {
      console.error('Failed to switch session:', error)
    }
  }

  /**
   * 現在のCookie状態をデバッグ出力
   * @param sessionId セッションID
   */
  static debugCurrentCookieState(sessionId?: string): void {
    try {
      const sessionStore = useSessionStore.getState()
      const effectiveSessionId = sessionId || sessionStore.activeSessionId

      console.group('Session Cookie State')
      console.log('Active Session ID:', effectiveSessionId)

      if (effectiveSessionId) {
        const session = sessionStore.getSession(effectiveSessionId)
        console.log('Session Info:', {
          name: session?.name,
          cookieCount: session?.cookies.length || 0
        })

        const sessionCookies = sessionStore.getSessionCookies(effectiveSessionId)
        console.log('Session Cookies:', sessionCookies)
      }

      console.log(
        'All Sessions:',
        sessionStore.sessions.map((s) => ({
          id: s.id,
          name: s.name,
          isActive: s.id === effectiveSessionId,
          cookieCount: s.cookies.length
        }))
      )

      console.groupEnd()
    } catch (error) {
      console.error('Debug error:', error)
    }
  }

  /**
   * 指定ドメインの現在のCookie状態を確認
   * @param domain 確認対象ドメイン
   * @param sessionId セッションID（省略時はアクティブセッション）
   */
  static debugCookiesForDomain(domain: string, sessionId?: string): void {
    CookieResolverService.debugCookieState(domain, sessionId)
  }

  /**
   * セッション作成時の初期設定
   * @param sessionId 新しく作成されたセッションID
   */
  static initializeNewSession(sessionId: string): void {
    try {
      // 新しいセッションをアクティブに設定
      this.switchSession(sessionId)

      console.log('New session initialized:', sessionId)
    } catch (error) {
      console.error('Failed to initialize new session:', error)
    }
  }

  /**
   * グローバルCookieストアからセッションCookieへの移行
   * @param sessionId 移行先セッションID
   * @param domainFilter 特定ドメインのみ移行する場合
   */
  static migrateGlobalCookiesToSession(sessionId: string, domainFilter?: string): void {
    try {
      const cookieStore = useCookieStore.getState()
      const enabledCookies = cookieStore.getEnabledCookies()

      const targetCookies = domainFilter
        ? enabledCookies.filter(
            (cookie) =>
              cookie.domain === domainFilter ||
              (cookie.domain.startsWith('.') && domainFilter.endsWith(cookie.domain.substring(1)))
          )
        : enabledCookies

      if (targetCookies.length > 0) {
        CookieResolverService.addCookiesToSession(sessionId, targetCookies)
        console.log(`Migrated ${targetCookies.length} cookies to session ${sessionId}`)
      }
    } catch (error) {
      console.error('Failed to migrate cookies to session:', error)
    }
  }
}
