import { homedir } from 'node:os'
import { join } from 'node:path'
import { NodeFileService } from './nodeFileService'

/**
 * Node.js環境用ストレージサービス
 * LocalStorageの代わりにファイルシステムを使用してデータを永続化
 */
export class NodeStorageService {
  private static readonly APP_NAME = 'api-tester'
  private static storageDir: string | null = null

  /**
   * ストレージディレクトリを取得（初回は作成）
   */
  private static async getStorageDir(): Promise<string> {
    if (this.storageDir) {
      return this.storageDir
    }

    const homeDir = homedir()
    const configDir = process.platform === 'win32' 
      ? join(homeDir, 'AppData', 'Local', this.APP_NAME)
      : process.platform === 'darwin'
      ? join(homeDir, 'Library', 'Application Support', this.APP_NAME)
      : join(homeDir, '.config', this.APP_NAME)

    this.storageDir = configDir

    try {
      await NodeFileService.createDirectory(configDir)
    } catch (error) {
      console.error('ストレージディレクトリの作成に失敗:', error)
      throw new Error('ストレージディレクトリの作成に失敗しました')
    }

    return configDir
  }

  /**
   * キーに対応するファイルパスを取得
   */
  private static async getFilePath(key: string): Promise<string> {
    const storageDir = await this.getStorageDir()
    // キー名をファイルシステム安全な名前に変換
    const safeKey = key.replace(/[<>:"/\\|?*]/g, '_')
    return join(storageDir, `${safeKey}.json`)
  }

  /**
   * データを保存
   * @param key - 保存キー
   * @param value - 保存する値（JSON.stringifyされる）
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      const filePath = await this.getFilePath(key)
      const data = {
        key,
        value,
        timestamp: Date.now()
      }
      await NodeFileService.writeTextFile(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`ストレージへの保存に失敗 (key: ${key}):`, error)
      throw new Error(`ストレージへの保存に失敗しました: ${key}`)
    }
  }

  /**
   * データを取得
   * @param key - 取得キー
   * @returns 保存されている値（存在しない場合はnull）
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const filePath = await this.getFilePath(key)
      
      if (!(await NodeFileService.fileExists(filePath))) {
        return null
      }

      const content = await NodeFileService.processFile(filePath, 'binary')
      const data = JSON.parse(content)
      
      return data.value || null
    } catch (error) {
      console.error(`ストレージからの取得に失敗 (key: ${key}):`, error)
      return null
    }
  }

  /**
   * データを削除
   * @param key - 削除キー
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const filePath = await this.getFilePath(key)
      
      if (await NodeFileService.fileExists(filePath)) {
        await NodeFileService.deleteFile(filePath)
      }
    } catch (error) {
      console.error(`ストレージからの削除に失敗 (key: ${key}):`, error)
      throw new Error(`ストレージからの削除に失敗しました: ${key}`)
    }
  }

  /**
   * 全てのデータを削除
   */
  static async clear(): Promise<void> {
    try {
      const storageDir = await this.getStorageDir()
      const files = await NodeFileService.listFiles(storageDir, '.json')
      
      await Promise.all(files.map(file => NodeFileService.deleteFile(file)))
    } catch (error) {
      console.error('ストレージのクリアに失敗:', error)
      throw new Error('ストレージのクリアに失敗しました')
    }
  }

  /**
   * 保存されているキーの一覧を取得
   * @returns キーの配列
   */
  static async keys(): Promise<string[]> {
    try {
      const storageDir = await this.getStorageDir()
      const files = await NodeFileService.listFiles(storageDir, '.json')
      const keys: string[] = []

      for (const file of files) {
        try {
          const content = await NodeFileService.processFile(file, 'binary')
          const data = JSON.parse(content)
          if (data.key) {
            keys.push(data.key)
          }
        } catch (error) {
          // 破損したファイルはスキップ
          console.warn(`破損したストレージファイル: ${file}`)
        }
      }

      return keys
    } catch (error) {
      console.error('キー一覧の取得に失敗:', error)
      return []
    }
  }

  /**
   * ストレージサイズを取得
   * @returns 使用容量（バイト）
   */
  static async getStorageSize(): Promise<number> {
    try {
      const storageDir = await this.getStorageDir()
      const files = await NodeFileService.listFiles(storageDir, '.json')
      let totalSize = 0

      for (const file of files) {
        try {
          const size = await NodeFileService.getFileSize(file)
          totalSize += size
        } catch {
          // ファイルアクセスエラーはスキップ
        }
      }

      return totalSize
    } catch (error) {
      console.error('ストレージサイズの取得に失敗:', error)
      return 0
    }
  }

  /**
   * ストレージ情報を取得
   */
  static async getStorageInfo() {
    try {
      const storageDir = await this.getStorageDir()
      const keys = await this.keys()
      const size = await this.getStorageSize()

      return {
        directory: storageDir,
        keysCount: keys.length,
        totalSize: size,
        formattedSize: NodeFileService.formatFileSize(size),
        keys
      }
    } catch (error) {
      console.error('ストレージ情報の取得に失敗:', error)
      throw new Error('ストレージ情報の取得に失敗しました')
    }
  }

  /**
   * データのバックアップを作成
   * @param backupPath - バックアップ先のパス（省略時は自動生成）
   */
  static async createBackup(backupPath?: string): Promise<string> {
    try {
      const storageDir = await this.getStorageDir()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultBackupPath = join(storageDir, `backup-${timestamp}`)
      const targetPath = backupPath || defaultBackupPath

      await NodeFileService.createDirectory(targetPath)

      const files = await NodeFileService.listFiles(storageDir, '.json')
      for (const file of files) {
        const filename = file.split('/').pop() || 'unknown.json'
        const targetFile = join(targetPath, filename)
        await NodeFileService.copyFile(file, targetFile)
      }

      return targetPath
    } catch (error) {
      console.error('バックアップの作成に失敗:', error)
      throw new Error('バックアップの作成に失敗しました')
    }
  }

  /**
   * バックアップからデータを復元
   * @param backupPath - バックアップディレクトリのパス
   */
  static async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      const storageDir = await this.getStorageDir()
      
      if (!(await NodeFileService.fileExists(backupPath))) {
        throw new Error('バックアップディレクトリが存在しません')
      }

      // 既存のデータをクリア
      await this.clear()

      // バックアップファイルを復元
      const backupFiles = await NodeFileService.listFiles(backupPath, '.json')
      for (const file of backupFiles) {
        const filename = file.split('/').pop() || 'unknown.json'
        const targetFile = join(storageDir, filename)
        await NodeFileService.copyFile(file, targetFile)
      }
    } catch (error) {
      console.error('バックアップからの復元に失敗:', error)
      throw new Error('バックアップからの復元に失敗しました')
    }
  }

  /**
   * LocalStorage互換のAPIを提供（同期的なアクセス用）
   * 注意: 実際にはファイルI/Oなので非同期だが、互換性のために同期的なインターフェースを模倣
   */
  static createLocalStorageAdapter() {
    const cache = new Map<string, string>()
    let initialized = false

    const ensureInitialized = async () => {
      if (!initialized) {
        const keys = await this.keys()
        for (const key of keys) {
          const value = await this.getItem(key)
          if (value !== null) {
            cache.set(key, value)
          }
        }
        initialized = true
      }
    }

    return {
      async init() {
        await ensureInitialized()
      },

      setItem(key: string, value: string) {
        cache.set(key, value)
        // 非同期でファイルに書き込み
        NodeStorageService.setItem(key, value).catch(error => {
          console.error('LocalStorage adapter setItem error:', error)
        })
      },

      getItem(key: string): string | null {
        return cache.get(key) || null
      },

      removeItem(key: string) {
        cache.delete(key)
        // 非同期でファイルから削除
        NodeStorageService.removeItem(key).catch(error => {
          console.error('LocalStorage adapter removeItem error:', error)
        })
      },

      clear() {
        cache.clear()
        // 非同期でファイルをクリア
        NodeStorageService.clear().catch(error => {
          console.error('LocalStorage adapter clear error:', error)
        })
      },

      get length() {
        return cache.size
      },

      key(index: number): string | null {
        const keys = Array.from(cache.keys())
        return keys[index] || null
      }
    }
  }
}