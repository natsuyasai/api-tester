import { ipcMain } from 'electron'
import type { GlobalSettings } from '@/types/types'
import { TlsConfigService } from '../services/tlsConfigService'

/**
 * TLS設定関連のIPCハンドラーをセットアップ
 */
export function setupTlsHandlers(): void {
  // レンダラープロセスからのTLS設定更新
  ipcMain.handle('tls-config:update', (_, settings: GlobalSettings) => {
    try {
      TlsConfigService.applyTlsSettings({
        allowInsecureConnections: settings.allowInsecureConnections,
        certificateValidation: settings.certificateValidation
      })

      return {
        success: true,
        message: 'TLS settings updated successfully',
        currentSettings: TlsConfigService.getCurrentTlsSettings()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to update TLS settings:', errorMessage)

      return {
        success: false,
        error: errorMessage,
        currentSettings: TlsConfigService.getCurrentTlsSettings()
      }
    }
  })

  // 現在のTLS設定状態を取得
  ipcMain.handle('tls-config:get-current', () => {
    try {
      return {
        success: true,
        settings: TlsConfigService.getCurrentTlsSettings()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to get current TLS settings:', errorMessage)

      return {
        success: false,
        error: errorMessage,
        settings: null
      }
    }
  })

  // TLS設定をリセット
  ipcMain.handle('tls-config:reset', () => {
    try {
      TlsConfigService.resetTlsSettings()

      return {
        success: true,
        message: 'TLS settings reset to defaults',
        currentSettings: TlsConfigService.getCurrentTlsSettings()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to reset TLS settings:', errorMessage)

      return {
        success: false,
        error: errorMessage,
        currentSettings: TlsConfigService.getCurrentTlsSettings()
      }
    }
  })

  console.log('TLS handlers registered')
}

/**
 * アプリケーション終了時のクリーンアップ
 */
export function cleanupTlsHandlers(): void {
  TlsConfigService.cleanup()
}
