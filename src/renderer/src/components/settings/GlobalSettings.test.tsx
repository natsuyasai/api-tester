import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGlobalSettingsStore, getGlobalSettings } from '@renderer/stores/globalSettingsStore'
import { GlobalSettings as GlobalSettingsType } from '@renderer/stores/globalSettingsStore'
import { GlobalSettings } from './GlobalSettings'

// Zustandストアをモック
vi.mock('@renderer/stores/globalSettingsStore')

const mockUseGlobalSettingsStore = vi.mocked(useGlobalSettingsStore)
const mockGetGlobalSettings = vi.mocked(getGlobalSettings)

// window.dialogAPI をモック
const mockDialogAPI = {
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn()
}

const mockFileAPI = {
  writeFile: vi.fn(),
  readFile: vi.fn()
}

// window オブジェクトをモック
Object.defineProperty(window, 'dialogAPI', {
  value: mockDialogAPI,
  writable: true
})

Object.defineProperty(window, 'fileAPI', {
  value: mockFileAPI,
  writable: true
})

// alert をモック
global.alert = vi.fn()
global.confirm = vi.fn()

describe('GlobalSettings', () => {
  const mockSettings: GlobalSettingsType = {
    defaultTimeout: 30000,
    defaultFollowRedirects: true,
    defaultMaxRedirects: 5,
    defaultValidateSSL: true,
    defaultUserAgent: 'API Tester 1.0',
    theme: 'auto' as const,
    fontSize: 'medium' as const,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    debugLogs: false,
    saveHistory: true,
    maxHistorySize: 100,
    proxyEnabled: false,
    allowInsecureConnections: false,
    certificateValidation: true,
    autoSave: true,
    autoSaveInterval: 30,
    checkForUpdates: true
  }

  const mockStoreActions = {
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    exportSettings: vi.fn().mockReturnValue(JSON.stringify(mockSettings, null, 2)),
    importSettings: vi.fn().mockReturnValue(true)
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseGlobalSettingsStore.mockReturnValue({
      settings: mockSettings,
      ...mockStoreActions
    })

    mockGetGlobalSettings.mockReturnValue(mockSettings)
  })

  it('should render global settings form', () => {
    render(<GlobalSettings />)

    expect(screen.getByText('グローバル設定')).toBeInTheDocument()
    expect(screen.getByText('デフォルトリクエスト設定')).toBeInTheDocument()
    expect(screen.getByText('UI設定')).toBeInTheDocument()
    expect(screen.getByText('エディタ設定')).toBeInTheDocument()
    expect(screen.getByText('アプリケーション設定')).toBeInTheDocument()
    expect(screen.getByText('プロキシ設定')).toBeInTheDocument()
    expect(screen.getByText('開発者設定')).toBeInTheDocument()
  })

  it('should display current settings values', () => {
    render(<GlobalSettings />)

    // タイムアウト設定
    const timeoutInput = screen.getByDisplayValue('30000')
    expect(timeoutInput).toBeInTheDocument()

    // User-Agent設定
    const userAgentInput = screen.getByDisplayValue('API Tester 1.0')
    expect(userAgentInput).toBeInTheDocument()

    // チェックボックス設定
    expect(screen.getByLabelText('デフォルトでリダイレクトをフォロー')).toBeChecked()
    expect(screen.getByLabelText('デフォルトでSSL証明書を検証')).toBeChecked()
    expect(screen.getByLabelText('自動保存')).toBeChecked()
  })

  it('should update timeout setting', () => {
    render(<GlobalSettings />)

    const timeoutInput = screen.getByDisplayValue('30000')
    fireEvent.change(timeoutInput, { target: { value: '60000' } })

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      defaultTimeout: 60000
    })
  })

  it('should update theme setting', () => {
    render(<GlobalSettings />)

    const darkThemeRadio = screen.getByLabelText('ダーク')
    fireEvent.click(darkThemeRadio)

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      theme: 'dark'
    })
  })

  it('should update checkbox settings', () => {
    render(<GlobalSettings />)

    const followRedirectsCheckbox = screen.getByLabelText('デフォルトでリダイレクトをフォロー')
    fireEvent.click(followRedirectsCheckbox)

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      defaultFollowRedirects: false
    })
  })

  it('should update range settings', () => {
    render(<GlobalSettings />)

    const tabSizeRange = screen.getByDisplayValue('2')
    fireEvent.change(tabSizeRange, { target: { value: '4' } })

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      tabSize: 4
    })
  })

  it('should enable/disable dependent fields', () => {
    render(<GlobalSettings />)

    // プロキシ設定を有効にする
    const proxyEnabledCheckbox = screen.getByLabelText('プロキシを使用')
    fireEvent.click(proxyEnabledCheckbox)

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      proxyEnabled: true
    })
  })

  it('should handle export settings', async () => {
    mockDialogAPI.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: '/path/to/settings.json'
    })
    mockFileAPI.writeFile.mockResolvedValue({ success: true })

    render(<GlobalSettings />)

    const exportButton = screen.getByText('設定をエクスポート')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(mockDialogAPI.showSaveDialog).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockFileAPI.writeFile).toHaveBeenCalledWith(
        '/path/to/settings.json',
        JSON.stringify(mockSettings, null, 2)
      )
    })

    expect(global.alert).toHaveBeenCalledWith('設定をエクスポートしました')
  })

  it('should handle import settings from file', async () => {
    mockDialogAPI.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/path/to/settings.json']
    })
    mockFileAPI.readFile.mockResolvedValue({
      success: true,
      content: JSON.stringify(mockSettings)
    })

    render(<GlobalSettings />)

    const importButton = screen.getByText('ファイルからインポート')
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockDialogAPI.showOpenDialog).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockStoreActions.importSettings).toHaveBeenCalledWith(JSON.stringify(mockSettings))
    })

    expect(global.alert).toHaveBeenCalledWith('設定をインポートしました')
  })

  it('should handle import settings from text', () => {
    render(<GlobalSettings />)

    const importTextarea = screen.getByPlaceholderText('設定のJSONデータをここに貼り付けてください')
    const testSettings = JSON.stringify({ theme: 'dark' })

    fireEvent.change(importTextarea, { target: { value: testSettings } })

    const importButton = screen.getByText('設定をインポート')
    fireEvent.click(importButton)

    expect(mockStoreActions.importSettings).toHaveBeenCalledWith(testSettings)
    expect(global.alert).toHaveBeenCalledWith('設定をインポートしました')
  })

  it('should handle invalid import data', () => {
    mockStoreActions.importSettings.mockReturnValue(false)

    render(<GlobalSettings />)

    const importTextarea = screen.getByPlaceholderText('設定のJSONデータをここに貼り付けてください')
    fireEvent.change(importTextarea, { target: { value: 'invalid json' } })

    const importButton = screen.getByText('設定をインポート')
    fireEvent.click(importButton)

    expect(global.alert).toHaveBeenCalledWith('無効な設定データです')
  })

  it('should handle reset settings', () => {
    global.confirm = vi.fn().mockReturnValue(true)

    render(<GlobalSettings />)

    const resetButton = screen.getByText('設定をリセット')
    fireEvent.click(resetButton)

    expect(global.confirm).toHaveBeenCalledWith(
      'すべての設定をデフォルトに戻しますか？この操作は元に戻せません。'
    )
    expect(mockStoreActions.resetSettings).toHaveBeenCalled()
    expect(global.alert).toHaveBeenCalledWith('設定をリセットしました')
  })

  it('should not reset when confirmation is cancelled', () => {
    global.confirm = vi.fn().mockReturnValue(false)

    render(<GlobalSettings />)

    const resetButton = screen.getByText('設定をリセット')
    fireEvent.click(resetButton)

    expect(mockStoreActions.resetSettings).not.toHaveBeenCalled()
  })

  it('should show preview for import text', () => {
    render(<GlobalSettings />)

    const importTextarea = screen.getByPlaceholderText('設定のJSONデータをここに貼り付けてください')
    const testSettings = JSON.stringify({ theme: 'dark' }, null, 2)

    fireEvent.change(importTextarea, { target: { value: testSettings } })

    expect(screen.getByText('プレビュー:')).toBeInTheDocument()
    expect(screen.getByText(testSettings)).toBeInTheDocument()
  })

  it('should show invalid JSON message in preview', () => {
    render(<GlobalSettings />)

    const importTextarea = screen.getByPlaceholderText('設定のJSONデータをここに貼り付けてください')
    fireEvent.change(importTextarea, { target: { value: 'invalid json' } })

    expect(screen.getByText('プレビュー:')).toBeInTheDocument()
    expect(screen.getByText('無効なJSONデータです')).toBeInTheDocument()
  })

  it('should handle proxy authentication settings', () => {
    render(<GlobalSettings />)

    const proxyUsernameInput = screen.getByLabelText('プロキシユーザー名:')
    fireEvent.change(proxyUsernameInput, { target: { value: 'testuser' } })

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      proxyAuth: {
        username: 'testuser',
        password: ''
      }
    })
  })
})
