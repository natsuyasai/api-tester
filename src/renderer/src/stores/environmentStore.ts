import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Environment, EnvironmentConfig, KeyValuePair } from '@/types/types'
import { useGlobalVariablesStore } from './globalVariablesStore'

interface EnvironmentState extends EnvironmentConfig {
  // 環境管理
  addEnvironment: (name: string) => void
  removeEnvironment: (id: string) => void
  updateEnvironment: (id: string, environment: Partial<Omit<Environment, 'id'>>) => void
  setActiveEnvironment: (id: string | null) => void

  // 変数管理
  addVariable: (environmentId: string) => void
  updateVariable: (environmentId: string, index: number, variable: Partial<KeyValuePair>) => void
  removeVariable: (environmentId: string, index: number) => void

  // 変数の解決
  resolveVariables: (text: string) => string
  getActiveEnvironment: () => Environment | null
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const createDefaultEnvironments = (): Environment[] => [
  {
    id: 'development',
    name: '開発環境',
    variables: [
      { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
      { key: 'apiKey', value: 'dev-api-key-123', enabled: true }
    ]
  },
  {
    id: 'staging',
    name: 'ステージング環境',
    variables: [
      { key: 'baseUrl', value: 'https://staging-api.example.com', enabled: true },
      { key: 'apiKey', value: 'staging-api-key-456', enabled: true }
    ]
  },
  {
    id: 'production',
    name: '本番環境',
    variables: [
      { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
      { key: 'apiKey', value: 'prod-api-key-789', enabled: true }
    ]
  }
]

const initialState: EnvironmentConfig = {
  environments: createDefaultEnvironments(),
  activeEnvironmentId: 'development'
}

export const useEnvironmentStore = create<EnvironmentState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addEnvironment: (name: string) => {
        const newEnvironment: Environment = {
          id: generateId(),
          name,
          variables: [{ key: '', value: '', enabled: false }]
        }
        set(
          (state) => ({
            environments: [...state.environments, newEnvironment]
          }),
          false,
          'addEnvironment'
        )
      },

      removeEnvironment: (id: string) => {
        set(
          (state) => ({
            environments: state.environments.filter((env) => env.id !== id),
            // アクティブな環境が削除された場合は null に設定
            activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId
          }),
          false,
          'removeEnvironment'
        )
      },

      updateEnvironment: (id: string, environmentUpdate: Partial<Omit<Environment, 'id'>>) => {
        set(
          (state) => ({
            environments: state.environments.map((env) =>
              env.id === id ? { ...env, ...environmentUpdate } : env
            )
          }),
          false,
          'updateEnvironment'
        )
      },

      setActiveEnvironment: (id: string | null) => {
        set({ activeEnvironmentId: id }, false, 'setActiveEnvironment')
      },

      addVariable: (environmentId: string) => {
        const newVariable: KeyValuePair = { key: '', value: '', enabled: false }
        set(
          (state) => ({
            environments: state.environments.map((env) =>
              env.id === environmentId
                ? { ...env, variables: [...env.variables, newVariable] }
                : env
            )
          }),
          false,
          'addVariable'
        )
      },

      updateVariable: (
        environmentId: string,
        index: number,
        variableUpdate: Partial<KeyValuePair>
      ) => {
        set(
          (state) => ({
            environments: state.environments.map((env) =>
              env.id === environmentId
                ? {
                    ...env,
                    variables: env.variables.map((variable, i) =>
                      i === index ? { ...variable, ...variableUpdate } : variable
                    )
                  }
                : env
            )
          }),
          false,
          'updateVariable'
        )
      },

      removeVariable: (environmentId: string, index: number) => {
        set(
          (state) => ({
            environments: state.environments.map((env) =>
              env.id === environmentId
                ? { ...env, variables: env.variables.filter((_, i) => i !== index) }
                : env
            )
          }),
          false,
          'removeVariable'
        )
      },

      resolveVariables: (text: string) => {
        let resolvedText = text

        // まずグローバル変数を解決
        const globalVariablesState = useGlobalVariablesStore.getState()
        resolvedText = globalVariablesState.resolveGlobalVariables(resolvedText)

        // 次に環境変数を解決（環境変数が優先される）
        const activeEnv = get().getActiveEnvironment()
        if (activeEnv) {
          const enabledVariables = activeEnv.variables.filter((variable) => variable.enabled)
          enabledVariables.forEach((variable) => {
            const regex = new RegExp(`{{\\s*${variable.key}\\s*}}`, 'g')
            resolvedText = resolvedText.replace(regex, variable.value)
          })
        }

        return resolvedText
      },

      getActiveEnvironment: () => {
        const state = get()
        return state.environments.find((env) => env.id === state.activeEnvironmentId) || null
      }
    }),
    {
      name: 'environment-store'
    }
  )
)
