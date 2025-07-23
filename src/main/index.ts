/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { promises as fs } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions
} from 'electron'
import icon from '../../resources/icon.png?asset'
import { ApiServiceV2 } from '../services/apiServiceV2'

/**
 * エラーメッセージボックスを表示する共通関数
 */
function showErrorDialog(title: string, message: string, detail: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  const dialogOptions = {
    type: 'error' as const,
    title,
    message,
    detail,
    buttons: ['OK']
  }

  if (focusedWindow) {
    dialog.showMessageBox(focusedWindow, dialogOptions).catch(console.error)
  } else {
    dialog.showMessageBox(dialogOptions).catch(console.error)
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 800,
    width: 800,
    height: 800,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      showErrorDialog(
        'URL起動エラー',
        '外部URLの起動に失敗しました',
        `URL: ${details.url}\nエラー: ${errorMessage}`
      )
    })
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      showErrorDialog(
        'レンダラーURL読み込みエラー',
        '開発環境でのレンダラーURLの読み込みに失敗しました',
        `URL: ${process.env['ELECTRON_RENDERER_URL']}\nエラー: ${errorMessage}`
      )
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error)
      showErrorDialog(
        'レンダラーファイル読み込みエラー',
        'レンダラーファイルの読み込みに失敗しました',
        `パス: ${join(__dirname, '../renderer/index.html')}\nエラー: ${errorMessage}`
      )
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    showErrorDialog(
      'アプリケーション初期化エラー',
      'アプリケーションの初期化に失敗しました',
      errorMessage
    )
  })

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

// ダイアログ
ipcMain.handle('showOpenDialog', async (_event, option: OpenDialogOptions) => {
  return await dialog.showOpenDialog(option)
})

// メッセージボックス
ipcMain.handle('showModalMessageBox', async (_event, option: MessageBoxOptions) => {
  const focusedWindows = BrowserWindow.getFocusedWindow()
  if (focusedWindows) {
    return await dialog.showMessageBox(focusedWindows, option)
  }
  return await dialog.showMessageBox(option)
})

// ファイル保存ダイアログ
ipcMain.handle('showSaveDialog', async (_event, options: SaveDialogOptions) => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    return await dialog.showSaveDialog(focusedWindow, options)
  }
  return await dialog.showSaveDialog(options)
})

// ファイル読み込み
ipcMain.handle('readFile', async (_event, filePath: string) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // エラーメッセージボックスを表示
    showErrorDialog(
      'ファイル読み込みエラー',
      'ファイルの読み込み中にエラーが発生しました',
      errorMessage
    )

    return {
      success: false,
      error: errorMessage
    }
  }
})

// ファイル書き込み
ipcMain.handle('writeFile', async (_event, filePath: string, data: string) => {
  try {
    await fs.writeFile(filePath, data, 'utf-8')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // エラーメッセージボックスを表示
    showErrorDialog(
      'ファイル書き込みエラー',
      'ファイルの書き込み中にエラーが発生しました',
      errorMessage
    )

    return {
      success: false,
      error: errorMessage
    }
  }
})

// プロキシ設定
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
      showErrorDialog('プロキシ接続テストエラー', 'プロキシ接続テストが失敗しました', errorMessage)

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

// API実行
ipcMain.handle(
  'executeApiRequest',
  async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
    try {
      // APIリクエストを実行
      const response = await ApiServiceV2.executeRequest(
        request as any,
        variableResolver as ((text: string) => string) | undefined,
        saveToHistory as boolean
      )

      return {
        success: true,
        response
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラーメッセージボックスを表示
      showErrorDialog('API実行エラー', 'APIリクエストの実行中にエラーが発生しました', errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

// キャンセル可能なAPI実行
ipcMain.handle(
  'executeApiRequestWithCancel',
  async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
    try {
      // AbortControllerを作成
      const abortController = new AbortController()

      // APIリクエストを実行
      const response = await ApiServiceV2.executeRequestWithCancel(
        request as any,
        abortController.signal,
        variableResolver as ((text: string) => string) | undefined,
        saveToHistory as boolean
      )

      return {
        success: true,
        response
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラーメッセージボックスを表示
      showErrorDialog(
        'API実行エラー（キャンセル可能）',
        'APIリクエストの実行中にエラーが発生しました',
        errorMessage
      )

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

// APIリクエストの検証
ipcMain.handle(
  'validateApiRequest',
  async (_event, request: unknown, variableResolver?: unknown) => {
    try {
      const errors = await ApiServiceV2.validateRequest(
        request as any,
        variableResolver as ((text: string) => string) | undefined
      )

      return {
        success: true,
        errors
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラーメッセージボックスを表示
      showErrorDialog(
        'リクエスト検証エラー',
        'リクエストの検証中にエラーが発生しました',
        errorMessage
      )

      return {
        success: false,
        error: errorMessage
      }
    }
  }
)

// cURLコマンド生成
ipcMain.handle('buildCurlCommand', async (_event, request: unknown, variableResolver?: unknown) => {
  try {
    const curlCommand = ApiServiceV2.buildCurlCommand(
      request as any,
      variableResolver as ((text: string) => string) | undefined
    )

    return {
      success: true,
      curlCommand
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // エラーメッセージボックスを表示
    showErrorDialog(
      'cURLコマンド生成エラー',
      'cURLコマンドの生成中にエラーが発生しました',
      errorMessage
    )

    return {
      success: false,
      error: errorMessage
    }
  }
})

// ヘルスチェック実行
ipcMain.handle('healthCheck', async (_event, url: unknown) => {
  try {
    const result = await ApiServiceV2.healthCheck(url as string)

    return {
      success: true,
      result
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // エラーメッセージボックスを表示
    showErrorDialog(
      'ヘルスチェックエラー',
      'ヘルスチェックの実行中にエラーが発生しました',
      errorMessage
    )

    return {
      success: false,
      error: errorMessage
    }
  }
})
