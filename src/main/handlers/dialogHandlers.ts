import {
  ipcMain,
  dialog,
  BrowserWindow,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions
} from 'electron'

export function setupDialogHandlers(): void {
  // ファイル選択ダイアログ
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
}
