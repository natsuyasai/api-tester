import { ElectronAPI } from '@electron-toolkit/preload'
import { OpenDialogOptions, SaveDialogOptions, MessageBoxOptions } from 'electron'

export interface DialogAPI {
  showOpenDialog: (options: OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
  showSaveDialog: (options: SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  showModalMessageBox: (options: MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
}

export interface FileAPI {
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
  writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>
}

export interface Lizard {
  execute: (parameter: LizardParameter) => Promise<boolean>
}

export interface ProxyAPI {
  setProxyConfig: (settings: ProxySettings) => Promise<{
    success: boolean
    message: string
    error?: string
  }>
  getProxyConfig: () => Promise<ProxySettings>
  testProxyConnection: (testUrl?: string) => Promise<{
    success: boolean
    message: string
    responseTime?: number
    ipAddress?: string
    proxyEnabled: boolean
  }>
  getCurrentIpAddress: () => Promise<{
    success: boolean
    ipAddress?: string
    error?: string
    proxyEnabled: boolean
  }>
}

export interface ProxySettings {
  enabled: boolean
  url?: string
  auth?: {
    username: string
    password: string
  }
  bypassList?: string[]
}

export interface ApiExecutor {
  executeRequest: (
    request: unknown,
    variableResolver?: unknown,
    saveToHistory?: boolean
  ) => Promise<{
    success: boolean
    response?: unknown
    error?: string
  }>
  executeRequestWithCancel: (
    request: unknown,
    variableResolver?: unknown,
    saveToHistory?: boolean
  ) => Promise<{
    success: boolean
    response?: unknown
    error?: string
  }>
  validateRequest: (
    request: unknown,
    variableResolver?: unknown
  ) => Promise<{
    success: boolean
    errors?: string[]
    error?: string
  }>
  buildCurlCommand: (
    request: unknown,
    variableResolver?: unknown
  ) => Promise<{
    success: boolean
    curlCommand?: string
    error?: string
  }>
  healthCheck: (url: string) => Promise<{
    success: boolean
    result?: unknown
    error?: string
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dialogAPI: DialogAPI
    fileAPI: FileAPI
    proxyAPI: ProxyAPI
    apiExecutor: ApiExecutor
    lizard: Lizard
  }
}
