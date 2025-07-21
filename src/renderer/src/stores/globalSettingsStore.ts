import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// グローバル設定の型定義
export interface GlobalSettings {
  // リクエストのデフォルト設定
  defaultTimeout: number
  defaultFollowRedirects: boolean
  defaultMaxRedirects: number
  defaultValidateSSL: boolean
  defaultUserAgent: string

  // UIの設定
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'

  // エディタの設定
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean

  // 開発者向け設定
  debugLogs: boolean
  saveHistory: boolean
  maxHistorySize: number

  // ネットワーク設定
  proxyEnabled: boolean
  proxyUrl?: string
  proxyAuth?: {
    username: string
    password: string
  }

  // セキュリティ設定
  allowInsecureConnections: boolean
  certificateValidation: boolean

  // アプリケーション設定
  autoSave: boolean
  autoSaveInterval: number // 秒
  checkForUpdates: boolean
}

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
    console.error('Failed to load global settings:', error)
  }
  return DEFAULT_GLOBAL_SETTINGS
}

// ローカルストレージに設定を保存する
const saveSettings = (settings: GlobalSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save global settings:', error)
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
        console.error('Failed to import settings:', error)
      }
      return false
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
        console.error('Failed to apply proxy settings:', result.error)
      } else {
        console.log('Proxy settings applied:', result.message)
      }
    }
  } catch (error) {
    console.error('Error applying proxy settings:', error)
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
const initialSettings = loadSettings()
applyThemeAndFont(initialSettings)

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
  }
)
