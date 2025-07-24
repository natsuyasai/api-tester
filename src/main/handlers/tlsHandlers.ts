import { ipcMain } from 'electron'
import { TlsConfigService } from '../services/tlsConfigService'
import type { GlobalSettings } from '@renderer/stores/globalSettingsStore'

/**
 * TLS設定関連のIPCハンドラーをセットアップ
 */
export function setupTlsHandlers(): void {
  // レンダラープロセスからのTLS設定更新
  ipcMain.handle('tls-config:update', async (_, settings: GlobalSettings) => {
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
  ipcMain.handle('tls-config:get-current', async () => {
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
  ipcMain.handle('tls-config:reset', async () => {
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