// HTTPメソッドの型定義
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// API種別の型定義
export type ApiType = 'rest' | 'graphql'

// ボディタイプの型定義
export type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'

// ファイルエンコーディング方法の型定義
export type FileEncoding = 'base64' | 'binary'

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
