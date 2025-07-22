import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

/**
 * パフォーマンス最適化ユーティリティ
 */

/**
 * 値の変更をデバウンス
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 関数の実行をスロットル
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        if (Date.now() - lastRun.current >= delay) {
          callback(...args)
          lastRun.current = Date.now()
        }
      }) as T,
    [callback, delay]
  )
}

/**
 * 前回の値と比較して変更があったときのみ実行
 */
export function useShallowMemo<T>(value: T): T {
  const ref = useRef<T>(value)

  const isEqual = useMemo(() => {
    if (value === ref.current) return true

    if (
      typeof value !== 'object' ||
      value === null ||
      typeof ref.current !== 'object' ||
      ref.current === null
    ) {
      return false
    }

    const keys1 = Object.keys(value)
    const keys2 = Object.keys(ref.current)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      if (
        (value as Record<string, unknown>)[key] !== (ref.current as Record<string, unknown>)[key]
      ) {
        return false
      }
    }

    return true
  }, [value])

  if (!isEqual) {
    ref.current = value
  }

  return ref.current
}

/**
 * メモリ効率的なリストフィルタリング
 */
export function useOptimizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  dependencies: unknown[] = []
): T[] {
  return useMemo(() => {
    return items.filter(filterFn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterFn, ...dependencies])
}

/**
 * 大量データの仮想化表示用
 */
export interface VirtualizedListProps {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualizedList<T>(
  items: T[],
  { itemHeight, containerHeight, overscan = 5 }: VirtualizedListProps
) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [items, startIndex, endIndex, itemHeight])

  const totalHeight = items.length * itemHeight

  return {
    visibleItems,
    totalHeight,
    setScrollTop,
    startIndex,
    endIndex
  }
}

/**
 * メモリリークを防ぐためのクリーンアップ
 */
export function useCleanup(cleanup: () => void): void {
  useEffect(() => {
    return cleanup
  }, [cleanup])
}

/**
 * 重い計算のメモ化
 */
export function useComputedValue<T>(computeFn: () => T, dependencies: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(computeFn, dependencies)
}

/**
 * 状態変更の最適化
 */
export function useOptimizedState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue)

  const optimizedSetState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value

      // 値が変更されていない場合は更新しない
      if (Object.is(prev, nextValue)) {
        return prev
      }

      return nextValue
    })
  }, [])

  return [state, optimizedSetState]
}

/**
 * 非同期処理の重複実行防止
 */
export function useAsyncOperation<T extends unknown[], R>(
  asyncFn: (...args: T) => Promise<R>
): {
  execute: (...args: T) => Promise<R>
  isLoading: boolean
  error: Error | null
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const runningRef = useRef<Promise<R> | null>(null)

  const execute = useCallback(
    async (...args: T): Promise<R> => {
      if (runningRef.current) {
        return runningRef.current
      }

      setIsLoading(true)
      setError(null)

      const promise = asyncFn(...args)
      runningRef.current = promise

      try {
        const result = await promise
        return result
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        throw err
      } finally {
        setIsLoading(false)
        runningRef.current = null
      }
    },
    [asyncFn]
  )

  return { execute, isLoading, error }
}

/**
 * キャッシュ機能付きの値取得
 */
export function useCachedValue<T>(
  key: string,
  fetchFn: () => T | Promise<T>,
  dependencies: unknown[] = [],
  ttl: number = 5 * 60 * 1000 // 5分
): T | null {
  const [value, setValue] = useState<T | null>(null)
  const cacheRef = useRef<Map<string, { value: T; timestamp: number }>>(new Map())

  useEffect(() => {
    const cache = cacheRef.current
    const cached = cache.get(key)

    // キャッシュが有効な場合
    if (cached && Date.now() - cached.timestamp < ttl) {
      setValue(cached.value)
      return
    }

    // 新しい値を取得
    const result = fetchFn()

    if (result instanceof Promise) {
      void result
        .then((resolvedValue) => {
          cache.set(key, { value: resolvedValue, timestamp: Date.now() })
          setValue(resolvedValue)
        })
        .catch((error) => {
          console.error('Failed to fetch cached value:', error)
        })
    } else {
      cache.set(key, { value: result, timestamp: Date.now() })
      setValue(result)
    }
  }, [key, fetchFn, ttl, ...dependencies])

  return value
}

/**
 * オブジェクトの深い等価比較
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return a === b
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (const key of keysA) {
    if (!keysB.includes(key)) return false

    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false
    }
  }

  return true
}

/**
 * 配列の効率的な更新
 */
export function updateArrayItem<T>(
  array: T[],
  index: number,
  update: Partial<T> | ((item: T) => T)
): T[] {
  if (index < 0 || index >= array.length) {
    return array
  }

  const newArray = [...array]
  const oldItem = array[index]
  const newItem = typeof update === 'function' ? update(oldItem) : { ...oldItem, ...update }

  // 値が変更されていない場合は元の配列を返す
  if (deepEqual(oldItem, newItem)) {
    return array
  }

  newArray[index] = newItem
  return newArray
}
