import { describe, it, expect, vi } from 'vitest'
import type { GlobalSettings } from '@/types/types'
import {
  extractProxyConfig,
  validateProxyUrl,
  formatProxyForElectron,
  formatBypassList
} from './proxyUtils'

// errorUtilsのモック
vi.mock('@renderer/utils/errorUtils', () => ({
  showErrorDialog: vi.fn().mockResolvedValue(undefined)
}))

describe('proxyUtils', () => {
  describe('extractProxyConfig', () => {
    it('should return disabled config when proxy is disabled', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: false,
        proxyUrl: 'http://proxy.example.com:8080'
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.enabled).toBe(false)
    })

    it('should return disabled config when proxy URL is missing', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: undefined
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.enabled).toBe(false)
    })

    it('should extract valid HTTP proxy config', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: 'http://proxy.example.com:8080',
        proxyAuth: {
          username: 'testuser',
          password: 'testpass'
        }
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.enabled).toBe(true)
      expect(result.host).toBe('proxy.example.com')
      expect(result.port).toBe(8080)
      expect(result.protocol).toBe('http')
      expect(result.auth).toEqual(settings.proxyAuth)
    })

    it('should use default port when not specified', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: 'http://proxy.example.com'
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.port).toBe(80)
    })

    it('should handle HTTPS proxy', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: 'https://proxy.example.com:8443'
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.protocol).toBe('https')
      expect(result.port).toBe(8443)
    })

    it('should handle SOCKS5 proxy', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: 'socks5://proxy.example.com:1080'
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.protocol).toBe('socks5')
      expect(result.port).toBe(1080)
    })

    it('should return disabled config for invalid URL', () => {
      const settings: Partial<GlobalSettings> = {
        proxyEnabled: true,
        proxyUrl: 'invalid-url'
      }

      const result = extractProxyConfig(settings as GlobalSettings)
      expect(result.enabled).toBe(false)
    })
  })

  describe('validateProxyUrl', () => {
    it('should validate correct HTTP URL', () => {
      const result = validateProxyUrl('http://proxy.example.com:8080')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate correct HTTPS URL', () => {
      const result = validateProxyUrl('https://proxy.example.com:8443')
      expect(result.valid).toBe(true)
    })

    it('should validate SOCKS URLs', () => {
      expect(validateProxyUrl('socks4://proxy.example.com:1080').valid).toBe(true)
      expect(validateProxyUrl('socks5://proxy.example.com:1080').valid).toBe(true)
    })

    it('should reject empty URL', () => {
      const result = validateProxyUrl('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('プロキシURLが空です')
    })

    it('should reject invalid URL format', () => {
      const result = validateProxyUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('無効なURL形式です')
    })

    it('should reject unsupported protocol', () => {
      const result = validateProxyUrl('ftp://proxy.example.com:21')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('サポートされていないプロトコルです')
    })

    it('should reject URL without hostname', () => {
      const result = validateProxyUrl('http://:8080')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('無効なURL形式です')
    })

    it('should reject invalid port number', () => {
      const result = validateProxyUrl('http://proxy.example.com:abc')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('無効なURL形式です')
    })

    it('should accept URL without port', () => {
      const result = validateProxyUrl('http://proxy.example.com')
      expect(result.valid).toBe(true)
    })
  })

  describe('formatProxyForElectron', () => {
    it('should return null for disabled proxy', () => {
      const config = { enabled: false }
      const result = formatProxyForElectron(config)
      expect(result).toBeNull()
    })

    it('should return null for config without host', () => {
      const config = { enabled: true }
      const result = formatProxyForElectron(config)
      expect(result).toBeNull()
    })

    it('should format basic proxy URL', () => {
      const config = {
        enabled: true,
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http' as const
      }
      const result = formatProxyForElectron(config)
      expect(result).toBe('http://proxy.example.com:8080')
    })

    it('should include authentication', () => {
      const config = {
        enabled: true,
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'http' as const,
        auth: {
          username: 'testuser',
          password: 'testpass'
        }
      }
      const result = formatProxyForElectron(config)
      expect(result).toBe('http://testuser:testpass@proxy.example.com:8080')
    })

    it('should use default port when not specified', () => {
      const config = {
        enabled: true,
        host: 'proxy.example.com',
        protocol: 'https' as const
      }
      const result = formatProxyForElectron(config)
      expect(result).toBe('https://proxy.example.com:443')
    })
  })

  describe('formatBypassList', () => {
    it('should return <local> for empty list', () => {
      const result = formatBypassList()
      expect(result).toBe('<local>')
    })

    it('should return <local> for undefined list', () => {
      const result = formatBypassList(undefined)
      expect(result).toBe('<local>')
    })

    it('should format bypass list with local', () => {
      const result = formatBypassList(['*.example.com', '192.168.1.*'])
      expect(result).toBe('*.example.com,192.168.1.*,<local>')
    })

    it('should not duplicate <local> if already present', () => {
      const result = formatBypassList(['*.example.com', '<local>'])
      expect(result).toBe('*.example.com,<local>')
    })
  })
})
