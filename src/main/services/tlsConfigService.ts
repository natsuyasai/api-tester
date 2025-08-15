/**
 * TLS設定管理サービス
 * グローバル設定に基づいてNode.jsのTLS設定を動的に変更
 */

import type { GlobalSettings } from '@/types/types'

export class TlsConfigService {
  private static originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  /**
   * グローバル設定に基づいてTLS設定を適用
   */
  static applyTlsSettings(settings: {
    allowInsecureConnections: boolean
    certificateValidation: boolean
  }): void {
    // 安全でない接続を許可するか、証明書検証を無効にする場合
    const disableTlsVerification =
      settings.allowInsecureConnections || !settings.certificateValidation

    if (disableTlsVerification) {
      // TLS証明書の検証を無効化
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      console.warn(
        '[TLS CONFIG] Certificate verification disabled. This is insecure and should only be used for development/testing!'
      )
    } else {
      // TLS証明書の検証を有効化（デフォルト）
      if (this.originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = this.originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
      console.info('[TLS CONFIG] Certificate verification enabled (secure)')
    }
  }

  /**
   * 現在のTLS設定状態を取得
   */
  static getCurrentTlsSettings(): {
    rejectUnauthorized: boolean
    environmentVariable: string | undefined
  } {
    const envValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    return {
      rejectUnauthorized: envValue !== '0',
      environmentVariable: envValue
    }
  }

  /**
   * TLS設定をデフォルトに戻す
   */
  static resetTlsSettings(): void {
    if (this.originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = this.originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }
    console.info('[TLS CONFIG] TLS settings reset to original values')
  }

  /**
   * アプリケーション終了時のクリーンアップ
   */
  static cleanup(): void {
    this.resetTlsSettings()
  }
}

/**
 * レンダラープロセスからの設定更新を処理するためのヘルパー関数
 * IPCやその他の通信方法で設定が変更された際に呼び出される
 */
export function updateTlsSettingsFromRenderer(settings: GlobalSettings): void {
  TlsConfigService.applyTlsSettings({
    allowInsecureConnections: settings.allowInsecureConnections,
    certificateValidation: settings.certificateValidation
  })
}
