import { ApiRequest, ApiResponse } from '@/types/types'

// HTTPリクエストフォーマット関数
export const formatHttpRequest = (request: ApiRequest): string => {
  const url = new URL(request.url)

  // リクエストパラメータを追加
  const enabledParams = request.params.filter((param) => param.enabled && param.key)
  enabledParams.forEach((param) => {
    url.searchParams.set(param.key, param.value)
  })

  // API Key認証でクエリパラメータに追加する場合
  if (request.auth?.type === 'api-key' && request.auth.apiKey?.location === 'query') {
    url.searchParams.set(request.auth.apiKey.key, request.auth.apiKey.value)
  }

  // リクエストライン
  let raw = `${request.method} ${url.pathname}${url.search} HTTP/1.1\n`
  raw += `Host: ${url.host}\n`

  // ヘッダー
  const enabledHeaders = request.headers.filter((h) => h.enabled && h.key)
  enabledHeaders.forEach((header) => {
    raw += `${header.key}: ${header.value}\n`
  })

  // 認証ヘッダー
  if (request.auth) {
    switch (request.auth.type) {
      case 'basic':
        if (request.auth.basic) {
          const credentials = btoa(`${request.auth.basic.username}:${request.auth.basic.password}`)
          raw += `Authorization: Basic ${credentials}\n`
        }
        break
      case 'bearer':
        if (request.auth.bearer) {
          raw += `Authorization: Bearer ${request.auth.bearer.token}\n`
        }
        break
      case 'api-key':
        if (request.auth.apiKey && request.auth.apiKey.location === 'header') {
          raw += `${request.auth.apiKey.key}: ${request.auth.apiKey.value}\n`
        }
        break
    }
  }

  // User-Agent（設定されている場合）
  if (
    request.settings?.userAgent &&
    !enabledHeaders.some((h) => h.key.toLowerCase() === 'user-agent')
  ) {
    raw += `User-Agent: ${request.settings.userAgent}\n`
  }

  // Content-Type（ボディがある場合）
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
    if (!enabledHeaders.some((h) => h.key.toLowerCase() === 'content-type')) {
      switch (request.bodyType) {
        case 'json':
        case 'graphql':
          raw += 'Content-Type: application/json\n'
          break
        case 'x-www-form-urlencoded':
          raw += 'Content-Type: application/x-www-form-urlencoded\n'
          break
        case 'form-data':
          raw += 'Content-Type: multipart/form-data\n'
          break
        default:
          raw += 'Content-Type: text/plain\n'
      }
    }
  }

  raw += '\n'

  // ボディ
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (request.bodyType === 'form-data') {
      const enabledPairs =
        request.bodyKeyValuePairs?.filter((pair) => pair.enabled && pair.key.trim()) || []
      if (enabledPairs.length > 0) {
        raw += '[Form Data]\n'
        enabledPairs.forEach((pair) => {
          if (pair.isFile) {
            raw += `${pair.key}: [File: ${pair.fileName || 'unknown'}]\n`
          } else {
            raw += `${pair.key}: ${pair.value}\n`
          }
        })
      }
    } else if (request.body) {
      if (request.bodyType === 'graphql') {
        const graphqlPayload = {
          query: request.body,
          variables: request.variables || {},
          operationName: null
        }
        raw += JSON.stringify(graphqlPayload, null, 2)
      } else {
        raw += request.body
      }
    }
  }

  return raw
}

// HTTPレスポンスフォーマット関数
export const formatHttpResponse = (response: ApiResponse): string => {
  // ステータスライン
  let raw = `HTTP/1.1 ${response.status} ${response.statusText}\n`

  // レスポンスヘッダー
  Object.entries(response.headers).forEach(([key, value]) => {
    raw += `${key}: ${value}\n`
  })

  raw += '\n'

  // レスポンスボディ
  if (response.data) {
    if (response.data.type === 'text') {
      raw += response.data.data
    } else if (response.data.type === 'json') {
      raw += response.data.raw || JSON.stringify(response.data.data, null, 2)
    } else if (response.data.type === 'binary') {
      const binaryData = response.data
      raw += `[Binary Data: ${binaryData.contentType}, Size: ${binaryData.size || 0} bytes]`
    } else if (response.data.type === 'error') {
      raw += `[Error: ${response.data.error}]`
    } else {
      raw += JSON.stringify(response.data, null, 2)
    }
  }

  return raw
}

// Raw コンテンツ生成関数
export const generateRawContent = (request: ApiRequest, response: ApiResponse): string => {
  const requestRaw = formatHttpRequest(request)
  const responseRaw = formatHttpResponse(response)

  return `=== REQUEST ===\n${requestRaw}\n\n=== RESPONSE ===\n${responseRaw}`
}
