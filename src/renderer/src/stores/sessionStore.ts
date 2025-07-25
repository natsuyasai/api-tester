import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { SessionStore, SessionState, SessionVariable, Cookie, ApiResponse } from '@/types/types'
import { showErrorDialog } from '@renderer/utils/errorUtils'

interface SessionActions {
  // セッション管理
  createSession: (name: string) => string
  deleteSession: (sessionId: string) => void
  updateSession: (sessionId: string, updates: Partial<Omit<SessionState, 'id'>>) => void
  setActiveSession: (sessionId?: string) => void
  getActiveSession: () => SessionState | undefined
  getSession: (sessionId: string) => SessionState | undefined
  duplicateSession: (sessionId: string, newName: string) => string

  // セッション変数管理
  addSessionVariable: (sessionId: string, variable?: Partial<SessionVariable>) => string
  updateSessionVariable: (
    sessionId: string,
    variableId: string,
    updates: Partial<Omit<SessionVariable, 'id'>>
  ) => void
  removeSessionVariable: (sessionId: string, variableId: string) => void
  getSessionVariable: (sessionId: string, key: string) => SessionVariable | undefined

  // 共有変数管理
  addSharedVariable: (variable?: Partial<SessionVariable>) => string
  updateSharedVariable: (variableId: string, updates: Partial<Omit<SessionVariable, 'id'>>) => void
  removeSharedVariable: (variableId: string) => void
  getSharedVariable: (key: string) => SessionVariable | undefined

  // セッションCookie管理
  addSessionCookie: (sessionId: string, cookie?: Partial<Cookie>) => string
  updateSessionCookie: (
    sessionId: string,
    cookieId: string,
    updates: Partial<Omit<Cookie, 'id'>>
  ) => void
  removeSessionCookie: (sessionId: string, cookieId: string) => void
  getSessionCookies: (sessionId: string) => Cookie[]

  // レスポンスからの値抽出
  extractFromResponse: (
    sessionId: string,
    response: ApiResponse,
    extractRules: Array<{ key: string; path: string }>
  ) => void

  // 変数解決
  resolveSessionVariables: (text: string, sessionId?: string) => string
  getAllVariables: (sessionId?: string) => Record<string, string>

  // データ永続化
  saveToStorage: () => void
  loadFromStorage: () => void
}

const createDefaultSession = (): SessionState => {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    name: 'デフォルトセッション',
    variables: [],
    cookies: [],
    createdAt: now,
    updatedAt: now,
    isActive: true
  }
}

const initialState: SessionStore = {
  sessions: [createDefaultSession()],
  activeSessionId: undefined,
  sharedVariables: []
}

export const useSessionStore = create<SessionStore & SessionActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // セッション管理
      createSession: (name: string) => {
        const now = new Date().toISOString()
        const newSession: SessionState = {
          id: uuidv4(),
          name,
          variables: [],
          cookies: [],
          createdAt: now,
          updatedAt: now,
          isActive: false
        }

        set(
          (state) => ({
            sessions: [...state.sessions, newSession]
          }),
          false,
          'createSession'
        )

        get().saveToStorage()
        return newSession.id
      },

      deleteSession: (sessionId: string) => {
        set(
          (state) => {
            const updatedSessions = state.sessions.filter((s) => s.id !== sessionId)

            // アクティブセッションを削除した場合は、最初のセッションをアクティブにする
            let newActiveSessionId = state.activeSessionId
            if (state.activeSessionId === sessionId) {
              newActiveSessionId = updatedSessions.length > 0 ? updatedSessions[0].id : undefined
            }

            return {
              sessions: updatedSessions,
              activeSessionId: newActiveSessionId
            }
          },
          false,
          'deleteSession'
        )
        get().saveToStorage()
      },

      updateSession: (sessionId: string, updates: Partial<Omit<SessionState, 'id'>>) => {
        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? { ...session, ...updates, updatedAt: new Date().toISOString() }
                : session
            )
          }),
          false,
          'updateSession'
        )
        get().saveToStorage()
      },

      setActiveSession: (sessionId?: string) => {
        set({ activeSessionId: sessionId }, false, 'setActiveSession')
        get().saveToStorage()
      },

      getActiveSession: () => {
        const state = get()
        return state.activeSessionId
          ? state.sessions.find((s) => s.id === state.activeSessionId)
          : undefined
      },

      getSession: (sessionId: string) => {
        const state = get()
        return state.sessions.find((s) => s.id === sessionId)
      },

      duplicateSession: (sessionId: string, newName: string) => {
        const state = get()
        const originalSession = state.sessions.find((s) => s.id === sessionId)
        if (!originalSession) return ''

        const now = new Date().toISOString()
        const duplicatedSession: SessionState = {
          ...originalSession,
          id: uuidv4(),
          name: newName,
          variables: originalSession.variables.map((v) => ({ ...v, id: uuidv4() })),
          cookies: originalSession.cookies.map((c) => ({ ...c, id: uuidv4() })),
          createdAt: now,
          updatedAt: now,
          isActive: false
        }

        set(
          (state) => ({
            sessions: [...state.sessions, duplicatedSession]
          }),
          false,
          'duplicateSession'
        )

        get().saveToStorage()
        return duplicatedSession.id
      },

      // セッション変数管理
      addSessionVariable: (sessionId: string, variable?: Partial<SessionVariable>) => {
        const now = new Date().toISOString()
        const newVariable: SessionVariable = {
          id: uuidv4(),
          key: variable?.key || '',
          value: variable?.value || '',
          enabled: variable?.enabled ?? true,
          source: variable?.source || 'manual',
          extractPath: variable?.extractPath,
          description: variable?.description || '',
          createdAt: now,
          updatedAt: now
        }

        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    variables: [...session.variables, newVariable],
                    updatedAt: now
                  }
                : session
            )
          }),
          false,
          'addSessionVariable'
        )

        get().saveToStorage()
        return newVariable.id
      },

      updateSessionVariable: (
        sessionId: string,
        variableId: string,
        updates: Partial<Omit<SessionVariable, 'id'>>
      ) => {
        const now = new Date().toISOString()
        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    variables: session.variables.map((variable) =>
                      variable.id === variableId
                        ? { ...variable, ...updates, updatedAt: now }
                        : variable
                    ),
                    updatedAt: now
                  }
                : session
            )
          }),
          false,
          'updateSessionVariable'
        )
        get().saveToStorage()
      },

      removeSessionVariable: (sessionId: string, variableId: string) => {
        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    variables: session.variables.filter((v) => v.id !== variableId),
                    updatedAt: new Date().toISOString()
                  }
                : session
            )
          }),
          false,
          'removeSessionVariable'
        )
        get().saveToStorage()
      },

      getSessionVariable: (sessionId: string, key: string) => {
        const state = get()
        const session = state.sessions.find((s) => s.id === sessionId)
        return session?.variables.find((v) => v.key === key && v.enabled)
      },

      // 共有変数管理
      addSharedVariable: (variable?: Partial<SessionVariable>) => {
        const now = new Date().toISOString()
        const newVariable: SessionVariable = {
          id: uuidv4(),
          key: variable?.key || '',
          value: variable?.value || '',
          enabled: variable?.enabled ?? true,
          source: variable?.source || 'manual',
          extractPath: variable?.extractPath,
          description: variable?.description || '',
          createdAt: now,
          updatedAt: now
        }

        set(
          (state) => ({
            sharedVariables: [...state.sharedVariables, newVariable]
          }),
          false,
          'addSharedVariable'
        )

        get().saveToStorage()
        return newVariable.id
      },

      updateSharedVariable: (variableId: string, updates: Partial<Omit<SessionVariable, 'id'>>) => {
        const now = new Date().toISOString()
        set(
          (state) => ({
            sharedVariables: state.sharedVariables.map((variable) =>
              variable.id === variableId ? { ...variable, ...updates, updatedAt: now } : variable
            )
          }),
          false,
          'updateSharedVariable'
        )
        get().saveToStorage()
      },

      removeSharedVariable: (variableId: string) => {
        set(
          (state) => ({
            sharedVariables: state.sharedVariables.filter((v) => v.id !== variableId)
          }),
          false,
          'removeSharedVariable'
        )
        get().saveToStorage()
      },

      getSharedVariable: (key: string) => {
        const state = get()
        return state.sharedVariables.find((v) => v.key === key && v.enabled)
      },

      // セッションCookie管理
      addSessionCookie: (sessionId: string, cookie?: Partial<Cookie>) => {
        const newCookie: Cookie = {
          id: uuidv4(),
          name: cookie?.name || '',
          value: cookie?.value || '',
          domain: cookie?.domain || '',
          path: cookie?.path || '/',
          enabled: cookie?.enabled ?? true,
          httpOnly: cookie?.httpOnly ?? false,
          secure: cookie?.secure ?? false,
          sameSite: cookie?.sameSite || 'Lax',
          expires: cookie?.expires
        }

        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    cookies: [...session.cookies, newCookie],
                    updatedAt: new Date().toISOString()
                  }
                : session
            )
          }),
          false,
          'addSessionCookie'
        )

        get().saveToStorage()
        return newCookie.id
      },

      updateSessionCookie: (
        sessionId: string,
        cookieId: string,
        updates: Partial<Omit<Cookie, 'id'>>
      ) => {
        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    cookies: session.cookies.map((cookie) =>
                      cookie.id === cookieId ? { ...cookie, ...updates } : cookie
                    ),
                    updatedAt: new Date().toISOString()
                  }
                : session
            )
          }),
          false,
          'updateSessionCookie'
        )
        get().saveToStorage()
      },

      removeSessionCookie: (sessionId: string, cookieId: string) => {
        set(
          (state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    cookies: session.cookies.filter((c) => c.id !== cookieId),
                    updatedAt: new Date().toISOString()
                  }
                : session
            )
          }),
          false,
          'removeSessionCookie'
        )
        get().saveToStorage()
      },

      getSessionCookies: (sessionId: string) => {
        const state = get()
        const session = state.sessions.find((s) => s.id === sessionId)
        return session?.cookies.filter((c) => c.enabled) || []
      },

      // レスポンスからの値抽出（JSON Path）
      extractFromResponse: (
        sessionId: string,
        response: ApiResponse,
        extractRules: Array<{ key: string; path: string }>
      ) => {
        const actions = get()

        extractRules.forEach((rule) => {
          try {
            let value: unknown

            // 簡単なJSON Path実装（$.field, $.field.subfield をサポート）
            if (rule.path.startsWith('$.')) {
              const pathParts = rule.path.substring(2).split('.')
              if (response.data.type === 'json') {
                const jsonData = response.data.data
                value = pathParts.reduce((obj: unknown, key: string) => {
                  if (obj && typeof obj === 'object' && key in obj) {
                    return (obj as Record<string, unknown>)[key]
                  }
                  return undefined
                }, jsonData)
              }
            } else {
              if (response.data.type === 'json') {
                const jsonData = response.data.data
                if (jsonData && typeof jsonData === 'object' && rule.path in jsonData) {
                  value = (jsonData as Record<string, unknown>)[rule.path]
                }
              } else if (response.data.type === 'text') {
                const textData = response.data.data
                if (rule.path === 'data') {
                  value = textData
                }
              }
            }

            if (value !== undefined) {
              const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

              // 既存の変数を更新、存在しない場合は新規作成
              const existingVariable = actions.getSessionVariable(sessionId, rule.key)
              if (existingVariable) {
                actions.updateSessionVariable(sessionId, existingVariable.id, {
                  value: stringValue,
                  source: 'response',
                  extractPath: rule.path
                })
              } else {
                actions.addSessionVariable(sessionId, {
                  key: rule.key,
                  value: stringValue,
                  enabled: true,
                  source: 'response',
                  extractPath: rule.path,
                  description: `Extracted from response: ${rule.path}`
                })
              }
            }
          } catch (error) {
            console.warn(`Failed to extract ${rule.key} from path ${rule.path}:`, error)
          }
        })
      },

      // 変数解決
      resolveSessionVariables: (text: string, sessionId?: string) => {
        const state = get()
        let resolvedText = text

        // セッション変数を解決
        if (sessionId) {
          const session = state.sessions.find((s) => s.id === sessionId)
          if (session) {
            session.variables
              .filter((v) => v.enabled && v.key)
              .forEach((variable) => {
                const regex = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g')
                resolvedText = resolvedText.replace(regex, variable.value)
              })
          }
        }

        // 共有変数を解決
        state.sharedVariables
          .filter((v) => v.enabled && v.key)
          .forEach((variable) => {
            const regex = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g')
            resolvedText = resolvedText.replace(regex, variable.value)
          })

        return resolvedText
      },

      getAllVariables: (sessionId?: string) => {
        const state = get()
        const variables: Record<string, string> = {}

        // 共有変数を追加
        state.sharedVariables
          .filter((v) => v.enabled && v.key)
          .forEach((variable) => {
            variables[variable.key] = variable.value
          })

        // セッション変数を追加（共有変数を上書き）
        if (sessionId) {
          const session = state.sessions.find((s) => s.id === sessionId)
          if (session) {
            session.variables
              .filter((v) => v.enabled && v.key)
              .forEach((variable) => {
                variables[variable.key] = variable.value
              })
          }
        }

        return variables
      },

      // データ永続化
      saveToStorage: () => {
        const state = get()
        try {
          const data = {
            sessions: state.sessions,
            activeSessionId: state.activeSessionId,
            sharedVariables: state.sharedVariables,
            timestamp: Date.now()
          }
          localStorage.setItem('api-tester-sessions', JSON.stringify(data))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          void showErrorDialog(
            'セッション保存エラー',
            'セッション情報の保存中にエラーが発生しました',
            errorMessage
          )
        }
      },

      loadFromStorage: () => {
        try {
          const stored = localStorage.getItem('api-tester-sessions')
          if (stored) {
            const data = JSON.parse(stored) as {
              sessions: SessionState[]
              activeSessionId?: string
              sharedVariables: SessionVariable[]
              timestamp: number
            }

            // 基本的な型チェック
            if (Array.isArray(data.sessions) && Array.isArray(data.sharedVariables)) {
              set(
                {
                  sessions: data.sessions.length > 0 ? data.sessions : [createDefaultSession()],
                  activeSessionId: data.activeSessionId,
                  sharedVariables: data.sharedVariables
                },
                false,
                'loadFromStorage'
              )
            }
          } else {
            // 初回起動時はデフォルトセッションを作成
            const defaultSession = createDefaultSession()
            set(
              {
                sessions: [defaultSession],
                activeSessionId: defaultSession.id,
                sharedVariables: []
              },
              false,
              'loadFromStorage'
            )
            get().saveToStorage()
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          void showErrorDialog(
            'セッション読み込みエラー',
            'セッション情報の読み込み中にエラーが発生しました',
            errorMessage
          )

          // エラー時はデフォルトセッションを作成
          const defaultSession = createDefaultSession()
          set(
            {
              sessions: [defaultSession],
              activeSessionId: defaultSession.id,
              sharedVariables: []
            },
            false,
            'loadFromStorage'
          )
          get().saveToStorage()
        }
      }
    }),
    {
      name: 'session-store'
    }
  )
)
