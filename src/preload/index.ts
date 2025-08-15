import { ElectronAPI, electronAPI } from '@electron-toolkit/preload'
import {
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
  contextBridge,
  ipcRenderer
} from 'electron'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('dialogAPI', {
      showOpenDialog: (options: OpenDialogOptions) => ipcRenderer.invoke('showOpenDialog', options),
      showSaveDialog: (options: SaveDialogOptions) => ipcRenderer.invoke('showSaveDialog', options),
      showModalMessageBox: (options: MessageBoxOptions) =>
        ipcRenderer.invoke('showModalMessageBox', options)
    })
    contextBridge.exposeInMainWorld('fileAPI', {
      readFile: (filePath: string) => ipcRenderer.invoke('readFile', filePath),
      writeFile: (filePath: string, data: string) => ipcRenderer.invoke('writeFile', filePath, data)
    })
    contextBridge.exposeInMainWorld('proxyAPI', {
      setProxyConfig: (settings: unknown) => ipcRenderer.invoke('setProxyConfig', settings),
      getProxyConfig: () => ipcRenderer.invoke('getProxyConfig'),
      testProxyConnection: (testUrl?: string) => ipcRenderer.invoke('testProxyConnection', testUrl),
      getCurrentIpAddress: () => ipcRenderer.invoke('getCurrentIpAddress')
    })
    contextBridge.exposeInMainWorld('apiExecutor', {
      executeRequest: (request: unknown, variableResolver?: unknown, saveToHistory?: boolean) =>
        ipcRenderer.invoke('executeApiRequest', request, variableResolver, saveToHistory),
      executeRequestWithCancel: (
        request: unknown,
        variableResolver?: unknown,
        saveToHistory?: boolean
      ) =>
        ipcRenderer.invoke('executeApiRequestWithCancel', request, variableResolver, saveToHistory),
      validateRequest: (request: unknown, variableResolver?: unknown) =>
        ipcRenderer.invoke('validateApiRequest', request, variableResolver),
      buildCurlCommand: (request: unknown, variableResolver?: unknown) =>
        ipcRenderer.invoke('buildCurlCommand', request, variableResolver),
      healthCheck: (url: string) => ipcRenderer.invoke('healthCheck', url)
    })
    contextBridge.exposeInMainWorld('tlsConfigAPI', {
      updateSettings: (settings: unknown) => ipcRenderer.invoke('tls-config:update', settings),
      getCurrentSettings: () => ipcRenderer.invoke('tls-config:get-current'),
      resetSettings: () => ipcRenderer.invoke('tls-config:reset')
    })
    contextBridge.exposeInMainWorld('configAPI', {
      getMainProcessConfig: () => ipcRenderer.invoke('getMainProcessConfig'),
      updateMainProcessConfig: (config: unknown) =>
        ipcRenderer.invoke('updateMainProcessConfig', config),
      onConfigChange: (callback: (event: unknown, data: unknown) => void) => {
        ipcRenderer.on('mainProcessConfigChanged', callback)
        return () => ipcRenderer.off('mainProcessConfigChanged', callback)
      }
    })
    contextBridge.exposeInMainWorld('executionHistoryAPI', {
      onHistoryEntry: (callback: (event: unknown, historyEntry: unknown) => void) => {
        ipcRenderer.on('api-execution-history', callback)
        return () => ipcRenderer.off('api-execution-history', callback)
      }
    })
    contextBridge.exposeInMainWorld('windowAPI', {
      getStateInfo: () => ipcRenderer.invoke('window:getStateInfo'),
      resetState: () => ipcRenderer.invoke('window:resetState')
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: object
    executionHistoryAPI: {
      onHistoryEntry: (callback: (event: unknown, historyEntry: unknown) => void) => () => void
    }
    windowAPI: {
      getStateInfo: () => Promise<unknown>
      resetState: () => Promise<{ success: boolean }>
    }
  }
}
