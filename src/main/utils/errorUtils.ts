import { BrowserWindow, dialog } from 'electron'

/**
 * エラーメッセージボックスを表示する共通関数
 */
export function showErrorDialog(title: string, message: string, detail: string): void {
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
