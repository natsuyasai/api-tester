import {
  ApiResponse,
  ApiResponseData,
  JsonResponseData,
  TextResponseData,
  BinaryResponseData,
  ErrorResponseData
} from '@/types/types'
// ErrorHandlerは削除し、直接エラーハンドリングを行う

/**
 * HTTPレスポンス処理サービス
 */
export class ResponseProcessor {
  private response: Response
  private startTime: number

  constructor(response: Response, startTime: number) {
    this.response = response
    this.startTime = startTime
  }

  /**
   * レスポンスを処理してApiResponse形式に変換
   */
  async processResponse(): Promise<ApiResponse> {
    const endTime = Date.now()
    const duration = endTime - this.startTime

    // ヘッダーをオブジェクトに変換
    const responseHeaders: Record<string, string> = {}
    this.response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // レスポンスデータを処理
    const responseData = await this.processResponseData()

    return {
      status: this.response.status,
      statusText: this.response.statusText,
      headers: responseHeaders,
      data: responseData,
      duration,
      timestamp: new Date().toISOString(),
      finalUrl: this.response.url // リダイレクト後の最終URL
    }
  }

  /**
   * レスポンスデータを型に応じて処理
   */
  private async processResponseData(): Promise<ApiResponseData> {
    const contentType = this.response.headers.get('content-type') || ''

    try {
      // JSON形式の場合
      if (contentType.includes('application/json') || contentType.includes('application/ld+json')) {
        return await this.processJsonResponse(contentType)
      }

      // テキスト形式の場合
      if (
        contentType.includes('text/') ||
        contentType.includes('application/xml') ||
        contentType.includes('application/xhtml+xml')
      ) {
        return await this.processTextResponse(contentType)
      }

      // バイナリデータの場合
      return await this.processBinaryResponse(contentType)
    } catch (error) {
      console.error('Response data processing error:', error)

      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        contentType
      } as ErrorResponseData
    }
  }

  /**
   * JSONレスポンスを処理
   */
  private async processJsonResponse(
    contentType: string
  ): Promise<JsonResponseData | TextResponseData> {
    const text = await this.response.text()

    try {
      const data = JSON.parse(text) as Record<string, unknown> | unknown[]
      return {
        type: 'json',
        data,
        size: text.length,
        contentType
      }
    } catch (_error) {
      // JSON parse エラーの場合はテキストとして扱う
      return {
        type: 'text',
        data: text,
        size: text.length,
        contentType
      } as TextResponseData
    }
  }

  /**
   * テキストレスポンスを処理
   */
  private async processTextResponse(contentType: string): Promise<TextResponseData> {
    const data = await this.response.text()

    return {
      type: 'text',
      data,
      size: data.length,
      contentType
    }
  }

  /**
   * バイナリレスポンスを処理
   */
  private async processBinaryResponse(contentType: string): Promise<BinaryResponseData> {
    try {
      const blob = await this.response.blob()
      const size = blob.size

      if (!blob || size === 0) {
        return {
          type: 'binary',
          size: 0,
          contentType,
          data: null,
          subType: 'other',
          isPreviewable: false
        }
      }

      return await this.convertBlobToTypedData(blob, contentType, size)
    } catch (error) {
      console.error('Binary response processing error:', error)

      return {
        type: 'binary',
        size: 0,
        contentType,
        data: null,
        subType: 'other',
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * BlobをサブタイプごとのデータIn形式に変換
   */
  private async convertBlobToTypedData(
    blob: Blob,
    contentType: string,
    size: number
  ): Promise<BinaryResponseData> {
    const MAX_PREVIEW_SIZE = 10 * 1024 * 1024 // 10MB

    // 画像の場合
    if (contentType.startsWith('image/')) {
      return await this.processImageBlob(blob, contentType, size)
    }

    // ドキュメント/PDF の場合
    if (
      contentType.includes('pdf') ||
      contentType.includes('document') ||
      contentType.includes('presentation')
    ) {
      return await this.processDocumentBlob(blob, contentType, size)
    }

    // 音声/動画の場合
    if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
      return await this.processMediaBlob(blob, contentType, size)
    }

    // その他のバイナリデータ
    if (size > MAX_PREVIEW_SIZE) {
      return {
        type: 'binary',
        subType: 'other',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        notice: 'Large file - blob data preserved, base64 conversion skipped'
      }
    }

    // 小さなバイナリファイルはbase64変換
    try {
      const base64Data = await this.blobToBase64(blob)
      return {
        type: 'binary',
        subType: 'other',
        size,
        contentType,
        data: base64Data,
        dataUrl: `data:${contentType};base64,${base64Data}`,
        originalBlob: blob,
        isPreviewable: false
      }
    } catch (error) {
      return {
        type: 'binary',
        subType: 'other',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  /**
   * 画像Blobを処理
   */
  private async processImageBlob(
    blob: Blob,
    contentType: string,
    size: number
  ): Promise<BinaryResponseData> {
    try {
      const base64Data = await this.blobToBase64(blob)
      const dataUrl = `data:${contentType};base64,${base64Data}`

      return {
        type: 'binary',
        subType: 'image',
        size,
        contentType,
        data: base64Data,
        dataUrl,
        originalBlob: blob,
        isPreviewable: true
      }
    } catch (error) {
      console.error('Image blob processing error:', error)

      return {
        type: 'binary',
        subType: 'image',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * ドキュメントBlobを処理
   */
  private async processDocumentBlob(
    blob: Blob,
    contentType: string,
    size: number
  ): Promise<BinaryResponseData> {
    try {
      const base64Data = await this.blobToBase64(blob)
      const dataUrl = `data:${contentType};base64,${base64Data}`

      return {
        type: 'binary',
        subType: 'document',
        size,
        contentType,
        data: base64Data,
        dataUrl,
        originalBlob: blob,
        isPreviewable: true
      }
    } catch (error) {
      console.error('Document blob processing error:', error)

      return {
        type: 'binary',
        subType: 'document',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * メディア（音声/動画）Blobを処理
   */
  private async processMediaBlob(
    blob: Blob,
    contentType: string,
    size: number
  ): Promise<BinaryResponseData> {
    try {
      const base64Data = await this.blobToBase64(blob)
      const dataUrl = `data:${contentType};base64,${base64Data}`

      return {
        type: 'binary',
        subType: contentType.startsWith('audio/') ? 'audio' : 'video',
        size,
        contentType,
        data: base64Data,
        dataUrl,
        originalBlob: blob,
        isPreviewable: true
      }
    } catch (error) {
      console.error('Media blob processing error:', error)

      return {
        type: 'binary',
        subType: contentType.startsWith('audio/') ? 'audio' : 'video',
        size,
        contentType,
        data: null,
        dataUrl: null,
        originalBlob: blob,
        isPreviewable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * BlobをBase64文字列に変換
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] // "data:type;base64," を除去
        resolve(base64)
      }
      reader.onerror = () => reject(new Error(reader.error?.message || 'FileReader error'))
      reader.readAsDataURL(blob)
    })
  }

  /**
   * エラーレスポンスを作成
   */
  static createErrorResponse(error: unknown, startTime: number): ApiResponse {
    const endTime = Date.now()
    const duration = endTime - startTime

    console.error('Network request error:', error)

    // エラータイプの判定
    let statusText = 'Network Error'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        statusText = 'Request Timeout'
      } else if (error.message.includes('fetch')) {
        statusText = 'Fetch Error'
      }
    }

    return {
      status: 0,
      statusText,
      headers: {},
      data: {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        contentType: 'text/plain'
      } as ErrorResponseData,
      duration,
      timestamp: new Date().toISOString(),
      finalUrl: undefined // エラー時は最終URLなし
    }
  }
}
