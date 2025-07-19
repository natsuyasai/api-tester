import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import { ApiTab, ApiRequest } from '@/types/types'
export interface YamlExportData {
  version: string
  collections: YamlCollection[]
}

export interface YamlCollection {
  name: string
  description?: string
  requests: YamlRequest[]
}

export interface YamlRequest {
  name: string
  method: string
  url: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  bodyType?: string
  variables?: Record<string, unknown>
  description?: string
}

export class YamlService {
  /**
   * APIタブをYAML形式でエクスポート
   */
  static exportToYaml(tabs: ApiTab[]): string {
    const collections: YamlCollection[] = []

    // タブを単一のコレクションとして扱う
    if (tabs.length > 0) {
      const requests: YamlRequest[] = tabs.map((tab) => this.convertTabToYamlRequest(tab))

      collections.push({
        name: 'API Collection',
        description: `Exported collection with ${tabs.length} requests`,
        requests
      })
    }

    const exportData: YamlExportData = {
      version: '1.0',
      collections
    }

    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    })
  }

  /**
   * YAML形式からAPIタブにインポート
   */
  static importFromYaml(yamlContent: string): ApiTab[] {
    try {
      const data = yaml.load(yamlContent) as YamlExportData

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid YAML format')
      }

      if (!data.collections || !Array.isArray(data.collections)) {
        throw new Error('No collections found in YAML')
      }

      const importedTabs: ApiTab[] = []

      data.collections.forEach((collection) => {
        if (collection.requests && Array.isArray(collection.requests)) {
          collection.requests.forEach((request, index) => {
            const tab = this.convertYamlRequestToTab(request, index)
            importedTabs.push(tab)
          })
        }
      })

      return importedTabs
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`YAML parsing error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * PostmanコレクションからYAMLに変換
   */
  static convertPostmanToYaml(postmanCollection: unknown): string {
    try {
      const collection = postmanCollection as {
        info?: { name?: string; description?: string }
        item?: Array<{
          name?: string
          request?: {
            method?: string
            url?: string | { raw?: string }
            header?: Array<{ key?: string; value?: string }>
            body?: { raw?: string; mode?: string }
          }
        }>
      }

      if (!collection.item || !Array.isArray(collection.item)) {
        throw new Error('Invalid Postman collection format')
      }

      const requests: YamlRequest[] = collection.item.map((item) => {
        const request = item.request || {}
        const url = typeof request.url === 'string' ? request.url : request.url?.raw || ''

        // ヘッダーを変換
        const headers: Record<string, string> = {}
        if (request.header && Array.isArray(request.header)) {
          request.header.forEach((h) => {
            if (h.key && h.value) {
              headers[h.key] = h.value
            }
          })
        }

        return {
          name: item.name || 'Untitled Request',
          method: request.method || 'GET',
          url,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body: request.body?.raw,
          bodyType: request.body?.mode || 'raw'
        }
      })

      const yamlData: YamlExportData = {
        version: '1.0',
        collections: [
          {
            name: collection.info?.name || 'Imported Collection',
            description: collection.info?.description,
            requests
          }
        ]
      }

      return yaml.dump(yamlData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })
    } catch (error) {
      throw new Error(
        `Postman conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * OpenAPI仕様からYAMLに変換
   */
  static convertOpenApiToYaml(openApiSpec: unknown): string {
    try {
      const spec = openApiSpec as {
        info?: { title?: string; description?: string }
        servers?: Array<{ url?: string }>
        paths?: Record<
          string,
          Record<
            string,
            {
              summary?: string
              parameters?: Array<{ name?: string; in?: string }>
              requestBody?: { content?: Record<string, unknown> }
            }
          >
        >
      }

      if (!spec.paths) {
        throw new Error('No paths found in OpenAPI specification')
      }

      const baseUrl = spec.servers?.[0]?.url || ''
      const requests: YamlRequest[] = []

      Object.entries(spec.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, operation]) => {
          const fullUrl = baseUrl + path

          requests.push({
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            method: method.toUpperCase(),
            url: fullUrl,
            description: operation.summary
          })
        })
      })

      const yamlData: YamlExportData = {
        version: '1.0',
        collections: [
          {
            name: spec.info?.title || 'OpenAPI Collection',
            description: spec.info?.description,
            requests
          }
        ]
      }

      return yaml.dump(yamlData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })
    } catch (error) {
      throw new Error(
        `OpenAPI conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private static convertTabToYamlRequest(tab: ApiTab): YamlRequest {
    const request = tab.request

    // ヘッダーを辞書形式に変換
    const headers: Record<string, string> = {}
    request.headers
      .filter((h) => h.enabled && h.key && h.value)
      .forEach((h) => {
        headers[h.key] = h.value
      })

    // パラメータを辞書形式に変換
    const params: Record<string, string> = {}
    request.params
      .filter((p) => p.enabled && p.key && p.value)
      .forEach((p) => {
        params[p.key] = p.value
      })

    const yamlRequest: YamlRequest = {
      name: tab.title || request.name,
      method: request.method,
      url: request.url
    }

    if (Object.keys(headers).length > 0) {
      yamlRequest.headers = headers
    }

    if (Object.keys(params).length > 0) {
      yamlRequest.params = params
    }

    if (request.body) {
      if (request.bodyType === 'json' || request.bodyType === 'graphql') {
        try {
          yamlRequest.body = JSON.parse(request.body)
        } catch {
          yamlRequest.body = request.body
        }
      } else {
        yamlRequest.body = request.body
      }
      yamlRequest.bodyType = request.bodyType
    }

    if (request.variables && Object.keys(request.variables).length > 0) {
      yamlRequest.variables = request.variables
    }

    return yamlRequest
  }

  private static convertYamlRequestToTab(yamlRequest: YamlRequest, index: number): ApiTab {
    // ヘッダーを配列形式に変換
    const headers = yamlRequest.headers
      ? Object.entries(yamlRequest.headers).map(([key, value]) => ({
          key,
          value,
          enabled: true
        }))
      : []

    // 空の行を追加
    headers.push({ key: '', value: '', enabled: true })

    // パラメータを配列形式に変換
    const params = yamlRequest.params
      ? Object.entries(yamlRequest.params).map(([key, value]) => ({
          key,
          value,
          enabled: true
        }))
      : []

    // 空の行を追加
    params.push({ key: '', value: '', enabled: true })

    // ボディを文字列に変換
    let body = ''
    if (yamlRequest.body !== undefined) {
      if (typeof yamlRequest.body === 'object') {
        body = JSON.stringify(yamlRequest.body, null, 2)
      } else {
        body = String(yamlRequest.body)
      }
    }

    const request: ApiRequest = {
      id: uuidv4(),
      name: yamlRequest.name || `Request ${index + 1}`,
      url: yamlRequest.url || '',
      method: (yamlRequest.method as any) || 'GET',
      headers,
      params,
      body,
      bodyType: (yamlRequest.bodyType as any) || 'json',
      type: yamlRequest.bodyType === 'graphql' ? 'graphql' : 'rest',
      variables: yamlRequest.variables || {}
    }

    return {
      id: uuidv4(),
      title: yamlRequest.name || `Request ${index + 1}`,
      request,
      response: null,
      isActive: false
    }
  }
}
