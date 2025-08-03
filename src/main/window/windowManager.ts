import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import icon from '../../../resources/icon.png?asset'
import { WindowStateService } from '../services/windowStateService'
import { showErrorDialog } from '../utils/errorUtils'

export async function createWindow(): Promise<void> {
  // ウィンドウ状態を読み込み
  const windowState = await WindowStateService.loadWindowState()

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // ウィンドウ状態管理を設定
  WindowStateService.setupWindowStateManager(mainWindow)

  mainWindow.on('ready-to-show', () => {
    // 最大化・フルスクリーン状態を復元
    if (windowState.isMaximized) {
      mainWindow.maximize()
    } else if (windowState.isFullScreen) {
      mainWindow.setFullScreen(true)
    }
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
