import { Cookie } from '@/types/types'

/**
 * Set-CookieヘッダーからCookie情報を解析
 */
export function parseSetCookieHeader(setCookieHeader: string, domain: string): Cookie {
  const parts = setCookieHeader.split(';').map((part) => part.trim())
  const [nameValue] = parts
  const [name, value] = nameValue.split('=', 2)

  const cookie: Cookie = {
    id: Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    value: value?.trim() || '',
    domain,
    path: '/',
    enabled: true,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  }

  // 他の属性を解析
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const [key, val] = part.split('=', 2)
    const keyLower = key.toLowerCase()

    switch (keyLower) {
      case 'domain':
        cookie.domain = val?.trim() || domain
        break
      case 'path':
        cookie.path = val?.trim() || '/'
        break
      case 'expires':
        cookie.expires = val?.trim()
        break
      case 'max-age': {
        // Max-Ageから有効期限を計算
        const maxAge = parseInt(val?.trim() || '0', 10)
        if (maxAge > 0) {
          const expiryDate = new Date(Date.now() + maxAge * 1000)
          cookie.expires = expiryDate.toISOString()
        }
        break
      }
      case 'httponly':
        cookie.httpOnly = true
        break
      case 'secure':
        cookie.secure = true
        break
      case 'samesite': {
        const sameSiteValue = val?.trim().toLowerCase()
        if (sameSiteValue === 'strict' || sameSiteValue === 'lax' || sameSiteValue === 'none') {
          cookie.sameSite = (sameSiteValue.charAt(0).toUpperCase() + sameSiteValue.slice(1)) as
            | 'Strict'
            | 'Lax'
            | 'None'
        }
        break
      }
    }
  }

  return cookie
}

/**
 * レスポンスヘッダーからすべてのCookieを取得
 */
export function extractCookiesFromResponse(
  headers: Record<string, string>,
  requestUrl: string
): Cookie[] {
  const cookies: Cookie[] = []

  // URLからドメインを抽出
  let domain: string
  try {
    domain = new URL(requestUrl).hostname
  } catch {
    domain = 'localhost'
  }

  // Set-Cookieヘッダーを検索（大文字小文字を区別しない）
  const setCookieHeaders: string[] = []
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'set-cookie') {
      // Set-Cookieヘッダーは複数の値を持つ可能性がある
      if (Array.isArray(value)) {
        setCookieHeaders.push(...value)
      } else if (typeof value === 'string') {
        // カンマ区切りで複数のCookieが含まれている場合があるが、
        // Cookieの値にもカンマが含まれる可能性があるので慎重に処理
        setCookieHeaders.push(value)
      }
    }
  }

  // 各Set-Cookieヘッダーを解析
  for (const setCookieHeader of setCookieHeaders) {
    try {
      const cookie = parseSetCookieHeader(setCookieHeader, domain)
      cookies.push(cookie)
    } catch (error) {
      console.warn('Failed to parse Set-Cookie header:', setCookieHeader, error)
    }
  }

  return cookies
}

/**
 * Cookieを読みやすい形式でフォーマット
 */
export function formatCookieForDisplay(cookie: Cookie): string {
  const parts: string[] = [`${cookie.name}=${cookie.value}`]

  if (cookie.domain) {
    parts.push(`Domain=${cookie.domain}`)
  }

  if (cookie.path) {
    parts.push(`Path=${cookie.path}`)
  }

  if (cookie.expires) {
    parts.push(`Expires=${new Date(cookie.expires).toLocaleString()}`)
  }

  if (cookie.httpOnly) {
    parts.push('HttpOnly')
  }

  if (cookie.secure) {
    parts.push('Secure')
  }

  if (cookie.sameSite) {
    parts.push(`SameSite=${cookie.sameSite}`)
  }

  return parts.join('; ')
}

/**
 * 複数のCookieを表示用にフォーマット
 */
export function formatCookiesForDisplay(cookies: Cookie[]): string {
  if (cookies.length === 0) {
    return 'No cookies found in response'
  }

  return cookies.map((cookie) => formatCookieForDisplay(cookie)).join('\n')
}
