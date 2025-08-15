import { promises as fs } from 'fs'
import { ipcMain } from 'electron'
import { showErrorDialog } from '../utils/errorUtils'

export function setupFileHandlers(): void {
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
}
