/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ipcMain } from 'electron'
import { ApiServiceV2 } from '../../services/apiServiceV2'
import { showErrorDialog } from '../utils/errorUtils'

export function setupApiHandlers(): void {
  // API実行
  ipcMain.handle(
    'executeApiRequest',
    async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
      try {
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
    async (_event, request: unknown, variableResolver?: unknown, saveToHistory = true) => {
      try {
        // AbortControllerを作成
        const abortController = new AbortController()

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
    async (_event, request: unknown, variableResolver?: unknown) => {
      try {
        const errors = await ApiServiceV2.validateRequest(
          request as any,
          variableResolver as ((text: string) => string) | undefined
        )

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
  ipcMain.handle('buildCurlCommand', (_event, request: unknown, variableResolver?: unknown) => {
    try {
      const curlCommand = ApiServiceV2.buildCurlCommand(
        request as any,
        variableResolver as ((text: string) => string) | undefined
      )

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
  })

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
