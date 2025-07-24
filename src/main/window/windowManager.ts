import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import icon from '../../../resources/icon.png?asset'
import { showErrorDialog } from '../utils/errorUtils'

export function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 800,
    width: 800,
    height: 720,
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
