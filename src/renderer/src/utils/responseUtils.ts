// レスポンス関連のユーティリティ関数

// レスポンス時間フォーマット関数
export const formatResponseTime = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`
  }
  return `${(duration / 1000).toFixed(2)}s`
}

// レスポンスサイズフォーマット関数
export const formatResponseSize = (data: unknown): string => {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data)
  const sizeInBytes = new Blob([dataString]).size

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

// JSON フォーマット関数
export const formatJson = (data: unknown): string => {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// ステータスカラー取得関数
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'error'
  return 'default'
}

// Content-Type チェック関数
export const getContentType = (headers: Record<string, string>): string => {
  return headers['content-type'] || headers['Content-Type'] || ''
}

export const isHtmlResponse = (headers: Record<string, string>): boolean => {
  const contentType = getContentType(headers)
  return contentType.toLowerCase().includes('text/html')
}

export const isXmlResponse = (headers: Record<string, string>): boolean => {
  const contentType = getContentType(headers)
  return (
    contentType.toLowerCase().includes('xml') ||
    contentType.toLowerCase().includes('application/xml')
  )
}

export const isImageResponse = (headers: Record<string, string>): boolean => {
  const contentType = getContentType(headers)
  return contentType.toLowerCase().startsWith('image/')
}

// ファイル拡張子取得関数
export const getFileExtension = (contentType: string): string => {
  if (contentType.includes('json')) {
    return 'json'
  } else if (contentType.includes('html')) {
    return 'html'
  } else if (contentType.includes('xml')) {
    return 'xml'
  } else if (contentType.includes('csv')) {
    return 'csv'
  } else if (contentType.startsWith('image/')) {
    return contentType.split('/')[1] || 'jpg'
  }
  return 'txt'
}

// プレビュー可能プロパティ判定関数
export const isPreviewableProperty = (value: unknown): boolean => {
  if (typeof value === 'string') {
    // HTMLかXMLの内容かチェック
    const str = value.trim()
    return (
      (str.startsWith('<') &&
        (str.includes('<html') || str.includes('<?xml') || str.includes('<svg'))) ||
      str.startsWith('data:image/') ||
      str.length > 50 // 長いテキストもプレビュー対象とする
    )
  }

  // バイナリデータオブジェクトのチェック
  if (value && typeof value === 'object' && 'type' in value && value.type === 'binary') {
    const binaryData = value as { type: string; isPreviewable?: boolean }
    return binaryData.isPreviewable === true
  }

  return false
}

// レスポンスデータの分離関数
export interface SeparatedResponseData {
  actualData: unknown
  metadata: Record<string, unknown>
  isBinary: boolean
  isError: boolean
}

export const separateResponseData = (data: unknown): SeparatedResponseData => {
  // エラーレスポンスの場合
  if (data && typeof data === 'object' && 'type' in data && data.type === 'error') {
    const errorData = data as Record<string, unknown>
    return {
      actualData: errorData.error || 'Unknown error',
      metadata: {
        type: errorData.type,
        timestamp: errorData.timestamp
      },
      isBinary: false,
      isError: true
    }
  }

  // バイナリデータの場合
  if (data && typeof data === 'object' && 'type' in data && data.type === 'binary') {
    const binaryData = data as Record<string, unknown>
    const metadata: Record<string, unknown> = {}

    // メタデータプロパティを抽出
    const metadataKeys = [
      'type',
      'subType',
      'size',
      'contentType',
      'isPreviewable',
      'dataUrl',
      'originalBlob',
      'error',
      'notice'
    ]

    metadataKeys.forEach((key) => {
      if (key in binaryData) {
        metadata[key] = binaryData[key]
      }
    })

    return {
      actualData: binaryData.data,
      metadata,
      isBinary: true,
      isError: false
    }
  }

  // 通常のデータの場合
  return {
    actualData: data,
    metadata: {},
    isBinary: false,
    isError: false
  }
}

// メタデータの表示用フォーマット関数
export const formatMetadata = (metadata: Record<string, unknown>): string => {
  const formatted = Object.entries(metadata)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // 特定のプロパティは非表示
      if (key === 'originalBlob' || key === 'dataUrl') {
        return null
      }

      // サイズは人間が読みやすい形式に
      if (key === 'size' && typeof value === 'number') {
        return `${key}: ${formatBinarySize(value)}`
      }

      // その他のプロパティは文字列として表示
      return `${key}: ${String(value)}`
    })
    .filter(Boolean)
    .join('\n')

  return formatted
}

// バイナリサイズフォーマット関数
export const formatBinarySize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}
