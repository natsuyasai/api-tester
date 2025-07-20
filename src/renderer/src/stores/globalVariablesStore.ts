import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { GlobalVariable, GlobalVariablesConfig } from '@/types/types'

interface GlobalVariablesState extends GlobalVariablesConfig {
  // 変数管理
  addVariable: () => void
  updateVariable: (id: string, variable: Partial<Omit<GlobalVariable, 'id'>>) => void
  removeVariable: (id: string) => void

  // 変数の解決
  resolveGlobalVariables: (text: string) => string
  resolveDynamicVariables: (text: string) => string
  getVariableByKey: (key: string) => GlobalVariable | null
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const createDefaultGlobalVariables = (): GlobalVariable[] => [
  {
    id: 'global-1',
    key: 'baseUrl',
    value: 'https://api.example.com',
    enabled: true,
    description: 'API のベース URL'
  },
  {
    id: 'global-2',
    key: 'version',
    value: 'v1',
    enabled: true,
    description: 'API バージョン'
  },
  {
    id: 'global-3',
    key: 'apiKey',
    value: 'your-api-key-here',
    enabled: false,
    description: '共通 API キー'
  }
]

const initialState: GlobalVariablesConfig = {
  variables: createDefaultGlobalVariables()
}

export const useGlobalVariablesStore = create<GlobalVariablesState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addVariable: () => {
        const newVariable: GlobalVariable = {
          id: generateId(),
          key: '',
          value: '',
          enabled: false,
          description: ''
        }
        set(
          (state) => ({
            variables: [...state.variables, newVariable]
          }),
          false,
          'addVariable'
        )
      },

      updateVariable: (id: string, variableUpdate: Partial<Omit<GlobalVariable, 'id'>>) => {
        set(
          (state) => ({
            variables: state.variables.map((variable) =>
              variable.id === id ? { ...variable, ...variableUpdate } : variable
            )
          }),
          false,
          'updateVariable'
        )
      },

      removeVariable: (id: string) => {
        set(
          (state) => ({
            variables: state.variables.filter((variable) => variable.id !== id)
          }),
          false,
          'removeVariable'
        )
      },

      resolveGlobalVariables: (text: string) => {
        let resolvedText = text

        // 動的変数を先に解決
        resolvedText = get().resolveDynamicVariables(resolvedText)

        // 次にグローバル変数を解決
        const variables = get().variables.filter((variable) => variable.enabled && variable.key)

        variables.forEach((variable) => {
          const regex = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g')
          resolvedText = resolvedText.replace(regex, variable.value)
        })

        return resolvedText
      },

      // 動的変数の解決
      resolveDynamicVariables: (text: string) => {
        let resolvedText = text

        // タイムスタンプ（UNIXエポック秒）
        resolvedText = resolvedText.replace(/{{\s*\$timestamp\s*}}/g, () => {
          return Math.floor(Date.now() / 1000).toString()
        })

        // タイムスタンプ（ミリ秒）
        resolvedText = resolvedText.replace(/{{\s*\$timestampMs\s*}}/g, () => {
          return Date.now().toString()
        })

        // ISO8601形式の日時
        resolvedText = resolvedText.replace(/{{\s*\$isoTimestamp\s*}}/g, () => {
          return new Date().toISOString()
        })

        // UUID v4
        resolvedText = resolvedText.replace(/{{\s*\$uuid\s*}}/g, () => {
          return crypto.randomUUID()
        })

        // ランダム整数（0-999）
        resolvedText = resolvedText.replace(/{{\s*\$randomInt\s*}}/g, () => {
          return Math.floor(Math.random() * 1000).toString()
        })

        // ランダム整数（カスタム範囲）
        resolvedText = resolvedText.replace(
          /{{\s*\$randomInt\((\d+),(\d+)\)\s*}}/g,
          (_, min: string, max: string) => {
            const minNum = parseInt(min, 10)
            const maxNum = parseInt(max, 10)
            return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum).toString()
          }
        )

        // ランダム文字列（英数字、8文字）
        resolvedText = resolvedText.replace(/{{\s*\$randomString\s*}}/g, () => {
          return Math.random().toString(36).substring(2, 10)
        })

        // ランダム文字列（カスタム長）
        resolvedText = resolvedText.replace(
          /{{\s*\$randomString\((\d+)\)\s*}}/g,
          (_, length: string) => {
            const len = parseInt(length, 10)
            let result = ''
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            for (let i = 0; i < len; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return result
          }
        )

        return resolvedText
      },

      getVariableByKey: (key: string) => {
        const state = get()
        return state.variables.find((variable) => variable.key === key && variable.enabled) || null
      }
    }),
    {
      name: 'global-variables-store'
    }
  )
)
