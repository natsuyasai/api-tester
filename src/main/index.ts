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
      console.error('Failed to open URL:', details.url, error)
    })
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((error) => {
      console.error('Failed to load URL:', process.env['ELECTRON_RENDERER_URL'], error)
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((error) => {
      console.error('Failed to load file:', join(__dirname, '../renderer/index.html'), error)
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
    console.error('Failed to initialize app:', error)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// ファイル書き込み
ipcMain.handle('writeFile', async (_event, filePath: string, data: string) => {
  try {
    await fs.writeFile(filePath, data, 'utf-8')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
        console.error('Failed to add auth to proxy URL:', error)
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

      return {
        success: false,
        message: `プロキシ接続テストが失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// API実行
ipcMain.handle('executeApiRequest', async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
  try {
    // ApiServiceV2を動的インポート
    const { ApiServiceV2 } = await import('../services/apiServiceV2')
    
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// キャンセル可能なAPI実行
ipcMain.handle('executeApiRequestWithCancel', async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
  try {
    // AbortControllerを作成
    const abortController = new AbortController()
    
    // ApiServiceV2を動的インポート
    const { ApiServiceV2 } = await import('../services/apiServiceV2')
    
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// APIリクエストの検証
ipcMain.handle('validateApiRequest', async (_event, request: unknown, variableResolver?: unknown) => {
  try {
    const { ApiServiceV2 } = await import('../services/apiServiceV2')
    
    const errors = await ApiServiceV2.validateRequest(
      request as any, 
      variableResolver as ((text: string) => string) | undefined
    )
    
    return {
      success: true,
      errors
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// cURLコマンド生成
ipcMain.handle('buildCurlCommand', async (_event, request: unknown, variableResolver?: unknown) => {
  try {
    const { ApiServiceV2 } = await import('../services/apiServiceV2')
    
    const curlCommand = ApiServiceV2.buildCurlCommand(
      request as any, 
      variableResolver as ((text: string) => string) | undefined
    )
    
    return {
      success: true,
      curlCommand
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

// ヘルスチェック実行
ipcMain.handle('healthCheck', async (_event, url: unknown) => {
  try {
    const { ApiServiceV2 } = await import('../services/apiServiceV2')
    
    const result = await ApiServiceV2.healthCheck(url as string)
    
    return {
      success: true,
      result
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
