import { FileEncoding } from '@/types/types'

/**
 * ファイルサービス - ファイルの読み取りとエンコーディング変換を行う
 */
export class FileService {
  /**
   * ファイルを読み取り、指定されたエンコーディングで変換する
   * @param file - 読み取るファイル
   * @param encoding - エンコーディング方法
   * @returns エンコードされたファイル内容
   */
  static async processFile(file: File, encoding: FileEncoding): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const result = reader.result
        if (result === null) {
          reject(new Error('ファイルの読み取りに失敗しました'))
          return
        }

        if (encoding === 'base64') {
          // base64エンコーディング
          if (typeof result === 'string') {
            // FileReader.readAsDataURL()の場合
            const base64 = result.split(',')[1] // "data:type/subtype;base64," 部分を除去
            resolve(base64)
          } else {
            // ArrayBufferの場合（念のため）
            const base64 = btoa(String.fromCharCode(...new Uint8Array(result)))
            resolve(base64)
          }
        } else {
          // バイナリ（テキスト）として読み取り
          if (typeof result === 'string') {
            resolve(result)
          } else {
            // ArrayBufferをテキストに変換
            const text = new TextDecoder().decode(result)
            resolve(text)
          }
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み取り中にエラーが発生しました'))
      }

      if (encoding === 'base64') {
        reader.readAsDataURL(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  /**
   * ファイルサイズを人間が読みやすい形式でフォーマット
   * @param bytes - バイト数
   * @returns フォーマットされたファイルサイズ
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * ファイルタイプが許可されているかチェック
   * @param file - チェックするファイル
   * @param allowedTypes - 許可されるMIMEタイプの配列（未指定の場合は全て許可）
   * @returns 許可されている場合true
   */
  static isFileTypeAllowed(file: File, allowedTypes?: string[]): boolean {
    if (!allowedTypes || allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.some((type) => {
      if (type.endsWith('/*')) {
        // ワイルドカード（例: image/*）
        const baseType = type.slice(0, -2)
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })
  }

  /**
   * ファイルサイズが制限内かチェック
   * @param file - チェックするファイル
   * @param maxSizeInMB - 最大サイズ（MB単位、未指定の場合は制限なし）
   * @returns 制限内の場合true
   */
  static isFileSizeAllowed(file: File, maxSizeInMB?: number): boolean {
    if (!maxSizeInMB) {
      return true
    }

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return file.size <= maxSizeInBytes
  }
}
