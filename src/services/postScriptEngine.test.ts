import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiResponse, GlobalVariable } from '@/types/types'
import { executePostScript, SCRIPT_TEMPLATES } from './postScriptEngine'

describe('PostScriptEngine', () => {
  let mockSetGlobalVariable: ReturnType<typeof vi.fn>
  let mockGetGlobalVariable: ReturnType<typeof vi.fn>
  let mockResponse: ApiResponse

  beforeEach(() => {
    mockSetGlobalVariable = vi.fn()
    mockGetGlobalVariable = vi.fn()

    mockResponse = {
      status: 200,
      statusText: 'OK',
      data: {
        type: 'json' as const,
        data: {
          access_token: 'test-token-123',
          user: {
            id: 42,
            name: 'John Doe',
            email: 'john@example.com'
          },
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ]
        }
      },
      headers: {
        'x-session-id': 'session-123',
        'x-api-version': 'v1.2.0'
      },
      duration: 150,
      size: 1024,
      timestamp: '2024-01-01T00:00:00.000Z'
    }
  })

  describe('基本的なスクリプト実行', () => {
    it('簡単なグローバル変数設定ができる', () => {
      const script = `
        setGlobalVariable('TEST_KEY', 'test_value', 'テスト変数');
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('TEST_KEY', 'test_value', 'テスト変数')
      expect(result.generatedVariables).toHaveLength(1)
      expect(result.generatedVariables[0].key).toBe('TEST_KEY')
      expect(result.generatedVariables[0].value).toBe('test_value')
    })

    it('レスポンスデータにアクセスできる', () => {
      const script = `
        const status = getStatus();
        const token = getData('access_token');
        const userId = getData('user.id');
        
        if (status === 200 && token) {
          setGlobalVariable('AUTH_TOKEN', token, '認証トークン');
        }
        
        if (userId) {
          setGlobalVariable('USER_ID', String(userId), 'ユーザーID');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'AUTH_TOKEN',
        'test-token-123',
        '認証トークン'
      )
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('USER_ID', '42', 'ユーザーID')
      expect(result.generatedVariables).toHaveLength(2)
    })

    it('配列データにアクセスできる', () => {
      const script = `
        const items = getData('items');
        if (Array.isArray(items) && items.length > 0) {
          const firstItem = items[0];
          setGlobalVariable('FIRST_ITEM_ID', String(firstItem.id), '最初のアイテムID');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('FIRST_ITEM_ID', '1', '最初のアイテムID')
    })

    it('ヘッダーにアクセスできる', () => {
      const script = `
        const headers = getHeaders();
        const sessionId = headers['x-session-id'];
        const apiVersion = headers['x-api-version'];
        
        if (sessionId) {
          setGlobalVariable('SESSION_ID', sessionId, 'セッションID');
        }
        
        if (apiVersion) {
          setGlobalVariable('API_VERSION', apiVersion, 'APIバージョン');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'SESSION_ID',
        'session-123',
        'セッションID'
      )
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('API_VERSION', 'v1.2.0', 'APIバージョン')
    })
  })

  describe('エラーハンドリング', () => {
    it('構文エラーをキャッチする', () => {
      const script = `
        setGlobalVariable('TEST_KEY', 'test_value';  // 構文エラー（閉じ括弧がない）
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.generatedVariables).toHaveLength(0)
    })

    it('実行時エラーをキャッチする', () => {
      const script = `
        const data = getData();
        data.nonExistent.property; // 実行時エラー
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('危険な関数の使用を防ぐ', () => {
      const script = `
        eval('malicious code'); // evalは無効化されている
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('ログ機能', () => {
    it('コンソールログをキャプチャする', () => {
      const script = `
        console.log('情報ログ');
        console.error('エラーログ');
        console.warn('警告ログ');
        setGlobalVariable('TEST_KEY', 'test_value');
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(result.logs).toContain('[LOG] 情報ログ')
      expect(result.logs).toContain('[ERROR] エラーログ')
      expect(result.logs).toContain('[WARN] 警告ログ')
      expect(result.logs).toContain('[VARIABLE] Set TEST_KEY = test_value')
    })
  })

  describe('条件付き処理', () => {
    it('ステータスコードに基づく処理ができる', () => {
      const script = `
        const status = getStatus();
        
        if (status === 200) {
          setGlobalVariable('LAST_STATUS', 'SUCCESS', '最後のステータス');
        } else if (status >= 400) {
          setGlobalVariable('LAST_STATUS', 'ERROR', '最後のステータス');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'LAST_STATUS',
        'SUCCESS',
        '最後のステータス'
      )
    })

    it('エラーレスポンスの場合の処理', () => {
      const errorResponse: ApiResponse = {
        ...mockResponse,
        status: 401,
        statusText: 'Unauthorized'
      }

      const script = `
        const status = getStatus();
        
        if (status >= 400) {
          setGlobalVariable('ERROR_STATUS', String(status), 'エラーステータス');
        }
      `

      const result = executePostScript(
        script,
        errorResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('ERROR_STATUS', '401', 'エラーステータス')
    })
  })

  describe('既存のグローバル変数アクセス', () => {
    it('既存の変数を読み取れる', () => {
      mockGetGlobalVariable.mockImplementation((key) => {
        if (key === 'EXISTING_VAR') return 'existing_value'
        return null
      })

      const script = `
        const existingValue = getGlobalVariable('EXISTING_VAR');
        if (existingValue) {
          setGlobalVariable('COMBINED_VALUE', existingValue + '_modified', '組み合わせ値');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockGetGlobalVariable).toHaveBeenCalledWith('EXISTING_VAR')
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'COMBINED_VALUE',
        'existing_value_modified',
        '組み合わせ値'
      )
    })
  })

  describe('データパスアクセス', () => {
    it('ネストしたオブジェクトにアクセスできる', () => {
      const script = `
        const userName = getData('user.name');
        const userEmail = getData('user.email');
        
        if (userName) {
          setGlobalVariable('USER_NAME', userName, 'ユーザー名');
        }
        
        if (userEmail) {
          setGlobalVariable('USER_EMAIL', userEmail, 'ユーザーメール');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('USER_NAME', 'John Doe', 'ユーザー名')
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'USER_EMAIL',
        'john@example.com',
        'ユーザーメール'
      )
    })

    it('存在しないパスではundefinedを返す', () => {
      const script = `
        const nonExistent = getData('user.nonExistent');
        console.log('Non-existent value:', nonExistent);
        
        if (nonExistent === undefined) {
          setGlobalVariable('PATH_TEST', 'undefined_handled', 'パステスト');
        }
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'PATH_TEST',
        'undefined_handled',
        'パステスト'
      )
    })
  })

  describe('テンプレートスクリプト', () => {
    it('基本的なJSON抽出テンプレートが動作する', () => {
      const script = SCRIPT_TEMPLATES.basicJsonExtraction

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'AUTH_TOKEN',
        'test-token-123',
        'API認証トークン'
      )
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('USER_ID', '42', 'ユーザーID')
    })

    it('配列データ抽出テンプレートが動作する', () => {
      // データ構造を調整
      const modifiedResponse = {
        ...mockResponse,
        data: {
          type: 'json' as const,
          data: {
            data: {
              items: [
                { id: 1, name: 'First Item' },
                { id: 2, name: 'Second Item' }
              ]
            }
          }
        }
      }

      const script = SCRIPT_TEMPLATES.arrayDataExtraction

      const result = executePostScript(
        script,
        modifiedResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('FIRST_ITEM_ID', '1', '最初のアイテムID')
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'FIRST_ITEM_NAME',
        'First Item',
        '最初のアイテム名'
      )
    })

    it('ヘッダー抽出テンプレートが動作する', () => {
      const script = SCRIPT_TEMPLATES.headerExtraction

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(mockSetGlobalVariable).toHaveBeenCalledWith(
        'SESSION_ID',
        'session-123',
        'セッションID'
      )
      expect(mockSetGlobalVariable).toHaveBeenCalledWith('API_VERSION', 'v1.2.0', 'APIバージョン')
    })
  })

  describe('セキュリティ機能', () => {
    it('危険な関数が無効化されている', () => {
      const script = `
        console.log('eval:', typeof eval);
        console.log('Function:', typeof Function);
        console.log('setTimeout:', typeof setTimeout);
        console.log('fetch:', typeof fetch);
        console.log('XMLHttpRequest:', typeof XMLHttpRequest);
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(result.logs).toContain('[LOG] eval: undefined')
      expect(result.logs).toContain('[LOG] Function: undefined')
      expect(result.logs).toContain('[LOG] setTimeout: undefined')
      expect(result.logs).toContain('[LOG] fetch: undefined')
      expect(result.logs).toContain('[LOG] XMLHttpRequest: undefined')
    })

    it('許可された関数は使用できる', () => {
      const script = `
        console.log('JSON:', typeof JSON);
        console.log('String:', typeof String);
        console.log('Number:', typeof Number);
        console.log('Date:', typeof Date);
        console.log('Math:', typeof Math);
      `

      const result = executePostScript(
        script,
        mockResponse,
        mockSetGlobalVariable,
        mockGetGlobalVariable
      )

      expect(result.success).toBe(true)
      expect(result.logs).toContain('[LOG] JSON: object')
      expect(result.logs).toContain('[LOG] String: function')
      expect(result.logs).toContain('[LOG] Number: function')
      expect(result.logs).toContain('[LOG] Date: function')
      expect(result.logs).toContain('[LOG] Math: object')
    })
  })
})
