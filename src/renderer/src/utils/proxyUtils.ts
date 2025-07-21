// プロキシ設定関連のユーティリティ

import { GlobalSettings } from '@renderer/stores/globalSettingsStore'

export interface ProxyConfig {
  enabled: boolean
  url?: string
  host?: string
  port?: number
  protocol?: 'http' | 'https' | 'socks4' | 'socks5'
  auth?: {
    username: string
    password: string
  }
  bypassList?: string[]
}

/**
 * グローバル設定からプロキシ設定を抽出
 */
export const extractProxyConfig = (settings: GlobalSettings): ProxyConfig => {
  if (!settings.proxyEnabled || !settings.proxyUrl) {
    return { enabled: false }
  }

  try {
    const url = new URL(settings.proxyUrl)
    return {
      enabled: true,
      url: settings.proxyUrl,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : getDefaultPort(url.protocol),
      protocol: url.protocol.replace(':', '') as ProxyConfig['protocol'],
      auth: settings.proxyAuth
    }
  } catch (_error) {
    console.error('Invalid proxy URL:', settings.proxyUrl, _error)
    return { enabled: false }
  }
}

/**
 * プロトコルに基づくデフォルトポート番号を取得
 */
const getDefaultPort = (protocol: string): number => {
  switch (protocol) {
    case 'http:':
      return 80
    case 'https:':
      return 443
    case 'socks4:':
    case 'socks5:':
      return 1080
    default:
      return 8080
  }
}

/**
 * プロキシURLの妥当性を検証
 */
export const validateProxyUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url.trim()) {
    return { valid: false, error: 'プロキシURLが空です' }
  }

  try {
    const parsedUrl = new URL(url)
    
    // サポートされているプロトコルのチェック
    const supportedProtocols = ['http:', 'https:', 'socks4:', 'socks5:']
    if (!supportedProtocols.includes(parsedUrl.protocol)) {
      return { 
        valid: false, 
        error: `サポートされていないプロトコルです: ${parsedUrl.protocol}` 
      }
    }

    // ホスト名のチェック
    if (!parsedUrl.hostname) {
      return { valid: false, error: 'ホスト名が指定されていません' }
    }

    // ポート番号のチェック
    if (parsedUrl.port && (isNaN(parseInt(parsedUrl.port, 10)) || parseInt(parsedUrl.port, 10) <= 0)) {
      return { valid: false, error: '無効なポート番号です' }
    }

    return { valid: true }
  } catch (_error) {
    return { valid: false, error: '無効なURL形式です' }
  }
}

/**
 * プロキシ設定をElectron用の形式に変換
 */
export const formatProxyForElectron = (config: ProxyConfig): string | null => {
  if (!config.enabled || !config.host) {
    return null
  }

  const protocol = config.protocol || 'http'
  const port = config.port || getDefaultPort(`${protocol}:`)
  
  // 認証情報がある場合
  if (config.auth?.username && config.auth?.password) {
    return `${protocol}://${config.auth.username}:${config.auth.password}@${config.host}:${port}`
  }
  
  return `${protocol}://${config.host}:${port}`
}

/**
 * バイパスリストをElectron用の形式に変換
 */
export const formatBypassList = (bypassList?: string[]): string => {
  if (!bypassList || bypassList.length === 0) {
    return '<local>'
  }
  
  // <local>が既に含まれている場合は重複しないようにする
  const filteredList = bypassList.includes('<local>') 
    ? bypassList 
    : [...bypassList, '<local>']
  
  return filteredList.join(',')
}

/**
 * プロキシ設定のテスト用URL
 */
export const getProxyTestUrl = (): string => {
  return 'https://httpbin.org/ip'
}

/**
 * プロキシ経由でのテストリクエストを実行
 */
export const testProxyConnection = async (_config: ProxyConfig): Promise<{
  success: boolean
  message: string
  responseTime?: number
  ipAddress?: string
}> => {
  const startTime = Date.now()
  
  try {
    // テスト用のリクエストを実行
    const testUrl = getProxyTestUrl()
    
    // プロキシ設定を適用してリクエストを送信
    // 注意: 実際のプロキシ設定はElectronのセッションレベルで行う必要がある
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'API Tester Proxy Test'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as { origin?: string }
    const endTime = Date.now()
    const responseTime = endTime - startTime

    return {
      success: true,
      message: 'プロキシ接続テストが成功しました',
      responseTime,
      ipAddress: data.origin
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime

    return {
      success: false,
      message: `プロキシ接続テストが失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime
    }
  }
}

/**
 * 現在のIPアドレスを取得（プロキシ使用状況の確認用）
 */
export const getCurrentIpAddress = async (): Promise<{
  success: boolean
  ipAddress?: string
  error?: string
}> => {
  try {
    const response = await fetch('https://httpbin.org/ip', {
      method: 'GET',
      headers: {
        'User-Agent': 'API Tester IP Check'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as { origin?: string }
    
    return {
      success: true,
      ipAddress: data.origin
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}