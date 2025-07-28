/**
 * ポストスクリプト実行エンジン
 * API実行後にレスポンスからグローバル変数を生成するスクリプトを実行
 */

import type { ApiResponse, GlobalVariable } from '@/types/types'

export interface PostScriptContext {
  response: ApiResponse
  setGlobalVariable: (key: string, value: string, description?: string) => void
  getGlobalVariable: (key: string) => string | null
  console: {
    log: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }
}

export interface PostScriptResult {
  success: boolean
  error?: string
  logs: string[]
  generatedVariables: GlobalVariable[]
}

/**
 * JSON Path風の記法でオブジェクトから値を取得
 */
function getValueByPath(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) {
    return undefined
  }

  // パスを正規化 ($.data.user.id -> data.user.id)
  const normalizedPath = path.replace(/^\$\.?/, '')

  if (!normalizedPath) {
    return obj
  }

  const keys = normalizedPath.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }

    // 配列のインデックス記法をサポート (users[0])
    const arrayMatch = key.match(/^([^[]+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch
      current = (current as Record<string, unknown>)[arrayKey]
      if (Array.isArray(current)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        current = current[parseInt(index, 10)]
      } else {
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[key]
    }
  }

  return current
}

/**
 * 安全なJavaScript実行環境を作成
 */
function createSafeEnvironment(context: PostScriptContext): Record<string, unknown> {
  return {
    // レスポンスオブジェクト
    response: context.response,

    // データアクセス用のヘルパー関数
    getData: (path?: string) => {
      const responseData = context.response.data
      
      // レスポンスデータがオブジェクトでtype, dataプロパティを持つ場合、そのdataを使用
      let actualData: unknown = responseData
      if (
        responseData &&
        typeof responseData === 'object' &&
        'type' in responseData &&
        'data' in responseData
      ) {
        actualData = (responseData as { data: unknown }).data
      }

      if (!path) {
        return actualData
      }
      return getValueByPath(actualData, path)
    },

    getStatus: () => context.response.status,
    getHeaders: () => context.response.headers,
    getDuration: () => context.response.duration,

    // グローバル変数操作
    setGlobalVariable: context.setGlobalVariable,
    getGlobalVariable: context.getGlobalVariable,

    // ログ出力
    console: context.console,

    // ユーティリティ関数
    JSON: {
      parse: JSON.parse,
      stringify: JSON.stringify
    },

    // よく使用される関数
    String,
    Number,
    Boolean,
    Array,
    Object,
    Date,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,

    // セキュリティ上危険な関数を無効化
    eval: undefined,
    Function: undefined,
    setTimeout: undefined,
    setInterval: undefined,
    clearTimeout: undefined,
    clearInterval: undefined,
    XMLHttpRequest: undefined,
    fetch: undefined,
    window: undefined,
    document: undefined,
    global: undefined,
    process: undefined,
    require: undefined,
    module: undefined,
    exports: undefined
  }
}

/**
 * ポストスクリプトを実行する
 */
export function executePostScript(
  script: string,
  response: ApiResponse,
  setGlobalVariable: (key: string, value: string, description?: string) => void,
  getGlobalVariable: (key: string) => string | null
): PostScriptResult {
  const logs: string[] = []
  const generatedVariables: GlobalVariable[] = []

  // ログをキャプチャするコンソール
  const consoleLogger = {
    log: (...args: unknown[]) => {
      logs.push('[LOG] ' + args.map(String).join(' '))
    },
    error: (...args: unknown[]) => {
      logs.push('[ERROR] ' + args.map(String).join(' '))
    },
    warn: (...args: unknown[]) => {
      logs.push('[WARN] ' + args.map(String).join(' '))
    }
  }

  // グローバル変数設定をラップして記録
  const wrappedSetGlobalVariable = (key: string, value: string, description?: string) => {
    setGlobalVariable(key, value, description)
    generatedVariables.push({
      id: `generated-${Date.now()}-${Math.random()}`,
      key,
      value,
      enabled: true,
      description: description || `Generated from API response at ${new Date().toISOString()}`
    })
    logs.push(`[VARIABLE] Set ${key} = ${value}`)
  }

  const context: PostScriptContext = {
    response,
    setGlobalVariable: wrappedSetGlobalVariable,
    getGlobalVariable,
    console: consoleLogger
  }

  try {
    // 安全な実行環境を作成
    const safeEnv = createSafeEnvironment(context)

    // スクリプトを関数として実行
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const scriptFunction = new Function(...Object.keys(safeEnv), script)

    // 実行
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    scriptFunction(...Object.values(safeEnv))

    return {
      success: true,
      logs,
      generatedVariables
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
      generatedVariables
    }
  }
}

/**
 * スクリプトのサンプルテンプレート
 */
export const SCRIPT_TEMPLATES = {
  // 基本的なJSONレスポンスからの値抽出
  basicJsonExtraction: `// JSONレスポンスから値を抽出してグローバル変数に設定
if (getStatus() === 200) {
  const data = getData();
  
  // トークンを抽出
  const token = getData('token') || getData('access_token');
  if (token) {
    setGlobalVariable('AUTH_TOKEN', token, 'API認証トークン');
  }
  
  // ユーザーIDを抽出
  const userId = getData('user.id') || getData('data.user.id');
  if (userId) {
    setGlobalVariable('USER_ID', String(userId), 'ユーザーID');
  }
  
  console.log('Variables extracted successfully');
}`,

  // 配列データからの抽出
  arrayDataExtraction: `// 配列データから最初の要素を抽出
const items = getData('data.items');
if (Array.isArray(items) && items.length > 0) {
  const firstItem = items[0];
  
  if (firstItem.id) {
    setGlobalVariable('FIRST_ITEM_ID', String(firstItem.id), '最初のアイテムID');
  }
  
  if (firstItem.name) {
    setGlobalVariable('FIRST_ITEM_NAME', String(firstItem.name), '最初のアイテム名');
  }
}`,

  // ヘッダーからの値抽出
  headerExtraction: `// レスポンスヘッダーから値を抽出
const headers = getHeaders();

// セッションIDをヘッダーから取得
if (headers['x-session-id']) {
  setGlobalVariable('SESSION_ID', headers['x-session-id'], 'セッションID');
}

// APIバージョンを取得
if (headers['x-api-version']) {
  setGlobalVariable('API_VERSION', headers['x-api-version'], 'APIバージョン');
}`,

  // 条件付き処理
  conditionalProcessing: `// ステータスコードに応じた処理
const status = getStatus();
const data = getData();

if (status === 200) {
  console.log('Success response');
  
  // 成功時の処理
  if (data.result === 'success') {
    setGlobalVariable('LAST_OPERATION_STATUS', 'SUCCESS', '最後の操作ステータス');
    
    if (data.message) {
      setGlobalVariable('LAST_SUCCESS_MESSAGE', String(data.message), '成功メッセージ');
    }
  }
} else if (status >= 400) {
  console.error('Error response:', status);
  
  // エラー時の処理
  setGlobalVariable('LAST_OPERATION_STATUS', 'ERROR', '最後の操作ステータス');
  
  if (data.error) {
    setGlobalVariable('LAST_ERROR_MESSAGE', String(data.error), 'エラーメッセージ');
  }
}`,

  // 複合的な処理
  complexProcessing: `// 複合的なデータ処理の例
const responseData = getData();
const status = getStatus();

console.log('Processing response...', { status, hasData: !!responseData });

// 認証関連の処理
if (responseData.auth || responseData.authentication) {
  const auth = responseData.auth || responseData.authentication;
  
  if (auth.token) {
    setGlobalVariable('AUTH_TOKEN', auth.token, '認証トークン');
    
    // トークンの有効期限も設定
    if (auth.expires_in) {
      const expiresAt = new Date(Date.now() + auth.expires_in * 1000);
      setGlobalVariable('TOKEN_EXPIRES_AT', expiresAt.toISOString(), 'トークン有効期限');
    }
  }
  
  if (auth.refresh_token) {
    setGlobalVariable('REFRESH_TOKEN', auth.refresh_token, 'リフレッシュトークン');
  }
}

// ページネーション情報の処理
if (responseData.pagination) {
  const pagination = responseData.pagination;
  
  if (pagination.next_page) {
    setGlobalVariable('NEXT_PAGE', String(pagination.next_page), '次のページ番号');
  }
  
  if (pagination.total) {
    setGlobalVariable('TOTAL_ITEMS', String(pagination.total), '総アイテム数');
  }
}

// 動的なキー生成
const timestamp = new Date().toISOString();
setGlobalVariable('LAST_API_CALL_TIME', timestamp, '最後のAPI呼び出し時刻');`
}
