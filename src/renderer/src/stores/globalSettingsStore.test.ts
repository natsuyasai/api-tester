import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGlobalSettingsStore, DEFAULT_GLOBAL_SETTINGS } from './globalSettingsStore'

// showErrorDialogのモック
vi.mock('@renderer/utils/errorUtils', () => ({
  showErrorDialog: vi.fn()
}))

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// window.matchMediaのモック
const mockMatchMedia = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia
})

// document.documentElementのモック
const mockDocumentElement = {
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    contains: vi.fn()
  }
}

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true
})

describe('GlobalSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })

    // ストアを初期状態にリセット
    useGlobalSettingsStore.setState({
      settings: { ...DEFAULT_GLOBAL_SETTINGS }
    })
  })

  describe('設定管理', () => {
    it('設定を更新できる', () => {
      const { updateSettings } = useGlobalSettingsStore.getState()

      updateSettings({
        defaultTimeout: 60000,
        theme: 'dark',
        fontSize: 'large'
      })

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.defaultTimeout).toBe(60000)
      expect(state.settings.theme).toBe('dark')
      expect(state.settings.fontSize).toBe('large')

      // 他の設定は変更されない
      expect(state.settings.defaultFollowRedirects).toBe(
        DEFAULT_GLOBAL_SETTINGS.defaultFollowRedirects
      )
    })

    it('設定をリセットできる', () => {
      const { updateSettings, resetSettings } = useGlobalSettingsStore.getState()

      // まず設定を変更
      updateSettings({
        defaultTimeout: 60000,
        theme: 'dark'
      })

      // リセット
      resetSettings()

      const state = useGlobalSettingsStore.getState()
      expect(state.settings).toEqual(DEFAULT_GLOBAL_SETTINGS)
    })

    it('部分的な設定更新で他の設定が保持される', () => {
      const { updateSettings } = useGlobalSettingsStore.getState()

      updateSettings({ defaultTimeout: 45000 })

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.defaultTimeout).toBe(45000)
      expect(state.settings.theme).toBe(DEFAULT_GLOBAL_SETTINGS.theme)
      expect(state.settings.fontSize).toBe(DEFAULT_GLOBAL_SETTINGS.fontSize)
    })
  })

  describe('設定のインポート・エクスポート', () => {
    it('設定をエクスポートできる', () => {
      const { updateSettings, exportSettings } = useGlobalSettingsStore.getState()

      updateSettings({
        defaultTimeout: 60000,
        theme: 'dark'
      })

      const exported = exportSettings()
      const parsed = JSON.parse(exported)

      expect(parsed.defaultTimeout).toBe(60000)
      expect(parsed.theme).toBe('dark')
    })

    it('有効なJSONから設定をインポートできる', () => {
      const { importSettings } = useGlobalSettingsStore.getState()

      const testSettings = {
        defaultTimeout: 90000,
        theme: 'light',
        fontSize: 'small'
      }

      const result = importSettings(JSON.stringify(testSettings))

      expect(result).toBe(true)

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.defaultTimeout).toBe(90000)
      expect(state.settings.theme).toBe('light')
      expect(state.settings.fontSize).toBe('small')
    })

    it('無効なJSONのインポートは失敗する', () => {
      const { importSettings } = useGlobalSettingsStore.getState()

      const result = importSettings('invalid json')

      expect(result).toBe(false)

      // 設定は変更されない
      const state = useGlobalSettingsStore.getState()
      expect(state.settings).toEqual(DEFAULT_GLOBAL_SETTINGS)
    })

    it('部分的な設定のインポートでデフォルト値が保持される', () => {
      const { importSettings } = useGlobalSettingsStore.getState()

      const partialSettings = {
        theme: 'dark'
      }

      const result = importSettings(JSON.stringify(partialSettings))

      expect(result).toBe(true)

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.theme).toBe('dark')
      expect(state.settings.defaultTimeout).toBe(DEFAULT_GLOBAL_SETTINGS.defaultTimeout)
    })
  })

  describe('クライアント証明書管理', () => {
    it('クライアント証明書を追加できる', () => {
      const { addClientCertificate } = useGlobalSettingsStore.getState()

      addClientCertificate({
        name: 'テスト証明書',
        host: 'example.com',
        certPath: '/path/to/cert.pem',
        keyPath: '/path/to/key.pem',
        enabled: true
      })

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.clientCertificates.certificates).toHaveLength(1)
      expect(state.settings.clientCertificates.certificates[0]).toEqual({
        id: expect.any(String),
        name: 'テスト証明書',
        host: 'example.com',
        certPath: '/path/to/cert.pem',
        keyPath: '/path/to/key.pem',
        enabled: true
      })
    })

    it('クライアント証明書を更新できる', () => {
      const { addClientCertificate, updateClientCertificate } = useGlobalSettingsStore.getState()

      addClientCertificate({
        name: '元の名前',
        host: 'example.com',
        certPath: '/old/path.pem',
        keyPath: '/old/key.pem',
        enabled: false
      })

      const state = useGlobalSettingsStore.getState()
      const certId = state.settings.clientCertificates.certificates[0].id

      updateClientCertificate(certId, {
        name: '更新された名前',
        enabled: true
      })

      const updatedState = useGlobalSettingsStore.getState()
      const cert = updatedState.settings.clientCertificates.certificates[0]
      expect(cert.name).toBe('更新された名前')
      expect(cert.enabled).toBe(true)
      expect(cert.host).toBe('example.com') // 他のフィールドは保持
    })

    it('クライアント証明書を削除できる', () => {
      const { addClientCertificate, removeClientCertificate } = useGlobalSettingsStore.getState()

      addClientCertificate({
        name: '削除予定証明書',
        host: 'example.com',
        certPath: '/path/to/cert.pem',
        keyPath: '/path/to/key.pem',
        enabled: true
      })

      const state = useGlobalSettingsStore.getState()
      const certId = state.settings.clientCertificates.certificates[0].id

      removeClientCertificate(certId)

      const updatedState = useGlobalSettingsStore.getState()
      expect(updatedState.settings.clientCertificates.certificates).toHaveLength(0)
    })

    it('クライアント証明書の有効/無効を切り替えできる', () => {
      const { addClientCertificate, toggleClientCertificate } = useGlobalSettingsStore.getState()

      addClientCertificate({
        name: 'トグル証明書',
        host: 'example.com',
        certPath: '/path/to/cert.pem',
        keyPath: '/path/to/key.pem',
        enabled: false
      })

      const state = useGlobalSettingsStore.getState()
      const certId = state.settings.clientCertificates.certificates[0].id

      // 有効に切り替え
      toggleClientCertificate(certId)
      let updatedState = useGlobalSettingsStore.getState()
      expect(updatedState.settings.clientCertificates.certificates[0].enabled).toBe(true)

      // 無効に切り替え
      toggleClientCertificate(certId)
      updatedState = useGlobalSettingsStore.getState()
      expect(updatedState.settings.clientCertificates.certificates[0].enabled).toBe(false)
    })

    it('存在しない証明書IDでの操作は無効である', () => {
      const { updateClientCertificate, removeClientCertificate, toggleClientCertificate } =
        useGlobalSettingsStore.getState()

      const originalState = useGlobalSettingsStore.getState()

      updateClientCertificate('non-existent-id', { name: 'test' })
      removeClientCertificate('non-existent-id')
      toggleClientCertificate('non-existent-id')

      const finalState = useGlobalSettingsStore.getState()
      expect(finalState).toEqual(originalState)
    })
  })

  describe('複雑な設定シナリオ', () => {
    it('ネストした設定を正しく更新できる', () => {
      const { updateSettings } = useGlobalSettingsStore.getState()

      updateSettings({
        clientCertificates: {
          enabled: true,
          certificates: [
            {
              id: 'test-id',
              name: 'テスト証明書',
              host: 'test.com',
              certPath: '/test.pem',
              keyPath: '/test.key',
              enabled: true
            }
          ]
        }
      })

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.clientCertificates.enabled).toBe(true)
      expect(state.settings.clientCertificates.certificates).toHaveLength(1)
    })

    it('設定の型安全性を確保する', () => {
      const { updateSettings } = useGlobalSettingsStore.getState()

      // 有効な設定値
      updateSettings({
        theme: 'dark',
        fontSize: 'large',
        defaultTimeout: 60000,
        debugLogs: true
      })

      const state = useGlobalSettingsStore.getState()
      expect(state.settings.theme).toBe('dark')
      expect(state.settings.fontSize).toBe('large')
      expect(state.settings.defaultTimeout).toBe(60000)
      expect(state.settings.debugLogs).toBe(true)
    })

    it('設定変更でローカルストレージに保存される', () => {
      const { updateSettings } = useGlobalSettingsStore.getState()

      updateSettings({ theme: 'dark' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'api-tester-global-settings',
        expect.stringContaining('"theme":"dark"')
      )
    })
  })

  describe('デフォルト設定の検証', () => {
    it('デフォルト設定が適切に設定されている', () => {
      const state = useGlobalSettingsStore.getState()

      expect(state.settings.defaultTimeout).toBe(30000)
      expect(state.settings.defaultFollowRedirects).toBe(true)
      expect(state.settings.theme).toBe('auto')
      expect(state.settings.fontSize).toBe('medium')
      expect(state.settings.tabSize).toBe(2)
      expect(state.settings.autoSave).toBe(true)
      expect(state.settings.clientCertificates.enabled).toBe(false)
      expect(state.settings.clientCertificates.certificates).toEqual([])
    })

    it('すべての必要なプロパティが存在する', () => {
      const state = useGlobalSettingsStore.getState()
      const settings = state.settings

      // リクエスト設定
      expect(typeof settings.defaultTimeout).toBe('number')
      expect(typeof settings.defaultFollowRedirects).toBe('boolean')
      expect(typeof settings.defaultMaxRedirects).toBe('number')
      expect(typeof settings.defaultValidateSSL).toBe('boolean')
      expect(typeof settings.defaultUserAgent).toBe('string')

      // UI設定
      expect(['auto', 'light', 'dark']).toContain(settings.theme)
      expect(['small', 'medium', 'large']).toContain(settings.fontSize)

      // エディタ設定
      expect(typeof settings.tabSize).toBe('number')
      expect(typeof settings.wordWrap).toBe('boolean')
      expect(typeof settings.lineNumbers).toBe('boolean')

      // アプリケーション設定
      expect(typeof settings.autoSave).toBe('boolean')
      expect(typeof settings.autoSaveInterval).toBe('number')

      // セキュリティ設定
      expect(typeof settings.allowInsecureConnections).toBe('boolean')
      expect(typeof settings.certificateValidation).toBe('boolean')

      // クライアント証明書設定
      expect(typeof settings.clientCertificates).toBe('object')
      expect(typeof settings.clientCertificates.enabled).toBe('boolean')
      expect(Array.isArray(settings.clientCertificates.certificates)).toBe(true)
    })
  })
})
