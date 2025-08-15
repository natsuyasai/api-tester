import { ApiResponse } from '@/types/types'
import { isPreviewableProperty } from './responseUtils'

export interface PropertyInfo {
  path: string
  value: unknown
  type: string
}

export interface PreviewContent {
  content: string
  type: 'html' | 'xml' | 'image' | 'audio' | 'video' | 'document' | 'text'
}

// 利用可能なプロパティを抽出する関数
export const getAvailableProperties = (response: ApiResponse): PropertyInfo[] => {
  const properties: PropertyInfo[] = []

  const extractProperties = (obj: unknown, path: string = '', maxDepth: number = 3): void => {
    if (maxDepth <= 0) return

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key
        const valueType = Array.isArray(value) ? 'array' : typeof value

        properties.push({
          path: currentPath,
          value,
          type: valueType
        })

        if (typeof value === 'object' && value !== null) {
          extractProperties(value, currentPath, maxDepth - 1)
        }
      })
    }
  }

  // レスポンス全体
  properties.push({ path: 'data', value: response.data, type: typeof response.data })

  // レスポンスデータの中身を探索
  if (response.data && typeof response.data === 'object') {
    extractProperties(response.data, 'data')
  }

  return properties
}

// プロパティ値を取得する関数
export const getPropertyValue = (response: ApiResponse, path: string): unknown => {
  if (path === 'data') {
    return response.data
  }

  const pathParts = path.split('.')
  let current: unknown = response

  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return null
    }
  }

  return current
}

// プレビュー可能なプロパティがあるかチェックする関数
export const hasPreviewableProperties = (
  response: ApiResponse,
  isHtmlResponse: () => boolean,
  isXmlResponse: () => boolean,
  isImageResponse: () => boolean
): boolean => {
  const properties = getAvailableProperties(response)
  return (
    properties.some((prop) => isPreviewableProperty(prop.value)) ||
    isHtmlResponse() ||
    isXmlResponse() ||
    isImageResponse()
  )
}

// プレビューコンテンツを取得する関数
export const getPreviewContent = (
  response: ApiResponse,
  selectedProperty: string,
  isHtmlResponse: () => boolean,
  isXmlResponse: () => boolean,
  isImageResponse: () => boolean
): PreviewContent => {
  const previewValue = getPropertyValue(response, selectedProperty)

  // バイナリデータオブジェクトの処理
  if (
    previewValue &&
    typeof previewValue === 'object' &&
    'type' in previewValue &&
    previewValue.type === 'binary'
  ) {
    const binaryData = previewValue as {
      type: string
      subType: string
      dataUrl?: string
      isPreviewable: boolean
      contentType: string
    }

    if (binaryData.isPreviewable && binaryData.dataUrl) {
      switch (binaryData.subType) {
        case 'image':
          return { content: binaryData.dataUrl, type: 'image' }
        case 'audio':
          return { content: binaryData.dataUrl, type: 'audio' }
        case 'video':
          return { content: binaryData.dataUrl, type: 'video' }
        case 'document':
          return { content: binaryData.dataUrl, type: 'document' }
        default:
          return { content: `Binary data (${binaryData.contentType})`, type: 'text' }
      }
    }
  }

  if (typeof previewValue === 'string') {
    const str = previewValue.trim()

    if (str.startsWith('data:image/')) {
      return { content: str, type: 'image' }
    } else if (str.startsWith('<') && (str.includes('<html') || str.includes('<HTML'))) {
      return { content: str, type: 'html' }
    } else if (str.startsWith('<') && (str.includes('<?xml') || str.includes('<svg'))) {
      return { content: str, type: 'xml' }
    }
  }

  // フォールバック: レスポンスヘッダーベースの判定
  if (selectedProperty === 'data') {
    if (isHtmlResponse()) {
      return { content: String(previewValue), type: 'html' }
    } else if (isXmlResponse()) {
      return { content: String(previewValue), type: 'xml' }
    } else if (isImageResponse()) {
      return { content: String(previewValue), type: 'image' }
    }
  }

  return {
    content:
      typeof previewValue === 'string' ? previewValue : JSON.stringify(previewValue, null, 2),
    type: 'text'
  }
}
