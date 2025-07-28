// HTTPメソッドの型定義
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// グローバル設定の型定義
export interface GlobalSettings {
  // リクエストのデフォルト設定
  defaultTimeout: number
  defaultFollowRedirects: boolean
  defaultMaxRedirects: number
  defaultValidateSSL: boolean
  defaultUserAgent: string

  // UIの設定
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'

  // エディタの設定
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean

  // 開発者向け設定
  debugLogs: boolean
  saveHistory: boolean
  maxHistorySize: number

  // ネットワーク設定
  proxyEnabled: boolean
  proxyUrl?: string
  proxyAuth?: {
    username: string
    password: string
  }

  // セキュリティ設定
  allowInsecureConnections: boolean
  certificateValidation: boolean

  // クライアント証明書設定
  clientCertificates: {
    enabled: boolean
    certificates: Array<{
      id: string
      name: string
      host?: string // 特定のホストに限定する場合
      certPath: string // 証明書ファイルパス
      keyPath: string // 秘密鍵ファイルパス
      passphrase?: string // パスフレーズ
      enabled: boolean
    }>
  }

  // アプリケーション設定
  autoSave: boolean
  autoSaveInterval: number // 秒
  checkForUpdates: boolean
}

// API種別の型定義
export type ApiType = 'rest' | 'graphql'

// GraphQL変数の型定義
export type GraphQLVariableType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface GraphQLVariable {
  value: string | number | boolean | object | unknown[]
  type: GraphQLVariableType
}

// ボディタイプの型定義
export type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'

// ファイルエンコーディング方法の型定義
export type FileEncoding = 'base64' | 'binary'

// 認証タイプの型定義
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key'

// API Key配置場所の型定義
export type ApiKeyLocation = 'header' | 'query'

// 認証設定の型定義
export interface AuthConfig {
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

// キーバリューペアの型定義
export interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
  isFile?: boolean // ファイルかどうか
  fileName?: string // ファイル名
  fileContent?: string // ファイルの内容
  fileEncoding?: FileEncoding // ファイルのエンコーディング方法
}

// APIリクエストの型定義
export interface ApiRequest {
  id: string
  name: string
  url: string
  method: HttpMethod
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: string
  bodyType: BodyType
  bodyKeyValuePairs?: KeyValuePair[] // KeyValue方式のbody入力用
  auth?: AuthConfig // 認証設定
  settings?: RequestSettings // リクエスト設定
  type: ApiType
  variables?: Record<string, unknown> // GraphQL用の変数
  postScript?: string // API実行後に実行するスクリプト
}

// レスポンスデータの型定義
export type ResponseDataType = 'json' | 'text' | 'binary' | 'error'

export interface ResponseData {
  type: ResponseDataType
  size?: number
  contentType?: string
}

export interface JsonResponseData extends ResponseData {
  type: 'json'
  data: Record<string, unknown> | unknown[]
  raw?: string
}

export interface TextResponseData extends ResponseData {
  type: 'text'
  data: string
}

export interface BinaryResponseData extends ResponseData {
  type: 'binary'
  subType?: 'image' | 'document' | 'audio' | 'video' | 'other'
  data: string | null // base64 encoded data
  dataUrl?: string | null
  originalBlob?: Blob
  isPreviewable?: boolean
  notice?: string
  error?: string
  mimeType?: string
}

export interface ErrorResponseData extends ResponseData {
  type: 'error'
  error: string
}

export type ApiResponseData =
  | JsonResponseData
  | TextResponseData
  | BinaryResponseData
  | ErrorResponseData

// APIレスポンスの型定義
export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: ApiResponseData
  duration: number // レスポンス時間（ミリ秒）
  timestamp: string // ISO文字列
  finalUrl?: string // リダイレクト後の最終URL
  executedRequest?: ApiRequest // 実行時のリクエスト内容（RAW表示用）
}

// タブの型定義
export interface ApiTab {
  id: string
  title: string
  request: ApiRequest
  response: ApiResponse | null
  isActive: boolean
  collectionId?: string // どのコレクションに属するかを示す
  sessionId?: string // 使用するセッション情報のID
  isCustomTitle?: boolean // ユーザーが手動でタイトルを変更したかどうか
}

// アプリケーション全体の設定
export interface ApiConfig {
  tabs: ApiTab[]
  activeTabId: string
}

// YAML エクスポート/インポート用の型定義
export interface YamlApiConfig {
  version: string
  tabs: Omit<ApiTab, 'id' | 'isActive' | 'response'>[]
}

// 入力モードの型定義
export type InputMode = 'table' | 'json'

// フォームの型定義
export interface FormData {
  inputMode: InputMode
  url: string
  method: HttpMethod
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: string
  bodyType: BodyType
}

// 環境変数の型定義
export interface Environment {
  id: string
  name: string
  variables: KeyValuePair[]
}

// 環境設定の型定義
export interface EnvironmentConfig {
  environments: Environment[]
  activeEnvironmentId: string | null
}

// リクエスト設定の型定義
export interface RequestSettings {
  timeout: number // ミリ秒
  followRedirects: boolean
  maxRedirects: number
  validateSSL: boolean
  userAgent?: string
}

// デフォルトのリクエスト設定
export const DEFAULT_REQUEST_SETTINGS: RequestSettings = {
  timeout: 30000, // 30秒
  followRedirects: true,
  maxRedirects: 5,
  validateSSL: true,
  userAgent: 'API Tester 1.0'
}

// グローバル変数の型定義
export interface GlobalVariable {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
}

// グローバル変数設定の型定義
export interface GlobalVariablesConfig {
  variables: GlobalVariable[]
}

// クッキー管理
export interface Cookie {
  id: string
  name: string
  value: string
  domain: string
  path: string
  enabled: boolean
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  expires?: string
}

export interface CookieStore {
  cookies: Cookie[]
}

// セッション情報の定義
export interface SessionVariable {
  id: string
  key: string
  value: string
  enabled: boolean
  source?: 'response' | 'manual' | 'script' // セッション変数の取得元
  extractPath?: string // レスポンスから値を抽出するJSONPath
  description?: string
  createdAt: string
  updatedAt: string
}

export interface SessionState {
  id: string
  name: string
  variables: SessionVariable[]
  cookies: Cookie[] // セッション固有のクッキー
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface SessionStore {
  sessions: SessionState[]
  activeSessionId?: string
  sharedVariables: SessionVariable[] // 全タブで共有される変数
}

// 実行履歴の型定義
export interface RequestExecutionHistory {
  id: string
  request: ApiRequest
  response: ApiResponse
  timestamp: string
  duration: number
  status: 'success' | 'error'
  errorMessage?: string
}

// コレクション管理の型定義
export interface Collection {
  id: string
  name: string
  description?: string
  parentId?: string // フォルダ機能用
  children?: Collection[] // サブフォルダ
  requests?: string[] // リクエストIDの配列
  tabs?: string[] // このコレクションに属するタブIDの配列
  activeTabId?: string // コレクション内のアクティブなタブID
  created: string
  updated: string
}

// コレクション管理ストアの型定義
export interface CollectionStore {
  collections: Collection[]
  executionHistory: RequestExecutionHistory[]
  maxHistorySize: number
  searchQuery: string
  activeCollectionId?: string // 現在アクティブなコレクション
  filterOptions: {
    status?: 'success' | 'error'
    dateRange?: {
      start: string
      end: string
    }
    method?: HttpMethod[]
  }
}
