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
        const variables = get().variables.filter((variable) => variable.enabled && variable.key)
        let resolvedText = text

        variables.forEach((variable) => {
          const regex = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g')
          resolvedText = resolvedText.replace(regex, variable.value)
        })

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
