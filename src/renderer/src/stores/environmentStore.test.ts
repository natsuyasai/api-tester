import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEnvironmentStore } from './environmentStore'

// グローバル変数ストアのモック
vi.mock('./globalVariablesStore', () => ({
  useGlobalVariablesStore: {
    getState: vi.fn(() => ({
      resolveGlobalVariables: vi.fn((text: string) =>
        text.replace(/{{GLOBAL_VAR}}/g, 'global_value')
      )
    }))
  }
}))

describe('EnvironmentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ストアを初期状態にリセット
    useEnvironmentStore.setState({
      environments: [],
      activeEnvironmentId: null
    })
  })

  describe('環境管理', () => {
    it('新しい環境を追加できる', () => {
      const { addEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')

      const state = useEnvironmentStore.getState()
      expect(state.environments).toHaveLength(1)
      expect(state.environments[0].name).toBe('開発環境')
      expect(state.environments[0].id).toBeTruthy()
      expect(state.environments[0].variables).toEqual([{ key: '', value: '', enabled: false }])
    })

    it('環境を削除できる', () => {
      const { addEnvironment, removeEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      removeEnvironment(envId)

      const updatedState = useEnvironmentStore.getState()
      expect(updatedState.environments).toHaveLength(0)
    })

    it('アクティブ環境を削除するとactiveEnvironmentIdがnullになる', () => {
      const { addEnvironment, setActiveEnvironment, removeEnvironment } =
        useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      setActiveEnvironment(envId)
      expect(useEnvironmentStore.getState().activeEnvironmentId).toBe(envId)

      removeEnvironment(envId)
      expect(useEnvironmentStore.getState().activeEnvironmentId).toBeNull()
    })

    it('非アクティブ環境を削除してもactiveEnvironmentIdは変わらない', () => {
      const { addEnvironment, setActiveEnvironment, removeEnvironment } =
        useEnvironmentStore.getState()

      addEnvironment('開発環境')
      addEnvironment('本番環境')
      const state = useEnvironmentStore.getState()
      const [devEnv, prodEnv] = state.environments

      setActiveEnvironment(prodEnv.id)
      removeEnvironment(devEnv.id)

      expect(useEnvironmentStore.getState().activeEnvironmentId).toBe(prodEnv.id)
    })

    it('環境を更新できる', () => {
      const { addEnvironment, updateEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      updateEnvironment(envId, {
        name: '更新された開発環境',
        variables: [{ key: 'API_URL', value: 'https://dev.api.com', enabled: true }]
      })

      const updatedState = useEnvironmentStore.getState()
      expect(updatedState.environments[0].name).toBe('更新された開発環境')
      expect(updatedState.environments[0].variables).toEqual([
        { key: 'API_URL', value: 'https://dev.api.com', enabled: true }
      ])
    })

    it('存在しない環境を更新しても何も起こらない', () => {
      const { addEnvironment, updateEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const originalState = useEnvironmentStore.getState()

      updateEnvironment('non-existent-id', { name: '存在しない環境' })

      const updatedState = useEnvironmentStore.getState()
      expect(updatedState).toEqual(originalState)
    })
  })

  describe('アクティブ環境管理', () => {
    it('アクティブ環境を設定できる', () => {
      const { addEnvironment, setActiveEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      setActiveEnvironment(envId)

      expect(useEnvironmentStore.getState().activeEnvironmentId).toBe(envId)
    })

    it('アクティブ環境をnullに設定できる', () => {
      const { addEnvironment, setActiveEnvironment } = useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      setActiveEnvironment(envId)
      setActiveEnvironment(null)

      expect(useEnvironmentStore.getState().activeEnvironmentId).toBeNull()
    })

    it('アクティブ環境を取得できる', () => {
      const { addEnvironment, setActiveEnvironment, getActiveEnvironment } =
        useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      setActiveEnvironment(envId)

      const activeEnv = getActiveEnvironment()
      expect(activeEnv).toEqual(state.environments[0])
    })

    it('アクティブ環境が設定されていない場合はnullを返す', () => {
      const { getActiveEnvironment } = useEnvironmentStore.getState()

      const activeEnv = getActiveEnvironment()
      expect(activeEnv).toBeNull()
    })
  })

  describe('変数管理', () => {
    let envId: string

    beforeEach(() => {
      const { addEnvironment } = useEnvironmentStore.getState()
      addEnvironment('開発環境')

      const state = useEnvironmentStore.getState()
      envId = state.environments[0].id
    })

    it('環境に変数を追加できる', () => {
      const { addVariable } = useEnvironmentStore.getState()

      addVariable(envId)

      const state = useEnvironmentStore.getState()
      const env = state.environments[0]
      expect(env.variables).toHaveLength(2) // 初期の空変数 + 新しい変数
      expect(env.variables[1]).toEqual({ key: '', value: '', enabled: false })
    })

    it('変数を更新できる', () => {
      const { updateVariable } = useEnvironmentStore.getState()

      updateVariable(envId, 0, {
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true
      })

      const state = useEnvironmentStore.getState()
      const env = state.environments[0]
      expect(env.variables[0]).toEqual({
        key: 'API_URL',
        value: 'https://api.example.com',
        enabled: true
      })
    })

    it('変数を削除できる', () => {
      const { addVariable, removeVariable } = useEnvironmentStore.getState()

      // 変数を追加してから削除
      addVariable(envId)
      const initialState = useEnvironmentStore.getState()
      expect(initialState.environments[0].variables).toHaveLength(2)

      removeVariable(envId, 0)

      const finalState = useEnvironmentStore.getState()
      expect(finalState.environments[0].variables).toHaveLength(1)
    })

    it('存在しない環境IDで変数操作を行っても何も起こらない', () => {
      const { addVariable, updateVariable, removeVariable } = useEnvironmentStore.getState()
      const originalState = useEnvironmentStore.getState()

      addVariable('non-existent-id')
      updateVariable('non-existent-id', 0, { key: 'test' })
      removeVariable('non-existent-id', 0)

      const finalState = useEnvironmentStore.getState()
      expect(finalState).toEqual(originalState)
    })

    it('存在しないインデックスで変数操作を行っても何も起こらない', () => {
      const { updateVariable, removeVariable } = useEnvironmentStore.getState()
      const originalState = useEnvironmentStore.getState()

      updateVariable(envId, 999, { key: 'test' })
      removeVariable(envId, 999)

      const finalState = useEnvironmentStore.getState()
      expect(finalState).toEqual(originalState)
    })
  })

  describe('変数の解決', () => {
    let envId: string

    beforeEach(() => {
      const { addEnvironment, setActiveEnvironment, updateVariable } =
        useEnvironmentStore.getState()

      addEnvironment('開発環境')
      const state = useEnvironmentStore.getState()
      envId = state.environments[0].id

      setActiveEnvironment(envId)

      // テスト用の環境変数を設定
      updateVariable(envId, 0, {
        key: 'API_URL',
        value: 'https://dev.api.example.com',
        enabled: true
      })
    })

    it('環境変数を解決できる', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{API_URL}}/users'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('https://dev.api.example.com/users')
    })

    it('スペースを含む変数参照を解決できる', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{ API_URL }}/users'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('https://dev.api.example.com/users')
    })

    it('無効な環境変数は解決されない', () => {
      const { addVariable, updateVariable, resolveVariables } = useEnvironmentStore.getState()

      addVariable(envId)
      updateVariable(envId, 1, {
        key: 'DISABLED_VAR',
        value: 'disabled_value',
        enabled: false
      })

      const text = '{{API_URL}}/{{DISABLED_VAR}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('https://dev.api.example.com/{{DISABLED_VAR}}')
    })

    it('グローバル変数と環境変数を同時に解決できる', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{GLOBAL_VAR}}/{{API_URL}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('global_value/https://dev.api.example.com')
    })

    it('環境変数がグローバル変数より優先される', () => {
      const { addVariable, updateVariable, resolveVariables } = useEnvironmentStore.getState()

      // 環境変数にGLOBAL_VARと同じキーを設定
      addVariable(envId)
      updateVariable(envId, 1, {
        key: 'GLOBAL_VAR',
        value: 'env_value',
        enabled: true
      })

      const text = '{{GLOBAL_VAR}}'
      const resolved = resolveVariables(text)

      // 環境変数が優先される
      expect(resolved).toBe('env_value')
    })

    it('アクティブ環境が設定されていない場合はグローバル変数のみ解決される', () => {
      const { setActiveEnvironment, resolveVariables } = useEnvironmentStore.getState()

      setActiveEnvironment(null)

      const text = '{{GLOBAL_VAR}}/{{API_URL}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('global_value/{{API_URL}}')
    })

    it('存在しない変数は解決されない', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{API_URL}}/{{NON_EXISTENT}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('https://dev.api.example.com/{{NON_EXISTENT}}')
    })

    it('同じ変数の複数回参照を解決できる', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{API_URL}}/users and {{API_URL}}/products'
      const resolved = resolveVariables(text)

      expect(resolved).toBe(
        'https://dev.api.example.com/users and https://dev.api.example.com/products'
      )
    })

    it('複数の環境変数を解決できる', () => {
      const { addVariable, updateVariable, resolveVariables } = useEnvironmentStore.getState()

      addVariable(envId)
      updateVariable(envId, 1, {
        key: 'VERSION',
        value: 'v1.0.0',
        enabled: true
      })

      const text = '{{API_URL}}/{{VERSION}}/users'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('https://dev.api.example.com/v1.0.0/users')
    })
  })

  describe('エッジケース', () => {
    it('空文字列を処理できる', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const resolved = resolveVariables('')
      expect(resolved).toBe('')
    })

    it('変数参照のない文字列をそのまま返す', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = 'This is a plain text without variables'
      const resolved = resolveVariables(text)

      expect(resolved).toBe(text)
    })

    it('不完全な変数参照はそのまま残す', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{INCOMPLETE} or {INCOMPLETE}} or {{INCOMPLETE'
      const resolved = resolveVariables(text)

      expect(resolved).toBe(text)
    })

    it('環境が空の状態でも動作する', () => {
      const { resolveVariables } = useEnvironmentStore.getState()

      const text = '{{GLOBAL_VAR}}/{{ANY_VAR}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('global_value/{{ANY_VAR}}')
    })
  })

  describe('複雑なシナリオ', () => {
    it('複数の環境を管理できる', () => {
      const { addEnvironment, setActiveEnvironment, updateVariable, resolveVariables } =
        useEnvironmentStore.getState()

      addEnvironment('開発環境')
      addEnvironment('本番環境')

      const state = useEnvironmentStore.getState()
      const [devEnv, prodEnv] = state.environments

      // 開発環境の設定
      setActiveEnvironment(devEnv.id)
      updateVariable(devEnv.id, 0, {
        key: 'API_URL',
        value: 'https://dev.api.com',
        enabled: true
      })

      // 本番環境の設定
      updateVariable(prodEnv.id, 0, {
        key: 'API_URL',
        value: 'https://api.com',
        enabled: true
      })

      // 開発環境での解決
      let resolved = resolveVariables('{{API_URL}}/users')
      expect(resolved).toBe('https://dev.api.com/users')

      // 本番環境に切り替えて解決
      setActiveEnvironment(prodEnv.id)
      resolved = resolveVariables('{{API_URL}}/users')
      expect(resolved).toBe('https://api.com/users')
    })

    it('環境変数とグローバル変数の組み合わせを正しく処理する', () => {
      const {
        addEnvironment,
        setActiveEnvironment,
        addVariable,
        updateVariable,
        resolveVariables
      } = useEnvironmentStore.getState()

      addEnvironment('テスト環境')
      const state = useEnvironmentStore.getState()
      const envId = state.environments[0].id

      setActiveEnvironment(envId)

      // 複数の環境変数を設定
      updateVariable(envId, 0, {
        key: 'BASE_URL',
        value: 'https://test.api.com',
        enabled: true
      })

      addVariable(envId)
      updateVariable(envId, 1, {
        key: 'API_KEY',
        value: 'test-api-key',
        enabled: true
      })

      const text = '{{GLOBAL_VAR}}/{{BASE_URL}}/endpoint?key={{API_KEY}}'
      const resolved = resolveVariables(text)

      expect(resolved).toBe('global_value/https://test.api.com/endpoint?key=test-api-key')
    })
  })
})
