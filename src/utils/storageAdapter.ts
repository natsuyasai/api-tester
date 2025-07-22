/**
 * ストレージアダプター
 * 実行環境に応じてLocalStorageまたはNodeStorageServiceを使用
 */

// Node.js環境判定
const isNodeEnvironment = () => {
  // Electronのレンダラープロセス環境
  if (typeof window !== 'undefined' && window.process && window.process.type) {
    return true
  }

  // ElectronのNode.js環境またはメインプロセス
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true
  }

  // Node.js環境
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node &&
    typeof window === 'undefined'
  ) {
    return true
  }

  return false
}

/**
 * ストレージインターフェース
 */
interface StorageInterface {
  setItem(key: string, value: string): void | Promise<void>
  getItem(key: string): string | null | Promise<string | null>
  removeItem(key: string): void | Promise<void>
  clear(): void | Promise<void>
  keys(): string[] | Promise<string[]>
  length(): number | Promise<number>
}

/**
 * ブラウザ用LocalStorageアダプター
 */
class BrowserStorageAdapter implements StorageInterface {
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  }

  getItem(key: string): string | null {
    return localStorage.getItem(key)
  }

  removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  clear(): void {
    localStorage.clear()
  }

  keys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) keys.push(key)
    }
    return keys
  }

  length(): number {
    return localStorage.length
  }
}

/**
 * Node.js用ストレージアダプター
 */
class NodeStorageAdapter implements StorageInterface {
  private nodeStorage: any = null
  private localStorageAdapter: any = null

  constructor() {
    if (isNodeEnvironment) {
      // 動的インポートでNodeStorageServiceを読み込み
      this.initNodeStorage()
    }
  }

  private async initNodeStorage() {
    try {
      const { NodeStorageService } = await import('../services/nodeStorageService')
      this.nodeStorage = NodeStorageService
      this.localStorageAdapter = NodeStorageService.createLocalStorageAdapter()
      await this.localStorageAdapter.init()
    } catch (error) {
      console.error('NodeStorageService の初期化に失敗:', error)
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.localStorageAdapter) {
      this.localStorageAdapter.setItem(key, value)
    } else if (this.nodeStorage) {
      await this.nodeStorage.setItem(key, value)
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.localStorageAdapter) {
      return this.localStorageAdapter.getItem(key)
    } else if (this.nodeStorage) {
      return await this.nodeStorage.getItem(key)
    }
    return null
  }

  async removeItem(key: string): Promise<void> {
    if (this.localStorageAdapter) {
      this.localStorageAdapter.removeItem(key)
    } else if (this.nodeStorage) {
      await this.nodeStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    if (this.localStorageAdapter) {
      this.localStorageAdapter.clear()
    } else if (this.nodeStorage) {
      await this.nodeStorage.clear()
    }
  }

  async keys(): Promise<string[]> {
    if (this.localStorageAdapter) {
      return Array.from({ length: this.localStorageAdapter.length }, (_, i) =>
        this.localStorageAdapter.key(i)
      ).filter((key) => key !== null)
    } else if (this.nodeStorage) {
      return await this.nodeStorage.keys()
    }
    return []
  }

  async length(): Promise<number> {
    if (this.localStorageAdapter) {
      return this.localStorageAdapter.length
    } else if (this.nodeStorage) {
      const keys = await this.nodeStorage.keys()
      return keys.length
    }
    return 0
  }
}

/**
 * 統一ストレージインターフェース
 */
export class StorageAdapter {
  private static instance: StorageInterface | null = null

  /**
   * ストレージアダプターのインスタンスを取得
   */
  static getInstance(): StorageInterface {
    if (!this.instance) {
      if (isNodeEnvironment()) {
        this.instance = new NodeStorageAdapter()
      } else {
        this.instance = new BrowserStorageAdapter()
      }
    }
    return this.instance
  }

  /**
   * 同期的なアクセスのための統一API
   */
  static setItem(key: string, value: string): void {
    const storage = this.getInstance()
    const result = storage.setItem(key, value)

    // 非同期の場合はPromiseを処理（ただし結果を待機しない）
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`Storage setItem error for key "${key}":`, error)
      })
    }
  }

  /**
   * 非同期アクセス用API
   */
  static async setItemAsync(key: string, value: string): Promise<void> {
    const storage = this.getInstance()
    const result = storage.setItem(key, value)

    if (result instanceof Promise) {
      await result
    }
  }

  /**
   * 同期的な取得（Node.js環境では前回キャッシュされた値を返す）
   */
  static getItem(key: string): string | null {
    const storage = this.getInstance()
    const result = storage.getItem(key)

    if (result instanceof Promise) {
      // Node.js環境では同期的なアクセスが困難なため、警告を出す
      console.warn(
        `Synchronous getItem for key "${key}" in Node.js environment may return stale data. Use getItemAsync instead.`
      )
      return null
    }

    return result
  }

  /**
   * 非同期取得用API
   */
  static async getItemAsync(key: string): Promise<string | null> {
    const storage = this.getInstance()
    const result = storage.getItem(key)

    if (result instanceof Promise) {
      return await result
    }

    return result
  }

  /**
   * 削除
   */
  static removeItem(key: string): void {
    const storage = this.getInstance()
    const result = storage.removeItem(key)

    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`Storage removeItem error for key "${key}":`, error)
      })
    }
  }

  /**
   * 非同期削除用API
   */
  static async removeItemAsync(key: string): Promise<void> {
    const storage = this.getInstance()
    const result = storage.removeItem(key)

    if (result instanceof Promise) {
      await result
    }
  }

  /**
   * 全削除
   */
  static clear(): void {
    const storage = this.getInstance()
    const result = storage.clear()

    if (result instanceof Promise) {
      result.catch((error) => {
        console.error('Storage clear error:', error)
      })
    }
  }

  /**
   * 非同期全削除用API
   */
  static async clearAsync(): Promise<void> {
    const storage = this.getInstance()
    const result = storage.clear()

    if (result instanceof Promise) {
      await result
    }
  }

  /**
   * 実行環境判定
   */
  static isNodeEnvironment(): boolean {
    return isNodeEnvironment()
  }

  /**
   * デバッグ情報取得
   */
  static async getDebugInfo() {
    const storage = this.getInstance()
    const keys = await (storage.keys() instanceof Promise
      ? storage.keys()
      : Promise.resolve(storage.keys()))
    const length = await (storage.length instanceof Promise
      ? storage.length
      : Promise.resolve(storage.length))

    return {
      environment: isNodeEnvironment() ? 'Node.js' : 'Browser',
      keysCount: Array.isArray(keys) ? keys.length : length,
      keys: Array.isArray(keys) ? keys : []
    }
  }
}
