import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGlobalVariablesStore } from './globalVariablesStore'

// crypto.randomUUIDのモック
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
  writable: true
})

// Math.randomのモック
const mockMath = Object.create(global.Math)
mockMath.random = vi.fn(() => 0.5)
global.Math = mockMath

// Date.nowのモック
const fixedTimestamp = 1609459200000 // 2021-01-01T00:00:00.000Z
vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp)

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

      expect(resolved).toBe('timestamp: 1609459200')
    })

    it('$timestampMsを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'timestamp: {{$timestampMs}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('timestamp: 1609459200000')
    })

    it('$isoTimestampを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'time: {{$isoTimestamp}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('time: 2021-01-01T00:00:00.000Z')
    })

    it('$uuidを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'id: {{$uuid}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('id: 12345678-1234-1234-1234-123456789012')
    })

    it('$randomIntを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'number: {{$randomInt}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('number: 500') // Math.random() = 0.5, so 0.5 * 1000 = 500
    })

    it('$randomInt(min,max)を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'number: {{$randomInt(10,20)}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('number: 15') // Math.random() = 0.5, so 0.5 * (20-10+1) + 10 = 15
    })

    it('$randomStringを解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'string: {{$randomString}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('string: g0000000') // Math.random().toString(36).substring(2, 10)
    })

    it('$randomString(length)を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'string: {{$randomString(5)}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('string: nnnnn') // 5文字の文字列 (Math.random() = 0.5の場合)
    })

    it('スペースを含む動的変数参照を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = 'time: {{ $timestamp }}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('time: 1609459200')
    })

    it('複数の動的変数を解決できる', () => {
      const { resolveDynamicVariables } = useGlobalVariablesStore.getState()

      const text = '{{$timestamp}}_{{$uuid}}_{{$randomInt}}'
      const resolved = resolveDynamicVariables(text)

      expect(resolved).toBe('1609459200_12345678-1234-1234-1234-123456789012_500')
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

      expect(resolved).toBe('api_1609459200_12345678-1234-1234-1234-123456789012')
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
      expect(resolved).toBe('time: 1609459200')
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
