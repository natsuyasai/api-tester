/**
 * メモリ管理とデータ効率化ユーティリティ
 */

/**
 * WeakMapベースのキャッシュ
 */
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>()

  get(key: K): V | undefined {
    return this.cache.get(key)
  }

  set(key: K, value: V): void {
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }
}

/**
 * TTL付きキャッシュ
 */
export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>()
  private defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5分
    this.defaultTTL = defaultTTL
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key)
    
    if (!item) {
      return undefined
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return item.value
  }

  set(key: K, value: V, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL)
    this.cache.set(key, { value, expiry })
  }

  has(key: K): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }
}

/**
 * LRU (Least Recently Used) キャッシュ
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    
    if (value !== undefined) {
      // アクセス順を更新（削除して再追加）
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 最古のエントリを削除
      const firstKey = this.cache.keys().next().value as K
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * オブジェクトプール
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn?: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    maxSize: number = 50
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  acquire(): T {
    const obj = this.pool.pop()
    return obj || this.createFn()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj)
      }
      this.pool.push(obj)
    }
  }

  size(): number {
    return this.pool.length
  }

  clear(): void {
    this.pool.length = 0
  }
}

/**
 * メモリ使用量を監視
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private observers: ((info: MemoryInfo) => void)[] = []
  private intervalId?: NodeJS.Timeout

  static getInstance(): MemoryMonitor {
    if (!this.instance) {
      this.instance = new MemoryMonitor()
    }
    return this.instance
  }

  startMonitoring(interval: number = 30000): void { // 30秒間隔
    if (this.intervalId) {
      return
    }

    this.intervalId = setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory as MemoryInfo
        this.observers.forEach(observer => observer(memInfo))
      }
    }, interval)
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  addObserver(observer: (info: MemoryInfo) => void): () => void {
    this.observers.push(observer)
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  getCurrentMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      return (performance as any).memory as MemoryInfo
    }
    return null
  }
}

/**
 * 大きなオブジェクトの遅延読み込み
 */
export class LazyLoader<T> {
  private loaded = false
  private data?: T
  private loader: () => Promise<T> | T

  constructor(loader: () => Promise<T> | T) {
    this.loader = loader
  }

  async load(): Promise<T> {
    if (!this.loaded) {
      this.data = await this.loader()
      this.loaded = true
    }
    return this.data!
  }

  isLoaded(): boolean {
    return this.loaded
  }

  unload(): void {
    this.data = undefined
    this.loaded = false
  }

  getData(): T | undefined {
    return this.data
  }
}

/**
 * バイナリデータの効率的なハンドリング
 */
export class BinaryDataManager {
  private static chunks = new Map<string, ArrayBuffer>()
  private static metadata = new Map<string, {
    size: number
    type: string
    lastAccess: number
  }>()

  static store(id: string, data: ArrayBuffer, type: string): void {
    this.chunks.set(id, data)
    this.metadata.set(id, {
      size: data.byteLength,
      type,
      lastAccess: Date.now()
    })
  }

  static retrieve(id: string): ArrayBuffer | undefined {
    const data = this.chunks.get(id)
    if (data) {
      const meta = this.metadata.get(id)
      if (meta) {
        meta.lastAccess = Date.now()
      }
    }
    return data
  }

  static remove(id: string): boolean {
    const hasChunk = this.chunks.delete(id)
    const hasMeta = this.metadata.delete(id)
    return hasChunk && hasMeta
  }

  static cleanup(maxAge: number = 60 * 60 * 1000): void { // 1時間
    const now = Date.now()
    
    for (const [id, meta] of this.metadata.entries()) {
      if (now - meta.lastAccess > maxAge) {
        this.chunks.delete(id)
        this.metadata.delete(id)
      }
    }
  }

  static getTotalSize(): number {
    let total = 0
    for (const meta of this.metadata.values()) {
      total += meta.size
    }
    return total
  }

  static getStats() {
    const stats = {
      totalChunks: this.chunks.size,
      totalSize: this.getTotalSize(),
      typeBreakdown: new Map<string, { count: number; size: number }>()
    }

    for (const meta of this.metadata.values()) {
      const existing = stats.typeBreakdown.get(meta.type) || { count: 0, size: 0 }
      stats.typeBreakdown.set(meta.type, {
        count: existing.count + 1,
        size: existing.size + meta.size
      })
    }

    return stats
  }
}

/**
 * 文字列の効率的な操作
 */
export class StringPool {
  private static pool = new Map<string, string>()

  static intern(str: string): string {
    const existing = this.pool.get(str)
    if (existing) {
      return existing
    }
    
    this.pool.set(str, str)
    return str
  }

  static size(): number {
    return this.pool.size
  }

  static clear(): void {
    this.pool.clear()
  }
}

/**
 * メモリリークの検出
 */
export class LeakDetector {
  private static trackedObjects = new WeakSet()
  private static objectCounts = new Map<string, number>()

  static track<T extends object>(obj: T, type: string): T {
    this.trackedObjects.add(obj)
    const current = this.objectCounts.get(type) || 0
    this.objectCounts.set(type, current + 1)
    return obj
  }

  static getReport() {
    return new Map(this.objectCounts)
  }

  static reset(): void {
    this.objectCounts.clear()
  }
}

// TypeScript型定義
interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}