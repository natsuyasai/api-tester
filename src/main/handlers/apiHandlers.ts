import { ipcMain, BrowserWindow } from 'electron'
import { ApiServiceV2 } from '../../services/apiServiceV2'
import type { ApiRequest } from '../../types/types'
import { showErrorDialog } from '../utils/errorUtils'

export function setupApiHandlers(): void {
  // API実行
  ipcMain.handle(
    'executeApiRequest',
    async (
      event,
      request: ApiRequest,
      variableResolver?: (text: string) => string,
      saveToHistory = true
    ) => {
      try {
        // APIリクエストを実行
        const response = await ApiServiceV2.executeRequest(
          request,
          variableResolver,
          false // メインプロセスでは履歴保存をしない
        )

        // 履歴が必要な場合はレンダラープロセスに送信
        if (saveToHistory && response) {
          const historyEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            request,
            response,
            duration: response.duration || 0
          }

          console.log('メインプロセス: 履歴データを送信します:', {
            id: historyEntry.id,
            url: request.url,
            method: request.method
          })

          // レンダラープロセスに履歴データを送信
          const browserWindow = BrowserWindow.fromWebContents(event.sender)
          if (browserWindow) {
            browserWindow.webContents.send('api-execution-history', historyEntry)
          }
        }

        return {
          success: true,
          response
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // エラーメッセージボックスを表示
        showErrorDialog(
          'API実行エラー',
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

  // キャンセル可能なAPI実行
  ipcMain.handle(
    'executeApiRequestWithCancel',
    async (
      event,
      request: ApiRequest,
      variableResolver?: (text: string) => string,
      saveToHistory = true
    ) => {
      try {
        // AbortControllerを作成
        const abortController = new AbortController()

        // APIリクエストを実行
        const response = await ApiServiceV2.executeRequestWithCancel(
          request,
          abortController.signal,
          variableResolver,
          false // メインプロセスでは履歴保存をしない
        )

        // 履歴が必要な場合はレンダラープロセスに送信
        if (saveToHistory && response) {
          const historyEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            request,
            response,
            duration: response.duration || 0
          }

          console.log('メインプロセス: 履歴データを送信します:', {
            id: historyEntry.id,
            url: request.url,
            method: request.method
          })

          // レンダラープロセスに履歴データを送信
          const browserWindow = BrowserWindow.fromWebContents(event.sender)
          if (browserWindow) {
            browserWindow.webContents.send('api-execution-history', historyEntry)
          }
        }

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
    async (_event, request: ApiRequest, variableResolver?: (text: string) => string) => {
      try {
        const errors = await ApiServiceV2.validateRequest(request, variableResolver)

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
  ipcMain.handle(
    'buildCurlCommand',
    (_event, request: ApiRequest, variableResolver?: (text: string) => string) => {
      try {
        const curlCommand = ApiServiceV2.buildCurlCommand(request, variableResolver)

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
    }
  )

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
}
