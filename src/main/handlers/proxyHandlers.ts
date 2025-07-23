import { ipcMain, session } from 'electron'
import { showErrorDialog } from '../utils/errorUtils'

// プロキシ設定の型定義
interface ProxySettings {
  enabled: boolean
  url?: string
  auth?: {
    username: string
    password: string
  }
  bypassList?: string[]
}

let currentProxySettings: ProxySettings = { enabled: false }

export function setupProxyHandlers(): void {
  // プロキシ設定の適用
  ipcMain.handle('setProxyConfig', async (_event, proxySettings: ProxySettings) => {
    try {
      const defaultSession = session.defaultSession

      if (!proxySettings.enabled || !proxySettings.url) {
        // プロキシを無効化
        await defaultSession.setProxy({
          mode: 'direct'
        })
        currentProxySettings = { enabled: false }
        return { success: true, message: 'プロキシが無効化されました' }
      }

      // プロキシ設定を構築
      let proxyRules = proxySettings.url

      // 認証情報がある場合はURLに埋め込む
      if (proxySettings.auth?.username && proxySettings.auth?.password) {
        try {
          const url = new URL(proxySettings.url)
          url.username = proxySettings.auth.username
          url.password = proxySettings.auth.password
          proxyRules = url.toString()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          showErrorDialog(
            'プロキシURL認証設定エラー',
            'プロキシURLに認証情報を追加する際にエラーが発生しました',
            `URL: ${proxySettings.url}\nエラー: ${errorMessage}`
          )
        }
      }

      const bypassRules = proxySettings.bypassList?.join(',') || '<local>'

      await defaultSession.setProxy({
        mode: 'fixed_servers',
        proxyRules,
        proxyBypassRules: bypassRules
      })

      currentProxySettings = proxySettings
      return {
        success: true,
        message: `プロキシが設定されました: ${proxySettings.url}`
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラーメッセージボックスを表示
      showErrorDialog('プロキシ設定エラー', 'プロキシ設定中にエラーが発生しました', errorMessage)

      return {
        success: false,
        error: errorMessage,
        message: 'プロキシ設定に失敗しました'
      }
    }
  })

  // 現在のプロキシ設定を取得
  ipcMain.handle('getProxyConfig', () => {
    return currentProxySettings
  })

  // プロキシ接続テスト
  ipcMain.handle(
    'testProxyConnection',
    async (_event, testUrl: string = 'https://httpbin.org/ip') => {
      const startTime = Date.now()

      try {
        // テスト用のリクエストを送信
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'API Tester Proxy Test'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as { origin?: string }
        const endTime = Date.now()
        const responseTime = endTime - startTime

        return {
          success: true,
          message: 'プロキシ接続テストが成功しました',
          responseTime,
          ipAddress: data.origin,
          proxyEnabled: currentProxySettings.enabled
        }
      } catch (error) {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // エラーメッセージボックスを表示
        showErrorDialog(
          'プロキシ接続テストエラー',
          'プロキシ接続テストが失敗しました',
          errorMessage
        )

        return {
          success: false,
          message: `プロキシ接続テストが失敗しました: ${errorMessage}`,
          responseTime,
          proxyEnabled: currentProxySettings.enabled
        }
      }
    }
  )

  // 現在のIPアドレスを取得
  ipcMain.handle('getCurrentIpAddress', async () => {
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

      const data = (await response.json()) as { origin?: string }

      return {
        success: true,
        ipAddress: data.origin,
        proxyEnabled: currentProxySettings.enabled
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラーメッセージボックスを表示
      showErrorDialog(
        'IPアドレス取得エラー',
        'IPアドレスの取得中にエラーが発生しました',
        errorMessage
      )

      return {
        success: false,
        error: errorMessage
      }
    }
  })
}
