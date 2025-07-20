import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ApiTab, KeyValuePair, HttpMethod, BodyType } from '@/types/types'
import { useTabStore } from './tabStore'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ConfigState {}

interface ConfigActions {
  exportConfig: () => string
  importConfig: (configJson: string) => void
  resetStore: () => void
}

export const useConfigStore = create<ConfigState & ConfigActions>()(
  devtools(
    () => ({
      exportConfig: () => {
        const tabStore = useTabStore.getState()
        const config = {
          tabs: tabStore.tabs.map((tab) => ({
            title: tab.title,
            request: tab.request
          })),
          activeTabId: tabStore.activeTabId,
          version: '1.0'
        }
        return JSON.stringify(config, null, 2)
      },

      importConfig: (configJson: string) => {
        try {
          const config = JSON.parse(configJson) as unknown
          if (
            !config ||
            typeof config !== 'object' ||
            !('tabs' in config) ||
            !Array.isArray((config as { tabs: unknown }).tabs)
          ) {
            throw new Error('Invalid config format')
          }

          const configData = config as { tabs: unknown[] }
          const importedTabs: ApiTab[] = configData.tabs.map((tabData: unknown, index: number) => {
            const tab = tabData as Record<string, unknown>
            const request = (tab.request as Record<string, unknown>) || {}

            return {
              id: uuidv4(),
              title: (tab.title as string) || `Imported ${index + 1}`,
              request: {
                id: uuidv4(),
                name: (request.name as string) || `Imported ${index + 1}`,
                url: (request.url as string) || '',
                method: (request.method as HttpMethod) || 'GET',
                headers: (request.headers as KeyValuePair[]) || [
                  { key: '', value: '', enabled: false }
                ],
                params: (request.params as KeyValuePair[]) || [
                  { key: '', value: '', enabled: false }
                ],
                body: (request.body as string) || '',
                bodyType: (request.bodyType as BodyType) || 'json',
                type: (request.type as 'rest' | 'graphql') || 'rest',
                variables: (request.variables as Record<string, unknown>) || {}
              },
              response: null,
              isActive: false
            }
          })

          if (importedTabs.length > 0) {
            importedTabs[0].isActive = true
            useTabStore.setState({
              tabs: importedTabs,
              activeTabId: importedTabs[0].id
            })
          }
        } catch (error) {
          console.error('Failed to import config:', error)
          throw error
        }
      },

      resetStore: () => {
        const tabStore = useTabStore.getState()
        tabStore.resetTabs()
      }
    }),
    {
      name: 'config-store'
    }
  )
)
