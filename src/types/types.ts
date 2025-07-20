// HTTPメソッドの型定義
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// API種別の型定義
export type ApiType = 'rest' | 'graphql'

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
}

// APIレスポンスの型定義
export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: unknown
  duration: number // レスポンス時間（ミリ秒）
  timestamp: string // ISO文字列
}

// タブの型定義
export interface ApiTab {
  id: string
  title: string
  request: ApiRequest
  response: ApiResponse | null
  isActive: boolean
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
