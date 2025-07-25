import { useCallback } from 'react'
import { ApiResponse } from '@/types/types'
import { useTabStore } from '@renderer/stores/tabStore'
import { showErrorDialog } from '@renderer/utils/errorUtils'
import { formatJson, getFileExtension, getContentType } from '@renderer/utils/responseUtils'

interface UseResponseActionsProps {
  tabId: string
  response: ApiResponse | null
  getCurrentContent: () => string
}

export const useResponseActions = ({
  tabId,
  response,
  getCurrentContent
}: UseResponseActionsProps) => {
  const { getTab } = useTabStore()

  const handleCopyToClipboard = useCallback(async (): Promise<void> => {
    try {
      const content = getCurrentContent()
      await navigator.clipboard.writeText(content)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      void showErrorDialog(
        'クリップボードコピーエラー',
        'クリップボードへのコピー中にエラーが発生しました',
        errorMessage
      )
    }
  }, [getCurrentContent])

  const handleExportResponse = useCallback(async (): Promise<void> => {
    const tab = getTab(tabId)
    if (!tab || !response) return

    const exportData = {
      request: {
        url: tab.request.url,
        method: tab.request.method,
        headers: tab.request.headers.filter((h) => h.enabled && h.key),
        params: tab.request.params.filter((p) => p.enabled && p.key),
        body: tab.request.body
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration: response.duration,
        timestamp: response.timestamp
      }
    }

    try {
      const jsonContent = JSON.stringify(exportData, null, 2)
      const result = await window.dialogAPI.showSaveDialog({
        title: 'Export API Response',
        defaultPath: `api-response-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, jsonContent)
        if (!writeResult.success) {
          throw new Error(writeResult.error ?? 'Failed to export file')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'レスポンスエクスポートエラー',
        'レスポンスのエクスポート中にエラーが発生しました',
        errorMessage
      )
    }
  }, [tabId, response, getTab])

  const handleDownloadResponse = useCallback(async (): Promise<void> => {
    if (!response) return

    try {
      const contentType = getContentType(response.headers)
      const content = typeof response.data === 'string' ? response.data : formatJson(response.data)
      const defaultExtension = getFileExtension(contentType)

      const result = await window.dialogAPI.showSaveDialog({
        title: 'Download Response',
        defaultPath: `response-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${defaultExtension}`,
        filters: [
          { name: 'Response File', extensions: [defaultExtension] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, content)
        if (!writeResult.success) {
          throw new Error(writeResult.error ?? 'Failed to download file')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await showErrorDialog(
        'レスポンスダウンロードエラー',
        'レスポンスのダウンロード中にエラーが発生しました',
        errorMessage
      )
    }
  }, [response])

  return {
    handleCopyToClipboard,
    handleExportResponse,
    handleDownloadResponse
  }
}
