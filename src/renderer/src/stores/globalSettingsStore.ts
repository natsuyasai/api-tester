import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GlobalSettings } from '@/types/types'
import { showErrorDialog } from '@renderer/utils/errorUtils'

// Window型はpreload/index.d.tsで定義されているため、ここでは定義不要

// デフォルト設定
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  // リクエストのデフォルト設定
  defaultTimeout: 30000,
  defaultFollowRedirects: true,
  defaultMaxRedirects: 5,
  defaultValidateSSL: true,
  defaultUserAgent: 'API Tester 1.0',

  // UIの設定
  theme: 'auto',
  fontSize: 'medium',

  // エディタの設定
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,

  // 開発者向け設定
  debugLogs: false,
  saveHistory: true,
  maxHistorySize: 10,

  // ネットワーク設定
  proxyEnabled: false,

  // セキュリティ設定
  allowInsecureConnections: false,
  certificateValidation: true,

  // クライアント証明書設定
  clientCertificates: {
    enabled: false,
    certificates: []
  },

  // アプリケーション設定
  autoSave: true,
  autoSaveInterval: 60,
  checkForUpdates: true
}

interface GlobalSettingsState {
  settings: GlobalSettings
  updateSettings: (newSettings: Partial<GlobalSettings>) => void
  resetSettings: () => void
  exportSettings: () => string
  importSettings: (settingsJson: string) => boolean

  // 証明書管理用のアクション
  addClientCertificate: (
    certificate: Omit<GlobalSettings['clientCertificates']['certificates'][0], 'id'>
  ) => void
  updateClientCertificate: (
    id: string,
    updates: Partial<GlobalSettings['clientCertificates']['certificates'][0]>
  ) => void
  removeClientCertificate: (id: string) => void
  toggleClientCertificate: (id: string) => void
}

const STORAGE_KEY = 'api-tester-global-settings'

// ローカルストレージから設定を読み込む
const loadSettings = (): GlobalSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>
      // デフォルト設定とマージして、新しいプロパティが追加された場合に対応
      return { ...DEFAULT_GLOBAL_SETTINGS, ...parsed } as GlobalSettings
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    void showErrorDialog(
      'グローバル設定読み込みエラー',
      'グローバル設定の読み込み中にエラーが発生しました',
      errorMessage
    )
  }
  return DEFAULT_GLOBAL_SETTINGS
}

// ローカルストレージに設定を保存する
const saveSettings = (settings: GlobalSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    void showErrorDialog(
      'グローバル設定保存エラー',
      'グローバル設定の保存中にエラーが発生しました',
      errorMessage
    )
  }
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  subscribeWithSelector((set, get) => ({
    settings: loadSettings(),

    updateSettings: (newSettings) => {
      set((state) => {
        const updatedSettings = { ...state.settings, ...newSettings }
        saveSettings(updatedSettings)
        return { settings: updatedSettings }
      })
    },

    resetSettings: () => {
      set({ settings: DEFAULT_GLOBAL_SETTINGS })
      saveSettings(DEFAULT_GLOBAL_SETTINGS)
    },

    exportSettings: () => {
      return JSON.stringify(get().settings, null, 2)
    },

    importSettings: (settingsJson) => {
      try {
        const parsed = JSON.parse(settingsJson) as Record<string, unknown>
        // 基本的な型チェック
        if (typeof parsed === 'object' && parsed !== null) {
          const newSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...parsed } as GlobalSettings
          set({ settings: newSettings })
          saveSettings(newSettings)
          return true
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        void showErrorDialog(
          '設定インポートエラー',
          '設定のインポート中にエラーが発生しました',
          errorMessage
        )
      }
      return false
    },

    // 証明書管理アクション
    addClientCertificate: (certificate) => {
      set((state) => {
        const newCertificate = {
          ...certificate,
          id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        const updatedSettings = {
          ...state.settings,
          clientCertificates: {
            ...state.settings.clientCertificates,
            certificates: [...state.settings.clientCertificates.certificates, newCertificate]
          }
        }
        saveSettings(updatedSettings)
        return { settings: updatedSettings }
      })
    },

    updateClientCertificate: (id, updates) => {
      set((state) => {
        const updatedSettings = {
          ...state.settings,
          clientCertificates: {
            ...state.settings.clientCertificates,
            certificates: state.settings.clientCertificates.certificates.map((cert) =>
              cert.id === id ? { ...cert, ...updates } : cert
            )
          }
        }
        saveSettings(updatedSettings)
        return { settings: updatedSettings }
      })
    },

    removeClientCertificate: (id) => {
      set((state) => {
        const updatedSettings = {
          ...state.settings,
          clientCertificates: {
            ...state.settings.clientCertificates,
            certificates: state.settings.clientCertificates.certificates.filter(
              (cert) => cert.id !== id
            )
          }
        }
        saveSettings(updatedSettings)
        return { settings: updatedSettings }
      })
    },

    toggleClientCertificate: (id) => {
      set((state) => {
        const updatedSettings = {
          ...state.settings,
          clientCertificates: {
            ...state.settings.clientCertificates,
            certificates: state.settings.clientCertificates.certificates.map((cert) =>
              cert.id === id ? { ...cert, enabled: !cert.enabled } : cert
            )
          }
        }
        saveSettings(updatedSettings)
        return { settings: updatedSettings }
      })
    }
  }))
)

// ストアインスタンスを直接取得する関数
export const getGlobalSettings = (): GlobalSettings => {
  return useGlobalSettingsStore.getState().settings
}

// プロキシ設定をElectronに適用する関数
const applyProxySettings = async (settings: GlobalSettings): Promise<void> => {
  try {
    if (window.proxyAPI) {
      const proxySettings = {
        enabled: settings.proxyEnabled,
        url: settings.proxyUrl,
        auth: settings.proxyAuth,
        bypassList: ['localhost', '127.0.0.1', '::1']
      }

      const result = await window.proxyAPI.setProxyConfig(proxySettings)
      if (!result.success) {
        await showErrorDialog(
          'プロキシ設定適用エラー',
          'プロキシ設定の適用中にエラーが発生しました',
          result.error || 'Unknown error'
        )
      } else {
        console.log('Proxy settings applied:', result.message)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await showErrorDialog(
      'プロキシ設定エラー',
      'プロキシ設定の処理中にエラーが発生しました',
      errorMessage
    )
  }
}

// テーマとフォントサイズを適用する関数
const applyThemeAndFont = (settings: GlobalSettings): void => {
  // テーマの適用
  if (settings.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (settings.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    // autoの場合はシステム設定に従う
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')

    // システム設定変更の監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (useGlobalSettingsStore.getState().settings.theme === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
    }

    // 既存のリスナーを削除してから新しいリスナーを追加
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  }

  // フォントサイズの適用
  document.documentElement.setAttribute('data-font-size', settings.fontSize)
}

// 起動時にテーマとフォントを適用
// const initialSettings = loadSettings()
// applyThemeAndFont(initialSettings)

// TLS設定をElectronに適用する関数
const applyTlsSettings = async (settings: GlobalSettings): Promise<void> => {
  try {
    if (window.tlsConfigAPI) {
      const result = await window.tlsConfigAPI.updateSettings(settings)
      if (result.success) {
        console.log('TLS settings applied:', result.message)
      } else {
        console.error('Failed to apply TLS settings:', result.error)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('TLS settings application error:', errorMessage)
  }
}

// 設定変更の監視
useGlobalSettingsStore.subscribe(
  (state) => state.settings,
  (settings, prevSettings) => {
    // テーマまたはフォントサイズが変更された場合に適用
    if (settings.theme !== prevSettings?.theme || settings.fontSize !== prevSettings?.fontSize) {
      applyThemeAndFont(settings)
    }

    // プロキシ設定の変更をElectronに適用
    const proxyChanged =
      settings.proxyEnabled !== prevSettings?.proxyEnabled ||
      settings.proxyUrl !== prevSettings?.proxyUrl ||
      JSON.stringify(settings.proxyAuth) !== JSON.stringify(prevSettings?.proxyAuth)

    if (proxyChanged) {
      applyProxySettings(settings).catch(console.error)
    }

    // TLS設定の変更をElectronに適用
    const tlsChanged =
      settings.allowInsecureConnections !== prevSettings?.allowInsecureConnections ||
      settings.certificateValidation !== prevSettings?.certificateValidation

    if (tlsChanged) {
      applyTlsSettings(settings).catch(console.error)
    }
  }
)
