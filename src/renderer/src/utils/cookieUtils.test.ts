import { describe, test, expect } from 'vitest'
import {
  parseSetCookieHeader,
  extractCookiesFromResponse,
  formatCookieForDisplay
} from './cookieUtils'

describe('cookieUtils', () => {
  describe('parseSetCookieHeader', () => {
    test('should parse basic cookie', () => {
      const setCookieHeader = 'sessionId=abc123'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.name).toBe('sessionId')
      expect(cookie.value).toBe('abc123')
      expect(cookie.domain).toBe(domain)
      expect(cookie.path).toBe('/')
      expect(cookie.enabled).toBe(true)
    })

    test('should parse cookie with domain attribute', () => {
      const setCookieHeader = 'sessionId=abc123; Domain=.example.com'
      const domain = 'api.example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.name).toBe('sessionId')
      expect(cookie.value).toBe('abc123')
      expect(cookie.domain).toBe('.example.com')
    })

    test('should parse cookie with path attribute', () => {
      const setCookieHeader = 'sessionId=abc123; Path=/api'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.path).toBe('/api')
    })

    test('should parse cookie with expires attribute', () => {
      const setCookieHeader = 'sessionId=abc123; Expires=Wed, 21 Oct 2015 07:28:00 GMT'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.expires).toBe('Wed, 21 Oct 2015 07:28:00 GMT')
    })

    test('should parse cookie with max-age attribute', () => {
      const setCookieHeader = 'sessionId=abc123; Max-Age=3600'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.expires).toBeDefined()
      // Max-Ageから計算された有効期限が設定されているかチェック
      const expiryTime = new Date(cookie.expires!).getTime()
      const now = Date.now()
      const oneHour = 3600 * 1000
      expect(expiryTime).toBeGreaterThan(now + oneHour - 1000) // 1秒の誤差を許容
      expect(expiryTime).toBeLessThan(now + oneHour + 1000)
    })

    test('should parse cookie with flags', () => {
      const setCookieHeader = 'sessionId=abc123; HttpOnly; Secure; SameSite=Strict'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.httpOnly).toBe(true)
      expect(cookie.secure).toBe(true)
      expect(cookie.sameSite).toBe('Strict')
    })

    test('should handle complex cookie value', () => {
      const setCookieHeader = 'data={"user":"john","id":123}; Path=/; Secure'
      const domain = 'example.com'

      const cookie = parseSetCookieHeader(setCookieHeader, domain)

      expect(cookie.name).toBe('data')
      expect(cookie.value).toBe('{"user":"john","id":123}')
      expect(cookie.secure).toBe(true)
    })
  })

  describe('extractCookiesFromResponse', () => {
    test('should extract cookies from response headers', () => {
      const headers = {
        'set-cookie': 'sessionId=abc123; Path=/; HttpOnly'
      }
      const requestUrl = 'https://example.com/api'

      const cookies = extractCookiesFromResponse(headers, requestUrl)

      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('sessionId')
      expect(cookies[0].value).toBe('abc123')
      expect(cookies[0].domain).toBe('example.com')
    })

    test('should handle case-insensitive headers', () => {
      const headers = {
        'Set-Cookie': 'sessionId=abc123'
      }
      const requestUrl = 'https://example.com'

      const cookies = extractCookiesFromResponse(headers, requestUrl)

      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('sessionId')
    })

    test('should handle multiple set-cookie headers', () => {
      const headers = {
        'set-cookie': 'sessionId=abc123; Path=/',
        'Set-Cookie': 'userId=456; HttpOnly'
      }
      const requestUrl = 'https://example.com'

      const cookies = extractCookiesFromResponse(headers, requestUrl)

      expect(cookies).toHaveLength(2)
      expect(cookies[0].name).toBe('sessionId')
      expect(cookies[1].name).toBe('userId')
    })

    test('should handle invalid URL gracefully', () => {
      const headers = {
        'set-cookie': 'sessionId=abc123'
      }
      const requestUrl = 'invalid-url'

      const cookies = extractCookiesFromResponse(headers, requestUrl)

      expect(cookies).toHaveLength(1)
      expect(cookies[0].domain).toBe('localhost')
    })

    test('should return empty array when no cookies', () => {
      const headers = {
        'content-type': 'application/json'
      }
      const requestUrl = 'https://example.com'

      const cookies = extractCookiesFromResponse(headers, requestUrl)

      expect(cookies).toHaveLength(0)
    })
  })

  describe('formatCookieForDisplay', () => {
    test('should format basic cookie', () => {
      const cookie = {
        id: '1',
        name: 'sessionId',
        value: 'abc123',
        domain: 'example.com',
        path: '/',
        enabled: true
      }

      const formatted = formatCookieForDisplay(cookie)

      expect(formatted).toBe('sessionId=abc123; Domain=example.com; Path=/')
    })

    test('should format cookie with all attributes', () => {
      const cookie = {
        id: '1',
        name: 'sessionId',
        value: 'abc123',
        domain: 'example.com',
        path: '/api',
        enabled: true,
        expires: '2024-12-31T23:59:59.000Z',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict' as const
      }

      const formatted = formatCookieForDisplay(cookie)

      expect(formatted).toContain('sessionId=abc123')
      expect(formatted).toContain('Domain=example.com')
      expect(formatted).toContain('Path=/api')
      expect(formatted).toContain('HttpOnly')
      expect(formatted).toContain('Secure')
      expect(formatted).toContain('SameSite=Strict')
    })
  })
})
