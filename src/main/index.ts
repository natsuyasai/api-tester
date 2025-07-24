import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain } from 'electron'
import { setupApiHandlers } from './handlers/apiHandlers'
import { setupConfigHandlers } from './handlers/configHandlers'
import { setupDialogHandlers } from './handlers/dialogHandlers'
import { setupFileHandlers } from './handlers/fileHandlers'
import { setupProxyHandlers } from './handlers/proxyHandlers'
import { setupTlsHandlers, cleanupTlsHandlers } from './handlers/tlsHandlers'
import { showErrorDialog } from './utils/errorUtils'
import { createWindow } from './window/windowManager'

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

    // Setup IPC handlers
    setupConfigHandlers()
    setupDialogHandlers()
    setupFileHandlers()
    setupProxyHandlers()
    setupTlsHandlers()
    setupApiHandlers()

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

// アプリケーション終了時のクリーンアップ
app.on('before-quit', () => {
  cleanupTlsHandlers()
})
