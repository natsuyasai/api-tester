import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCookieStore } from './cookieStore'

describe('CookieStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ストアを初期状態にリセット
    useCookieStore.setState({
      cookies: []
    })
  })

  describe('クッキー管理', () => {
    it('新しいクッキーを追加できる', () => {
      const { addCookie } = useCookieStore.getState()

      addCookie()

      const state = useCookieStore.getState()
      expect(state.cookies).toHaveLength(1)
      expect(state.cookies[0]).toEqual({
        id: expect.any(String),
        name: '',
        value: '',
        domain: '',
        path: '/',
        enabled: false,
        secure: false,
        httpOnly: false,
        sameSite: 'Lax'
      })
    })

    it('クッキーを更新できる', () => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      addCookie()
      const state = useCookieStore.getState()
      const cookieId = state.cookies[0].id

      updateCookie(cookieId, {
        name: 'session_id',
        value: 'abc123',
        domain: 'example.com',
        enabled: true,
        secure: true,
        httpOnly: true,
        sameSite: 'Strict'
      })

      const updatedState = useCookieStore.getState()
      expect(updatedState.cookies[0]).toEqual({
        id: cookieId,
        name: 'session_id',
        value: 'abc123',
        domain: 'example.com',
        path: '/',
        enabled: true,
        secure: true,
        httpOnly: true,
        sameSite: 'Strict'
      })
    })

    it('クッキーを削除できる', () => {
      const { addCookie, removeCookie } = useCookieStore.getState()

      addCookie()
      const state = useCookieStore.getState()
      const cookieId = state.cookies[0].id

      removeCookie(cookieId)

      const updatedState = useCookieStore.getState()
      expect(updatedState.cookies).toHaveLength(0)
    })

    it('存在しないクッキーIDでの削除は無効である', () => {
      const { addCookie, removeCookie } = useCookieStore.getState()

      addCookie()
      removeCookie('non-existent-id')

      const state = useCookieStore.getState()
      expect(state.cookies).toHaveLength(1)
    })

    it('存在しないクッキーIDでの更新は無効である', () => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      addCookie()
      const originalState = useCookieStore.getState()

      updateCookie('non-existent-id', { name: 'test' })

      const finalState = useCookieStore.getState()
      expect(finalState).toEqual(originalState)
    })
  })

  describe('有効なクッキーの取得', () => {
    beforeEach(() => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      // テスト用のクッキーを追加
      addCookie()
      addCookie()
      addCookie()

      const state = useCookieStore.getState()
      const [cookie1, cookie2, cookie3] = state.cookies

      updateCookie(cookie1.id, {
        name: 'enabled_cookie',
        value: 'value1',
        enabled: true
      })

      updateCookie(cookie2.id, {
        name: 'disabled_cookie',
        value: 'value2',
        enabled: false
      })

      updateCookie(cookie3.id, {
        name: 'another_enabled',
        value: 'value3',
        enabled: true
      })
    })

    it('有効なクッキーのみを取得できる', () => {
      const { getEnabledCookies } = useCookieStore.getState()

      const enabledCookies = getEnabledCookies()

      expect(enabledCookies).toHaveLength(2)
      expect(enabledCookies.map((c) => c.name)).toEqual(['enabled_cookie', 'another_enabled'])
    })

    it('有効なクッキーがない場合は空配列を返す', () => {
      // すべてのクッキーを無効にする
      const state = useCookieStore.getState()
      const { updateCookie } = useCookieStore.getState()

      state.cookies.forEach((cookie) => {
        updateCookie(cookie.id, { enabled: false })
      })

      const { getEnabledCookies } = useCookieStore.getState()
      const enabledCookies = getEnabledCookies()

      expect(enabledCookies).toHaveLength(0)
    })
  })

  describe('ドメイン別クッキー取得', () => {
    beforeEach(() => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      // 様々なドメインのクッキーを追加
      const cookieConfigs = [
        { name: 'global_cookie', domain: '', enabled: true },
        { name: 'exact_match', domain: 'example.com', enabled: true },
        { name: 'subdomain_match', domain: '.example.com', enabled: true },
        { name: 'other_domain', domain: 'other.com', enabled: true },
        { name: 'disabled_cookie', domain: 'example.com', enabled: false }
      ]

      cookieConfigs.forEach(() => {
        addCookie()
      })

      const state = useCookieStore.getState()
      state.cookies.forEach((cookie, index) => {
        updateCookie(cookie.id, cookieConfigs[index])
      })
    })

    it('完全一致ドメインのクッキーを取得できる', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('example.com')
      const cookieNames = cookies.map((c) => c.name).sort()

      expect(cookieNames).toEqual(['exact_match', 'global_cookie', 'subdomain_match'])
    })

    it('サブドメインマッチングが正しく動作する', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('api.example.com')
      const cookieNames = cookies.map((c) => c.name).sort()

      expect(cookieNames).toEqual(['global_cookie', 'subdomain_match'])
    })

    it('マッチしないドメインではグローバルクッキーのみ取得する', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('unrelated.com')

      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('global_cookie')
    })

    it('無効なクッキーは取得されない', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('example.com')
      const cookieNames = cookies.map((c) => c.name)

      expect(cookieNames).not.toContain('disabled_cookie')
    })

    it('空のドメインではすべての有効なクッキーが対象となる', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('')

      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('global_cookie')
    })
  })

  describe('クッキーヘッダーのフォーマット', () => {
    beforeEach(() => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      // テスト用のクッキーを追加
      const cookieConfigs = [
        { name: 'session_id', value: 'abc123', domain: 'example.com', enabled: true },
        { name: 'user_pref', value: 'dark_mode', domain: '.example.com', enabled: true },
        { name: 'disabled', value: 'test', domain: 'example.com', enabled: false },
        { name: 'other_domain', value: 'test', domain: 'other.com', enabled: true }
      ]

      cookieConfigs.forEach(() => {
        addCookie()
      })

      const state = useCookieStore.getState()
      state.cookies.forEach((cookie, index) => {
        updateCookie(cookie.id, cookieConfigs[index])
      })
    })

    it('ドメインにマッチするクッキーのヘッダーを正しくフォーマットする', () => {
      const { formatCookieHeader } = useCookieStore.getState()

      const header = formatCookieHeader('example.com')

      expect(header).toBe('session_id=abc123; user_pref=dark_mode')
    })

    it('マッチするクッキーがない場合は空文字列を返す', () => {
      const { formatCookieHeader } = useCookieStore.getState()

      const header = formatCookieHeader('unmatched.com')

      expect(header).toBe('')
    })

    it('サブドメインでも正しくフォーマットする', () => {
      const { formatCookieHeader } = useCookieStore.getState()

      const header = formatCookieHeader('api.example.com')

      expect(header).toBe('user_pref=dark_mode')
    })

    it('値が空のクッキーも正しくフォーマットする', () => {
      const { addCookie, updateCookie, formatCookieHeader } = useCookieStore.getState()

      addCookie()
      const state = useCookieStore.getState()
      const newCookieId = state.cookies[state.cookies.length - 1].id

      updateCookie(newCookieId, {
        name: 'empty_value',
        value: '',
        domain: 'example.com',
        enabled: true
      })

      const header = formatCookieHeader('example.com')

      expect(header).toContain('empty_value=')
    })
  })

  describe('複雑なドメインマッチング', () => {
    beforeEach(() => {
      const { addCookie, updateCookie } = useCookieStore.getState()

      const cookieConfigs = [
        { name: 'root_domain', domain: 'example.com', enabled: true },
        { name: 'wildcard_subdomain', domain: '.example.com', enabled: true },
        { name: 'specific_subdomain', domain: 'api.example.com', enabled: true },
        { name: 'different_tld', domain: 'example.org', enabled: true },
        { name: 'partial_match', domain: 'ample.com', enabled: true }
      ]

      cookieConfigs.forEach(() => {
        addCookie()
      })

      const state = useCookieStore.getState()
      state.cookies.forEach((cookie, index) => {
        updateCookie(cookie.id, cookieConfigs[index])
      })
    })

    it('ルートドメインに対する複雑なマッチング', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('example.com')
      const cookieNames = cookies.map((c) => c.name).sort()

      expect(cookieNames).toEqual(['root_domain', 'wildcard_subdomain'])
    })

    it('サブドメインに対する複雑なマッチング', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('api.example.com')
      const cookieNames = cookies.map((c) => c.name).sort()

      expect(cookieNames).toEqual(['specific_subdomain', 'wildcard_subdomain'])
    })

    it('部分一致は行わない', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('example.com')
      const cookieNames = cookies.map((c) => c.name)

      expect(cookieNames).not.toContain('partial_match')
    })

    it('深いサブドメインでもワイルドカードマッチングが動作する', () => {
      const { getCookiesForDomain } = useCookieStore.getState()

      const cookies = getCookiesForDomain('deep.sub.example.com')
      const cookieNames = cookies.map((c) => c.name)

      expect(cookieNames).toContain('wildcard_subdomain')
      expect(cookieNames).not.toContain('root_domain')
      expect(cookieNames).not.toContain('specific_subdomain')
    })
  })

  describe('エッジケース', () => {
    it('クッキーが存在しない場合の処理', () => {
      const { getCookiesForDomain, formatCookieHeader, getEnabledCookies } =
        useCookieStore.getState()

      expect(getCookiesForDomain('any.com')).toEqual([])
      expect(formatCookieHeader('any.com')).toBe('')
      expect(getEnabledCookies()).toEqual([])
    })

    it('特殊文字を含むドメインの処理', () => {
      const { addCookie, updateCookie, getCookiesForDomain } = useCookieStore.getState()

      addCookie()
      const state = useCookieStore.getState()
      const cookieId = state.cookies[0].id

      updateCookie(cookieId, {
        name: 'special_domain',
        domain: 'sub-domain.example.com',
        enabled: true
      })

      const cookies = getCookiesForDomain('sub-domain.example.com')
      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('special_domain')
    })

    it('大文字小文字の処理（現在は区別する）', () => {
      const { addCookie, updateCookie, getCookiesForDomain } = useCookieStore.getState()

      addCookie()
      const state = useCookieStore.getState()
      const cookieId = state.cookies[0].id

      updateCookie(cookieId, {
        name: 'case_sensitive',
        domain: 'Example.com',
        enabled: true
      })

      const lowerCaseCookies = getCookiesForDomain('example.com')
      const upperCaseCookies = getCookiesForDomain('Example.com')

      expect(lowerCaseCookies).toHaveLength(0)
      expect(upperCaseCookies).toHaveLength(1)
    })

    it('空の名前や値を持つクッキーの処理', () => {
      const { addCookie, updateCookie, formatCookieHeader } = useCookieStore.getState()

      addCookie()
      addCookie()

      const state = useCookieStore.getState()
      const [cookie1, cookie2] = state.cookies

      updateCookie(cookie1.id, {
        name: '',
        value: 'value_without_name',
        domain: 'example.com',
        enabled: true
      })

      updateCookie(cookie2.id, {
        name: 'name_without_value',
        value: '',
        domain: 'example.com',
        enabled: true
      })

      const header = formatCookieHeader('example.com')
      expect(header).toBe('=value_without_name; name_without_value=')
    })
  })
})
