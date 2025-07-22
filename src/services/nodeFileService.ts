import { promises as fs } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { FileEncoding } from '@/types/types'

/**
 * Node.js環境用ファイルサービス
 * ElectronのNode.js環境でファイルの読み取りとエンコーディング変換を行う
 */
export class NodeFileService {
  /**
   * ファイルパスからファイルを読み取り、指定されたエンコーディングで変換する
   * @param filePath - 読み取るファイルのパス
   * @param encoding - エンコーディング方法
   * @returns エンコードされたファイル内容
   */
  static async processFile(filePath: string, encoding: FileEncoding): Promise<string> {
    try {
      if (encoding === 'base64') {
        // base64エンコーディング
        const buffer = await fs.readFile(filePath)
        return buffer.toString('base64')
      } else {
        // テキストとして読み取り（UTF-8）
        return await fs.readFile(filePath, 'utf8')
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`ファイルの読み取りに失敗しました: ${error.message}`)
      }
      throw new Error('ファイルの読み取りに失敗しました')
    }
  }

  /**
   * Buffer から指定されたエンコーディングで変換する
   * @param buffer - 変換するBuffer
   * @param encoding - エンコーディング方法
   * @returns エンコードされた内容
   */
  static processBuffer(buffer: Buffer, encoding: FileEncoding): string {
    if (encoding === 'base64') {
      return buffer.toString('base64')
    } else {
      return buffer.toString('utf8')
    }
  }

  /**
   * ファイルサイズを取得
   * @param filePath - ファイルのパス
   * @returns ファイルサイズ（バイト）
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      throw new Error('ファイルサイズの取得に失敗しました')
    }
  }

  /**
   * ファイルサイズを人間が読みやすい形式でフォーマット
   * @param bytes - バイト数
   * @returns フォーマットされたファイルサイズ
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * ファイルが存在するかチェック
   * @param filePath - チェックするファイルのパス
   * @returns 存在する場合true
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * ファイル拡張子からMIMEタイプを推測
   * @param filePath - ファイルのパス
   * @returns MIMEタイプ
   */
  static getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.json': 'application/json',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.gz': 'application/gzip'
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * ファイルタイプが許可されているかチェック
   * @param filePath - チェックするファイルのパス
   * @param allowedTypes - 許可されるMIMEタイプの配列（未指定の場合は全て許可）
   * @returns 許可されている場合true
   */
  static isFileTypeAllowed(filePath: string, allowedTypes?: string[]): boolean {
    if (!allowedTypes || allowedTypes.length === 0) {
      return true
    }

    const mimeType = this.getMimeType(filePath)

    return allowedTypes.some((type) => {
      if (type.endsWith('/*')) {
        // ワイルドカード（例: image/*）
        const baseType = type.slice(0, -2)
        return mimeType.startsWith(baseType)
      }
      return mimeType === type
    })
  }

  /**
   * ファイルサイズが制限内かチェック
   * @param filePath - チェックするファイルのパス
   * @param maxSizeInMB - 最大サイズ（MB単位、未指定の場合は制限なし）
   * @returns 制限内の場合true
   */
  static async isFileSizeAllowed(filePath: string, maxSizeInMB?: number): Promise<boolean> {
    if (!maxSizeInMB) {
      return true
    }

    try {
      const size = await this.getFileSize(filePath)
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024
      return size <= maxSizeInBytes
    } catch {
      return false
    }
  }

  /**
   * ファイルを新しい場所にコピー
   * @param sourcePath - コピー元のパス
   * @param targetPath - コピー先のパス
   */
  static async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await fs.copyFile(sourcePath, targetPath)
    } catch (error) {
      throw new Error('ファイルのコピーに失敗しました')
    }
  }

  /**
   * ファイルを削除
   * @param filePath - 削除するファイルのパス
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      throw new Error('ファイルの削除に失敗しました')
    }
  }

  /**
   * ディレクトリを作成（再帰的）
   * @param dirPath - 作成するディレクトリのパス
   */
  static async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      throw new Error('ディレクトリの作成に失敗しました')
    }
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   * @param dirPath - 検索するディレクトリのパス
   * @param extension - フィルタする拡張子（オプション）
   * @returns ファイルパスの配列
   */
  static async listFiles(dirPath: string, extension?: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const files = entries
        .filter(entry => entry.isFile())
        .map(entry => join(dirPath, entry.name))

      if (extension) {
        const ext = extension.startsWith('.') ? extension : `.${extension}`
        return files.filter(file => extname(file).toLowerCase() === ext)
      }

      return files
    } catch (error) {
      throw new Error('ディレクトリの読み取りに失敗しました')
    }
  }

  /**
   * ファイルの情報を取得
   * @param filePath - ファイルのパス
   * @returns ファイル情報
   */
  static async getFileInfo(filePath: string) {
    try {
      const stats = await fs.stat(filePath)
      const name = basename(filePath)
      const ext = extname(filePath)
      const mimeType = this.getMimeType(filePath)

      return {
        path: filePath,
        name,
        extension: ext,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        mimeType,
        created: stats.ctime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    } catch (error) {
      throw new Error('ファイル情報の取得に失敗しました')
    }
  }

  /**
   * テキストファイルを書き込み
   * @param filePath - 書き込み先のパス
   * @param content - 書き込む内容
   * @param encoding - エンコーディング（デフォルト: utf8）
   */
  static async writeTextFile(
    filePath: string, 
    content: string, 
    encoding: BufferEncoding = 'utf8'
  ): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      const dirPath = join(filePath, '..')
      await this.createDirectory(dirPath)
      
      await fs.writeFile(filePath, content, encoding)
    } catch (error) {
      throw new Error('ファイルの書き込みに失敗しました')
    }
  }

  /**
   * バイナリファイルを書き込み
   * @param filePath - 書き込み先のパス
   * @param buffer - 書き込むBuffer
   */
  static async writeBinaryFile(filePath: string, buffer: Buffer): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      const dirPath = join(filePath, '..')
      await this.createDirectory(dirPath)
      
      await fs.writeFile(filePath, buffer)
    } catch (error) {
      throw new Error('バイナリファイルの書き込みに失敗しました')
    }
  }
}