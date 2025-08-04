import { ipcMain } from 'electron'
import { WindowStateService } from '../services/windowStateService'

/**
 * ウィンドウ状態管理に関するIPCハンドラーを設定
 */
export function setupWindowHandlers(): void {
  // ウィンドウ状態情報を取得
  ipcMain.handle('window:getStateInfo', async () => {
    try {
      return await WindowStateService.getWindowStateInfo()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`ウィンドウ状態情報の取得に失敗: ${errorMessage}`)
    }
  })

  // ウィンドウ状態をリセット
  ipcMain.handle('window:resetState', async () => {
    try {
      await WindowStateService.resetWindowState()
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`ウィンドウ状態のリセットに失敗: ${errorMessage}`)
    }
  })
}
