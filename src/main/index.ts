import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions
} from 'electron'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    minWidth: 640,
    minHeight: 480,
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
