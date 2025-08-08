import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGlobalVariablesStore } from './globalVariablesStore'

describe('GlobalVariablesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ストアを初期状態にリセット
    useGlobalVariablesStore.setState({
      variables: []
    })
  })

  describe('変数管理', () => {
    it('新しい変数を追加できる', () => {
      const { addVariable } = useGlobalVariablesStore.getState()

      addVariable()

      const state = useGlobalVariablesStore.getState()
      expect(state.variables).toHaveLength(1)
      expect(state.variables[0]).toEqual({
        id: expect.any(String),
        key: '',
        value: '',
        enabled: false,
        description: ''
      })
    })

    it('変数を更新できる', () => {
      const { addVariable, updateVariable } = useGlobalVariablesStore.getState()

      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[0].id

      updateVariable(variableId, {
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true,
        description: 'API のベース URL'
      })

      const updatedState = useGlobalVariablesStore.getState()
      expect(updatedState.variables[0]).toEqual({
        id: variableId,
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true,
        description: 'API のベース URL'
      })
    })

    it('変数を削除できる', () => {
      const { addVariable, removeVariable } = useGlobalVariablesStore.getState()

      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[0].id

      removeVariable(variableId)

      const updatedState = useGlobalVariablesStore.getState()
      expect(updatedState.variables).toHaveLength(0)
    })

    it('存在しない変数IDでの削除は無効である', () => {
      const { addVariable, removeVariable } = useGlobalVariablesStore.getState()

      addVariable()
      removeVariable('non-existent-id')

      const state = useGlobalVariablesStore.getState()
      expect(state.variables).toHaveLength(1)
    })
  })

  describe('変数の検索', () => {
    it('キーで変数を検索できる', () => {
      const { addVariable, updateVariable, getVariableByKey } = useGlobalVariablesStore.getState()

      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[0].id

      updateVariable(variableId, {
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true
      })

      const variable = getVariableByKey('API_URL')
      expect(variable).toEqual({
        id: variableId,
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true,
        description: ''
      })
    })

    it('無効な変数は検索結果に含まれない', () => {
      const { addVariable, updateVariable, getVariableByKey } = useGlobalVariablesStore.getState()

      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[0].id

      updateVariable(variableId, {
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: false // 無効
      })

      const variable = getVariableByKey('API_URL')
      expect(variable).toBeNull()
    })

    it('存在しないキーではnullを返す', () => {
      const { getVariableByKey } = useGlobalVariablesStore.getState()

      const variable = getVariableByKey('NON_EXISTENT')
      expect(variable).toBeNull()
    })
  })

  describe('グローバル変数の解決', () => {
    beforeEach(() => {
      const { addVariable, updateVariable } = useGlobalVariablesStore.getState()

      // テスト用の変数を追加
      addVariable()
      addVariable()
      addVariable()

      const state = useGlobalVariablesStore.getState()
      const [var1, var2, var3] = state.variables

      updateVariable(var1.id, {
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true
      })

      updateVariable(var2.id, {
        key: 'VERSION',
        value: 'v1.0.0',
        enabled: true
      })

      updateVariable(var3.id, {
        key: 'DISABLED_VAR',
        value: 'disabled value',
        enabled: false // 無効
      })
    })

    it('グローバル変数を解決できる', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{API_URL}}/users/{{VERSION}}'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe('https://api.example.com/users/v1.0.0')
    })

    it('スペースを含む変数参照を解決できる', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{ API_URL }}/users/{{ VERSION }}'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe('https://api.example.com/users/v1.0.0')
    })

    it('無効な変数は解決されない', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{API_URL}}/{{DISABLED_VAR}}'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe('https://api.example.com/{{DISABLED_VAR}}')
    })

    it('存在しない変数は解決されない', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{API_URL}}/{{NON_EXISTENT}}'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe('https://api.example.com/{{NON_EXISTENT}}')
    })

    it('同じ変数の複数回参照を解決できる', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{API_URL}}/users and {{API_URL}}/products'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe('https://api.example.com/users and https://api.example.com/products')
    })
  })

  describe('動的変数の解決', () => {
    it('$timestampを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'timestamp: {{$timestamp}}'
      const resolved = resolveDynamicVariables(text)

      // 現在のタイムスタンプが期待される（数値であることを確認）
      expect(resolved).toMatch(/^timestamp: \d+$/)

      // 実際の値と期待値が近い範囲にあることを確認（テスト実行時刻から±1秒以内）
      const extractedTimestamp = parseInt(resolved.replace('timestamp: ', ''))
      const currentTimestamp = Math.floor(Date.now() / 1000)
      expect(Math.abs(extractedTimestamp - currentTimestamp)).toBeLessThan(2)
    })

    it('$timestampMsを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'timestamp: {{$timestampMs}}'
      const resolved = resolveDynamicVariables(text)

      // ミリ秒のタイムスタンプが期待される
      expect(resolved).toMatch(/^timestamp: \d+$/)

      const extractedTimestamp = parseInt(resolved.replace('timestamp: ', ''))
      const currentTimestamp = Date.now()
      expect(Math.abs(extractedTimestamp - currentTimestamp)).toBeLessThan(2000)
    })

    it('$isoTimestampを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'time: {{$isoTimestamp}}'
      const resolved = resolveDynamicVariables(text)

      // ISO形式のタイムスタンプが期待される
      expect(resolved).toMatch(/^time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('$uuidを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'id: {{$uuid}}'
      const resolved = resolveDynamicVariables(text)

      // UUID v4形式が期待される
      expect(resolved).toMatch(/^id: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('$randomIntを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'number: {{$randomInt}}'
      const resolved = resolveDynamicVariables(text)

      // 0-999の範囲のランダムな整数が期待される
      expect(resolved).toMatch(/^number: \d+$/)

      const extractedNumber = parseInt(resolved.replace('number: ', ''))
      expect(extractedNumber).toBeGreaterThanOrEqual(0)
      expect(extractedNumber).toBeLessThan(1000)
    })

    it('$randomInt(min,max)を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'number: {{$randomInt(10,20)}}'
      const resolved = resolveDynamicVariables(text)

      // 10-20の範囲のランダムな整数が期待される
      expect(resolved).toMatch(/^number: \d+$/)

      const extractedNumber = parseInt(resolved.replace('number: ', ''))
      expect(extractedNumber).toBeGreaterThanOrEqual(10)
      expect(extractedNumber).toBeLessThanOrEqual(20)
    })

    it('$randomStringを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'string: {{$randomString}}'
      const resolved = resolveDynamicVariables(text)

      // 英数字の文字列が期待される（最大8文字）
      expect(resolved).toMatch(/^string: [a-z0-9]+$/)

      const extractedString = resolved.replace('string: ', '')
      expect(extractedString.length).toBeGreaterThan(0)
      expect(extractedString.length).toBeLessThanOrEqual(8)
    })

    it('$randomString(length)を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'string: {{$randomString(5)}}'
      const resolved = resolveDynamicVariables(text)

      // 5文字の英数字文字列が期待される
      expect(resolved).toMatch(/^string: [A-Za-z0-9]{5}$/)
    })

    it('スペースを含む動的変数参照を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'time: {{ $timestamp }}'
      const resolved = resolveDynamicVariables(text)

      // タイムスタンプが解決される
      expect(resolved).toMatch(/^time: \d+$/)
    })

    it('複数の動的変数を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = '{{$timestamp}}_{{$uuid}}_{{$randomInt}}'
      const resolved = resolveDynamicVariables(text)

      // タイムスタンプ_UUID_ランダム整数の形式が期待される
      expect(resolved).toMatch(
        /^\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_\d+$/
      )
    })
  })

  describe('統合的な変数解決', () => {
    beforeEach(() => {
      const { addVariable, updateVariable } = useGlobalVariablesStore.getState()

      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[0].id

      updateVariable(variableId, {
        key: 'PREFIX',
        value: 'api',
        enabled: true
      })
    })

    it('動的変数とグローバル変数を同時に解決できる', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{PREFIX}}_{{$timestamp}}_{{$uuid}}'
      const resolved = resolveGlobalVariables(text)

      // グローバル変数PREFIXと動的変数が解決される
      expect(resolved).toMatch(
        /^api_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    })

    it('動的変数が先に解決される', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      // グローバル変数に動的変数と同じキーを設定
      const { addVariable, updateVariable } = useGlobalVariablesStore.getState()
      addVariable()
      const state = useGlobalVariablesStore.getState()
      const variableId = state.variables[1].id

      updateVariable(variableId, {
        key: '$timestamp',
        value: 'custom_timestamp',
        enabled: true
      })

      const text = 'time: {{$timestamp}}'
      const resolved = resolveGlobalVariables(text)

      // 動的変数が優先されるため、実際のタイムスタンプが返される
      expect(resolved).toMatch(/^time: \d+$/)
    })
  })

  describe('エッジケース', () => {
    it('空文字列を処理できる', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const resolved = resolveGlobalVariables('')
      expect(resolved).toBe('')
    })

    it('変数参照のない文字列をそのまま返す', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = 'This is a plain text without variables'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe(text)
    })

    it('不完全な変数参照はそのまま残す', () => {
      const { resolveGlobalVariables } = useGlobalVariablesStore.getState()

      const text = '{{INCOMPLETE} or {INCOMPLETE}} or {{INCOMPLETE'
      const resolved = resolveGlobalVariables(text)

      expect(resolved).toBe(text)
    })

    it('ネストした変数参照はサポートしない', () => {
      const { addVariable, updateVariable, resolveGlobalVariables } =
        useGlobalVariablesStore.getState()

      addVariable()
      addVariable()
      const state = useGlobalVariablesStore.getState()
      const [var1, var2] = state.variables

      updateVariable(var1.id, {
        key: 'INNER',
        value: 'inner_value',
        enabled: true
      })

      updateVariable(var2.id, {
        key: 'OUTER',
        value: '{{INNER}}',
        enabled: true
      })

      const text = '{{OUTER}}'
      const resolved = resolveGlobalVariables(text)

      // ネストは解決されない
      expect(resolved).toBe('{{INNER}}')
    })
  })
})
