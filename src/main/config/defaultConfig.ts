/**
 * メインプロセス用デフォルト設定
 * レンダラープロセスの依存性なし
 */

export interface MainProcessConfig {
  defaultTimeout: number
  allowInsecureConnections: boolean
  defaultMaxRedirects: number
  proxyEnabled: boolean
  proxyUrl?: string
  proxyAuth?: {
    username: string
    password: string
  }
}

export const DEFAULT_MAIN_CONFIG: MainProcessConfig = {
  defaultTimeout: 30,
  allowInsecureConnections: false,
  defaultMaxRedirects: 5,
  proxyEnabled: false
}

/**
 * メインプロセス用設定を取得
 * 実際の実装では、必要に応じてファイルから読み込むなどが可能
 */
export function getMainProcessConfig(): MainProcessConfig {
  return DEFAULT_MAIN_CONFIG
}
