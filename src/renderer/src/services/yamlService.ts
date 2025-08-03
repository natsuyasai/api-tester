import yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'
import { ApiTab, ApiRequest, Collection, AuthType, ApiKeyLocation, FileEncoding } from '@/types/types'
import { useEnvironmentStore } from '@renderer/stores/environmentStore'
import { useGlobalVariablesStore } from '@renderer/stores/globalVariablesStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { KeyValuePairOperations } from '@renderer/utils/keyValueUtils'
export interface YamlExportData {
  version: string
  collections: YamlCollection[]
}

export interface YamlCollection {
  id?: string
  name: string
  description?: string
  parentId?: string
  requests: YamlRequest[]
  children?: YamlCollection[]
  tabs?: string[]
  activeTabId?: string
  created?: string
  updated?: string
}

export interface YamlRequest {
  name: string
  method: string
  url: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: unknown
  bodyType?: string
  bodyKeyValuePairs?: Array<{
    key: string
    value: string
    enabled: boolean
    isFile?: boolean
    fileName?: string
    fileContent?: string
    fileEncoding?: FileEncoding
  }>
  variables?: Record<string, unknown>
  auth?: {
    type: AuthType
    basic?: {
      username: string
      password: string
    }
    bearer?: {
      token: string
    }
    apiKey?: {
      key: string
      value: string
      location: ApiKeyLocation
    }
  }
  settings?: {
    timeout: number
    followRedirects: boolean
    maxRedirects: number
    validateSSL: boolean
    userAgent?: string
  }
  postScript?: string
  type?: string
  description?: string
}

export class YamlService {
  /**
   * コレクション（フォルダ）とAPIタブをYAML形式でエクスポート（フォルダ構成対応）
   */
  static exportCollectionsToYaml(collections: Collection[], tabs: ApiTab[]): string {
    const yamlCollections: YamlCollection[] = collections.map((collection) =>
      this.convertCollectionToYaml(collection, tabs)
    )

    const exportData: YamlExportData = {
      version: '2.0', // フォルダ構成対応版
      collections: yamlCollections
    }

    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    })
  }

  /**
   * APIタブをYAML形式でエクスポート（レガシー互換性）
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
   * 変数展開済みのAPIタブをYAML形式でエクスポート
   */
  static exportToYamlWithVariables(tabs: ApiTab[]): string {
    const resolvedTabs = this.resolveTabsVariables(tabs)
    return this.exportToYaml(resolvedTabs)
  }

  /**
   * 変数展開済みのコレクションとAPIタブをYAML形式でエクスポート
   */
  static exportCollectionsToYamlWithVariables(collections: Collection[], tabs: ApiTab[]): string {
    const resolvedTabs = this.resolveTabsVariables(tabs)
    return this.exportCollectionsToYaml(collections, resolvedTabs)
  }

  /**
   * タブの変数を展開する
   */
  private static resolveTabsVariables(tabs: ApiTab[]): ApiTab[] {
    // 変数解決関数を作成
    const variableResolver = this.createVariableResolver()
    
    return tabs.map((tab) => ({
      ...tab,
      request: this.resolveRequestVariables(tab.request, variableResolver)
    }))
  }

  /**
   * 変数解決関数を作成
   */
  private static createVariableResolver(): (text: string) => string {
    // グローバル変数を取得
    const globalVariables = useGlobalVariablesStore.getState().variables
    // 環境変数を取得
    const environmentStore = useEnvironmentStore.getState()
    const activeEnvironment = environmentStore.environments.find(
      env => env.id === environmentStore.activeEnvironmentId
    )
    const environmentVariables = activeEnvironment?.variables || []
    // セッション変数を取得
    const sessionVariables = useSessionStore.getState().sharedVariables || []

    return (text: string): string => {
      let resolved = text

      // セッション変数を解決
      sessionVariables.forEach((variable) => {
        if (variable.enabled) {
          const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g')
          resolved = resolved.replace(regex, variable.value)
        }
      })

      // 環境変数を解決
      environmentVariables.forEach((variable) => {
        if (variable.enabled) {
          const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g')
          resolved = resolved.replace(regex, variable.value)
        }
      })

      // グローバル変数を解決
      globalVariables.forEach((variable) => {
        if (variable.enabled) {
          const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g')
          resolved = resolved.replace(regex, variable.value)
        }
      })

      return resolved
    }
  }

  /**
   * リクエストの変数を展開する
   */
  private static resolveRequestVariables(request: ApiRequest, resolver: (text: string) => string): ApiRequest {
    return {
      ...request,
      url: resolver(request.url),
      headers: request.headers.map(header => ({
        ...header,
        key: resolver(header.key),
        value: resolver(header.value)
      })),
      params: request.params.map(param => ({
        ...param,
        key: resolver(param.key),
        value: resolver(param.value)
      })),
      body: resolver(request.body),
      bodyKeyValuePairs: request.bodyKeyValuePairs?.map(pair => ({
        ...pair,
        key: resolver(pair.key),
        value: resolver(pair.value),
        fileName: pair.fileName ? resolver(pair.fileName) : pair.fileName
      })),
      auth: request.auth ? {
        ...request.auth,
        bearer: request.auth.bearer ? {
          token: resolver(request.auth.bearer.token)
        } : request.auth.bearer,
        apiKey: request.auth.apiKey ? {
          ...request.auth.apiKey,
          key: resolver(request.auth.apiKey.key),
          value: resolver(request.auth.apiKey.value)
        } : request.auth.apiKey
      } : request.auth,
      postScript: request.postScript ? resolver(request.postScript) : request.postScript
    }
  }

  /**
   * YAML形式からコレクションとAPIタブにインポート（フォルダ構成対応）
   */
  static importCollectionsFromYaml(yamlContent: string): {
    collections: Collection[]
    tabs: ApiTab[]
  } {
    try {
      const data = yaml.load(yamlContent) as YamlExportData

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid YAML format')
      }

      if (!data.collections || !Array.isArray(data.collections)) {
        throw new Error('No collections found in YAML')
      }

      const importedCollections: Collection[] = []
      const importedTabs: ApiTab[] = []

      // v2.0形式（フォルダ構成対応）の処理
      if (data.version === '2.0') {
        data.collections.forEach((yamlCollection) => {
          const { collection, tabs } = this.convertYamlToCollectionAndTabs(yamlCollection)
          importedCollections.push(collection)
          importedTabs.push(...tabs)
        })
      } else {
        // v1.0形式（レガシー）のフォールバック処理
        const legacyTabs = this.importFromYaml(yamlContent)
        importedTabs.push(...legacyTabs)

        // デフォルトコレクションを作成
        if (legacyTabs.length > 0) {
          const defaultCollection: Collection = {
            id: uuidv4(),
            name: 'インポートされたコレクション',
            description: `${legacyTabs.length}個のリクエストをインポート`,
            children: [],
            requests: [],
            tabs: legacyTabs.map((tab) => tab.id),
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
          importedCollections.push(defaultCollection)

          // タブのcollectionIdを設定
          legacyTabs.forEach((tab) => {
            tab.collectionId = defaultCollection.id
          })
        }
      }

      return { collections: importedCollections, tabs: importedTabs }
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`YAML parsing error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * YAML形式からAPIタブにインポート（レガシー互換性）
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
      url: request.url,
      type: request.type
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

    // BodyKeyValuePairsを追加
    if (request.bodyKeyValuePairs && request.bodyKeyValuePairs.length > 0) {
      const enabledPairs = request.bodyKeyValuePairs.filter((pair) => pair.enabled && pair.key)
      if (enabledPairs.length > 0) {
        yamlRequest.bodyKeyValuePairs = enabledPairs.map(pair => ({
          key: pair.key,
          value: pair.value,
          enabled: pair.enabled,
          isFile: pair.isFile,
          fileName: pair.fileName,
          fileContent: pair.fileContent,
          fileEncoding: pair.fileEncoding
        }))
      }
    }

    if (request.variables && Object.keys(request.variables).length > 0) {
      yamlRequest.variables = request.variables
    }

    // 認証情報を追加
    if (request.auth && request.auth.type !== 'none') {
      yamlRequest.auth = {
        type: request.auth.type,
        basic: request.auth.basic,
        bearer: request.auth.bearer,
        apiKey: request.auth.apiKey
      }
    }

    // 設定情報を追加
    if (request.settings) {
      yamlRequest.settings = {
        timeout: request.settings.timeout,
        followRedirects: request.settings.followRedirects,
        maxRedirects: request.settings.maxRedirects,
        validateSSL: request.settings.validateSSL,
        userAgent: request.settings.userAgent
      }
    }

    // PostScriptを追加
    if (request.postScript) {
      yamlRequest.postScript = request.postScript
    }

    return yamlRequest
  }

  private static convertCollectionToYaml(collection: Collection, tabs: ApiTab[]): YamlCollection {
    // このコレクションに属するタブを取得
    const collectionTabs = tabs.filter((tab) => tab.collectionId === collection.id)

    const yamlCollection: YamlCollection = {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      parentId: collection.parentId,
      requests: collectionTabs.map((tab) => this.convertTabToYamlRequest(tab)),
      tabs: collection.tabs,
      activeTabId: collection.activeTabId,
      created: collection.created,
      updated: collection.updated
    }

    return yamlCollection
  }

  private static convertYamlToCollectionAndTabs(yamlCollection: YamlCollection): {
    collection: Collection
    tabs: ApiTab[]
  } {
    const collectionId = yamlCollection.id || uuidv4()

    // YAMLリクエストをタブに変換
    const tabs = yamlCollection.requests.map((yamlRequest, index) => {
      const tab = this.convertYamlRequestToTab(yamlRequest, index)
      tab.collectionId = collectionId
      return tab
    })

    const collection: Collection = {
      id: collectionId,
      name: yamlCollection.name,
      description: yamlCollection.description,
      parentId: yamlCollection.parentId,
      children: [],
      requests: [],
      tabs: yamlCollection.tabs || tabs.map((tab) => tab.id),
      activeTabId: yamlCollection.activeTabId,
      created: yamlCollection.created || new Date().toISOString(),
      updated: yamlCollection.updated || new Date().toISOString()
    }

    return { collection, tabs }
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
    headers.push(...KeyValuePairOperations.add([]))

    // パラメータを配列形式に変換
    const params = yamlRequest.params
      ? Object.entries(yamlRequest.params).map(([key, value]) => ({
          key,
          value,
          enabled: true
        }))
      : []

    // 空の行を追加
    params.push(...KeyValuePairOperations.add([]))

    // ボディを文字列に変換
    let body = ''
    if (yamlRequest.body !== undefined) {
      if (typeof yamlRequest.body === 'object' && yamlRequest.body !== null) {
        body = JSON.stringify(yamlRequest.body, null, 2)
      } else if (
        typeof yamlRequest.body === 'string' ||
        typeof yamlRequest.body === 'number' ||
        typeof yamlRequest.body === 'boolean'
      ) {
        body = String(yamlRequest.body)
      } else {
        body = JSON.stringify(yamlRequest.body)
      }
    }

    // BodyKeyValuePairsを復元
    const bodyKeyValuePairs = yamlRequest.bodyKeyValuePairs
      ? yamlRequest.bodyKeyValuePairs.map(pair => ({
          key: pair.key,
          value: pair.value,
          enabled: pair.enabled,
          isFile: pair.isFile,
          fileName: pair.fileName,
          fileContent: pair.fileContent,
          fileEncoding: pair.fileEncoding
        }))
      : []

    // 空の行を追加
    if (bodyKeyValuePairs.length > 0) {
      bodyKeyValuePairs.push(...KeyValuePairOperations.add([]))
    }

    const request: ApiRequest = {
      id: uuidv4(),
      name: yamlRequest.name || `Request ${index + 1}`,
      url: yamlRequest.url || '',
      method: (yamlRequest.method as ApiRequest['method']) || 'GET',
      headers,
      params,
      body,
      bodyType: (yamlRequest.bodyType as ApiRequest['bodyType']) || 'json',
      bodyKeyValuePairs: bodyKeyValuePairs.length > 0 ? bodyKeyValuePairs : undefined,
      type: yamlRequest.type === 'graphql' ? 'graphql' : 'rest',
      variables: yamlRequest.variables || {},
      auth: yamlRequest.auth ? {
        type: yamlRequest.auth.type,
        basic: yamlRequest.auth.basic,
        bearer: yamlRequest.auth.bearer,
        apiKey: yamlRequest.auth.apiKey
      } : undefined,
      settings: yamlRequest.settings ? {
        timeout: yamlRequest.settings.timeout,
        followRedirects: yamlRequest.settings.followRedirects,
        maxRedirects: yamlRequest.settings.maxRedirects,
        validateSSL: yamlRequest.settings.validateSSL,
        userAgent: yamlRequest.settings.userAgent
      } : undefined,
      postScript: yamlRequest.postScript
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
