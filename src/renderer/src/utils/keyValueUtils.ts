import { KeyValuePair } from '@/types/types'

/**
 * KeyValuePair操作の共通ユーティリティ
 * headers、params、formData等の操作を統一
 */
export class KeyValuePairOperations {
  /**
   * 新しいキーバリューペアを追加
   */
  static add<T extends KeyValuePair>(items: T[]): T[] {
    return [...items, { key: '', value: '', enabled: false } as T]
  }

  /**
   * 指定インデックスのキーバリューペアを更新
   */
  static update<T extends KeyValuePair>(
    items: T[],
    index: number,
    update: Partial<T>
  ): T[] {
    if (index < 0 || index >= items.length) {
      return items
    }
    return items.map((item, i) => (i === index ? { ...item, ...update } : item))
  }

  /**
   * 指定インデックスのキーバリューペアを削除
   */
  static remove<T extends KeyValuePair>(items: T[], index: number): T[] {
    if (index < 0 || index >= items.length) {
      return items
    }
    return items.filter((_, i) => i !== index)
  }

  /**
   * 空のキーを持つペアを除去
   */
  static removeEmptyKeys<T extends KeyValuePair>(items: T[]): T[] {
    return items.filter((item) => item.key.trim() !== '')
  }

  /**
   * 有効なペアのみを取得
   */
  static getEnabled<T extends KeyValuePair>(items: T[]): T[] {
    return items.filter((item) => item.enabled && item.key.trim() !== '')
  }

  /**
   * キーバリューペアをオブジェクトに変換
   */
  static toObject<T extends KeyValuePair>(items: T[]): Record<string, string> {
    const result: Record<string, string> = {}
    this.getEnabled(items).forEach((item) => {
      if (item.key.trim()) {
        result[item.key] = item.value
      }
    })
    return result
  }

  /**
   * オブジェクトからキーバリューペアに変換
   */
  static fromObject<T extends KeyValuePair>(obj: Record<string, string>): T[] {
    return Object.entries(obj).map(
      ([key, value]) =>
        ({
          key,
          value,
          enabled: true
        }) as T
    )
  }

  /**
   * 重複するキーを検証
   */
  static validateDuplicateKeys<T extends KeyValuePair>(items: T[]): string[] {
    const keys = new Set<string>()
    const duplicates: string[] = []

    items
      .filter((item) => item.enabled && item.key.trim() !== '')
      .forEach((item) => {
        const key = item.key.trim()
        if (keys.has(key)) {
          if (!duplicates.includes(key)) {
            duplicates.push(key)
          }
        } else {
          keys.add(key)
        }
      })

    return duplicates
  }

  /**
   * 特定のキーを検索
   */
  static findByKey<T extends KeyValuePair>(items: T[], key: string): T | undefined {
    return items.find((item) => item.key === key)
  }

  /**
   * 特定のキーのインデックスを取得
   */
  static findIndexByKey<T extends KeyValuePair>(items: T[], key: string): number {
    return items.findIndex((item) => item.key === key)
  }
}

/**
 * KeyValuePairの検証ユーティリティ
 */
export class KeyValueValidator {
  /**
   * ヘッダー名の検証
   */
  static validateHeaderKey(key: string): { valid: boolean; error?: string } {
    if (!key.trim()) {
      return { valid: true } // 空のキーは許可（削除対象）
    }

    // HTTP仕様に基づく検証
    const invalidChars = /[\s\(\)<>@,;:\\"\/\[\]?={}]/
    if (invalidChars.test(key)) {
      return {
        valid: false,
        error: 'ヘッダー名に無効な文字が含まれています'
      }
    }

    return { valid: true }
  }

  /**
   * URL パラメータキーの検証
   */
  static validateParamKey(key: string): { valid: boolean; error?: string } {
    if (!key.trim()) {
      return { valid: true } // 空のキーは許可
    }

    // URL エンコードが必要な文字の検証
    const needsEncoding = /[^a-zA-Z0-9\-_.~]/
    if (needsEncoding.test(key)) {
      return {
        valid: true,
        error: '特殊文字が含まれています（自動エンコードされます）'
      }
    }

    return { valid: true }
  }
}