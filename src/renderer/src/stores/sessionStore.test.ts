import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ApiResponse } from '@/types/types'
import { useSessionStore } from './sessionStore'

// showErrorDialogのモック
vi.mock('@renderer/utils/errorUtils', () => ({
  showErrorDialog: vi.fn()
}))

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('SessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ストアを初期状態にリセット
    useSessionStore.setState({
      sessions: [],
      activeSessionId: undefined,
      sharedVariables: []
    })
  })

  describe('セッション管理', () => {
    it('新しいセッションを作成できる', () => {
      const { createSession } = useSessionStore.getState()

      const sessionId = createSession('テストセッション')
      const state = useSessionStore.getState()

      expect(state.sessions).toHaveLength(1)
      expect(state.sessions[0].id).toBe(sessionId)
      expect(state.sessions[0].name).toBe('テストセッション')
      expect(state.sessions[0].variables).toEqual([])
      expect(state.sessions[0].cookies).toEqual([])
      expect(state.sessions[0].isActive).toBe(true)
    })

    it('セッションを削除できる', () => {
      const { createSession, deleteSession } = useSessionStore.getState()

      const sessionId = createSession('削除予定セッション')
      deleteSession(sessionId)

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(0)
    })

    it('セッションを更新できる', () => {
      const { createSession, updateSession } = useSessionStore.getState()

      const sessionId = createSession('元の名前')
      updateSession(sessionId, { name: '更新後の名前', isActive: false })

      const state = useSessionStore.getState()
      expect(state.sessions[0].name).toBe('更新後の名前')
      expect(state.sessions[0].isActive).toBe(false)
    })

    it('アクティブセッションを設定できる', () => {
      const { createSession, setActiveSession, getActiveSession } = useSessionStore.getState()

      const sessionId = createSession('テストセッション')
      setActiveSession(sessionId)

      const state = useSessionStore.getState()
      expect(state.activeSessionId).toBe(sessionId)

      const activeSession = getActiveSession()
      expect(activeSession?.id).toBe(sessionId)
    })

    it('セッションを複製できる', () => {
      const { createSession, addSessionVariable, duplicateSession } = useSessionStore.getState()

      const originalId = createSession('オリジナル')
      addSessionVariable(originalId, { key: 'test', value: 'value' })

      const duplicatedId = duplicateSession(originalId, '複製セッション')

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(2)

      const duplicated = state.sessions.find((s) => s.id === duplicatedId)
      expect(duplicated?.name).toBe('複製セッション')
      expect(duplicated?.variables).toHaveLength(1)
    })
  })

  describe('セッション変数管理', () => {
    let sessionId: string

    beforeEach(() => {
      const { createSession } = useSessionStore.getState()
      sessionId = createSession('テストセッション')
    })

    it('セッション変数を追加できる', () => {
      const { addSessionVariable } = useSessionStore.getState()

      const variableId = addSessionVariable(sessionId, {
        key: 'test_var',
        value: 'test_value',
        description: 'テスト変数'
      })

      const state = useSessionStore.getState()
      const session = state.sessions[0]
      expect(session.variables).toHaveLength(1)
      expect(session.variables[0].id).toBe(variableId)
      expect(session.variables[0].key).toBe('test_var')
    })

    it('セッション変数を更新できる', () => {
      const { addSessionVariable, updateSessionVariable } = useSessionStore.getState()

      const variableId = addSessionVariable(sessionId)
      updateSessionVariable(sessionId, variableId, {
        key: 'updated_var',
        value: 'updated_value'
      })

      const state = useSessionStore.getState()
      const variable = state.sessions[0].variables[0]
      expect(variable.key).toBe('updated_var')
      expect(variable.value).toBe('updated_value')
    })

    it('セッション変数を削除できる', () => {
      const { addSessionVariable, removeSessionVariable } = useSessionStore.getState()

      const variableId = addSessionVariable(sessionId)
      removeSessionVariable(sessionId, variableId)

      const state = useSessionStore.getState()
      expect(state.sessions[0].variables).toHaveLength(0)
    })

    it('キーでセッション変数を取得できる', () => {
      const { addSessionVariable, updateSessionVariable, getSessionVariable } =
        useSessionStore.getState()

      const variableId = addSessionVariable(sessionId)
      updateSessionVariable(sessionId, variableId, { key: 'find_me', value: 'found' })

      const variable = getSessionVariable(sessionId, 'find_me')
      expect(variable?.value).toBe('found')
    })
  })

  describe('共有変数管理', () => {
    it('共有変数を追加できる', () => {
      const { addSharedVariable } = useSessionStore.getState()

      const variableId = addSharedVariable({
        key: 'shared_var',
        value: 'shared_value'
      })

      const state = useSessionStore.getState()
      expect(state.sharedVariables).toHaveLength(1)
      expect(state.sharedVariables[0].id).toBe(variableId)
      expect(state.sharedVariables[0].key).toBe('shared_var')
    })

    it('共有変数を更新できる', () => {
      const { addSharedVariable, updateSharedVariable } = useSessionStore.getState()

      const variableId = addSharedVariable()
      updateSharedVariable(variableId, { key: 'updated', value: 'new_value' })

      const state = useSessionStore.getState()
      expect(state.sharedVariables[0].key).toBe('updated')
      expect(state.sharedVariables[0].value).toBe('new_value')
    })

    it('共有変数を削除できる', () => {
      const { addSharedVariable, removeSharedVariable } = useSessionStore.getState()

      const variableId = addSharedVariable()
      removeSharedVariable(variableId)

      const state = useSessionStore.getState()
      expect(state.sharedVariables).toHaveLength(0)
    })
  })

  describe('Cookie管理', () => {
    let sessionId: string

    beforeEach(() => {
      const { createSession } = useSessionStore.getState()
      sessionId = createSession('テストセッション')
    })

    it('セッションCookieを追加できる', () => {
      const { addSessionCookie } = useSessionStore.getState()

      const cookieId = addSessionCookie(sessionId, {
        name: 'session_id',
        value: 'abc123',
        domain: 'example.com'
      })

      const state = useSessionStore.getState()
      const session = state.sessions[0]
      expect(session.cookies).toHaveLength(1)
      expect(session.cookies[0].id).toBe(cookieId)
      expect(session.cookies[0].name).toBe('session_id')
    })

    it('セッションCookieを取得できる', () => {
      const { addSessionCookie, getSessionCookies } = useSessionStore.getState()

      addSessionCookie(sessionId, { name: 'cookie1' })
      addSessionCookie(sessionId, { name: 'cookie2' })

      const cookies = getSessionCookies(sessionId)
      expect(cookies).toHaveLength(2)
      expect(cookies.map((c) => c.name)).toEqual(['cookie1', 'cookie2'])
    })
  })

  describe('変数解決', () => {
    let sessionId: string

    beforeEach(() => {
      const { createSession, addSessionVariable, addSharedVariable } = useSessionStore.getState()

      sessionId = createSession('テストセッション')

      // セッション変数を追加
      const sessionVarId = addSessionVariable(sessionId)
      const { updateSessionVariable } = useSessionStore.getState()
      updateSessionVariable(sessionId, sessionVarId, {
        key: 'SESSION_VAR',
        value: 'session_value'
      })

      // 共有変数を追加
      const sharedVarId = addSharedVariable()
      const { updateSharedVariable } = useSessionStore.getState()
      updateSharedVariable(sharedVarId, {
        key: 'SHARED_VAR',
        value: 'shared_value'
      })
    })

    it('セッション変数を解決できる', () => {
      const { resolveSessionVariables } = useSessionStore.getState()

      const text = 'Value: {{SESSION_VAR}}'
      const resolved = resolveSessionVariables(text, sessionId)

      expect(resolved).toBe('Value: session_value')
    })

    it('共有変数を解決できる', () => {
      const { resolveSessionVariables } = useSessionStore.getState()

      const text = 'Value: {{SHARED_VAR}}'
      const resolved = resolveSessionVariables(text, sessionId)

      expect(resolved).toBe('Value: shared_value')
    })

    it('セッション変数が共有変数より優先される', () => {
      const { addSessionVariable, updateSessionVariable, resolveSessionVariables } =
        useSessionStore.getState()

      // 共有変数と同じキーのセッション変数を追加
      const varId = addSessionVariable(sessionId)
      updateSessionVariable(sessionId, varId, {
        key: 'SHARED_VAR',
        value: 'overridden_value'
      })

      const text = 'Value: {{SHARED_VAR}}'
      const resolved = resolveSessionVariables(text, sessionId)

      expect(resolved).toBe('Value: overridden_value')
    })

    it('すべての変数を取得できる', () => {
      const { getAllVariables } = useSessionStore.getState()

      const variables = getAllVariables(sessionId)

      expect(variables).toEqual({
        SESSION_VAR: 'session_value',
        SHARED_VAR: 'shared_value'
      })
    })
  })

  describe('レスポンスからの値抽出', () => {
    let sessionId: string

    beforeEach(() => {
      const { createSession } = useSessionStore.getState()
      sessionId = createSession('テストセッション')
    })

    it('レスポンスから値を抽出してセッション変数に設定できる', () => {
      const { extractFromResponse } = useSessionStore.getState()

      const mockResponse: ApiResponse = {
        status: 200,
        statusText: 'OK',
        data: {
          type: 'json' as const,
          data: {
            user: { id: '123' },
            token: 'abc123'
          }
        },
        headers: {},
        duration: 100,
        size: 1024,
        timestamp: new Date().toISOString()
      }

      const extractRules = [
        { key: 'USER_ID', path: '$.user.id' },
        { key: 'TOKEN', path: '$.token' }
      ]

      extractFromResponse(sessionId, mockResponse, extractRules)

      const state = useSessionStore.getState()
      const session = state.sessions[0]
      expect(session.variables).toHaveLength(2)

      const userIdVar = session.variables.find((v) => v.key === 'USER_ID')
      const tokenVar = session.variables.find((v) => v.key === 'TOKEN')

      expect(userIdVar?.value).toBe('123')
      expect(tokenVar?.value).toBe('abc123')
    })
  })

  describe('データ永続化', () => {
    it('データを保存できる', () => {
      const { createSession, saveToStorage } = useSessionStore.getState()

      createSession('保存テスト')
      saveToStorage()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'api-tester-sessions',
        expect.stringContaining('保存テスト')
      )
    })

    it('データを読み込める', () => {
      const mockData = {
        sessions: [
          {
            id: 'test-id',
            name: 'ロードテスト',
            variables: [],
            cookies: [],
            createdAt: '2021-01-01T00:00:00.000Z',
            updatedAt: '2021-01-01T00:00:00.000Z',
            isActive: true
          }
        ],
        activeSessionId: 'test-id',
        sharedVariables: []
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      const { loadFromStorage } = useSessionStore.getState()
      loadFromStorage()

      const state = useSessionStore.getState()
      expect(state.sessions).toHaveLength(1)
      expect(state.sessions[0].name).toBe('ロードテスト')
      expect(state.activeSessionId).toBe('test-id')
    })
  })
})
