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

export interface LizardParameter {
  [key: string]: unknown
}

export interface Lizard {
  execute: (parameter: LizardParameter) => Promise<boolean>
}

export interface ProxyAPI {
  setProxyConfig: (settings: ProxySettings) => Promise<{
    success: boolean
    error?: string
  }>
  getProxyConfig: () => Promise<ProxySettings>
  testProxyConnection: (testUrl?: string) => Promise<{
    success: boolean
    error?: string
    responseTime?: number
  }>
  getCurrentIpAddress: () => Promise<{
    success: boolean
    ipAddress?: string
    error?: string
  }>
}

export interface ProxySettings {
  enabled: boolean
  url: string
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

export interface TlsConfigAPI {
  updateSettings: (settings: {
    rejectUnauthorized: boolean
    ca?: string[]
    cert?: string
    key?: string
    ciphers?: string
    minVersion?: string
    maxVersion?: string
  }) => Promise<{
    success: boolean
    error?: string
  }>
  getCurrentSettings: () => Promise<{
    rejectUnauthorized: boolean
    ca?: string[]
    cert?: string
    key?: string
    ciphers?: string
    minVersion?: string
    maxVersion?: string
  }>
  resetSettings: () => Promise<{
    success: boolean
    error?: string
  }>
}

export interface ConfigAPI {
  getMainProcessConfig: () => Promise<unknown>
  updateMainProcessConfig: (config: unknown) => Promise<unknown>
  onConfigChange: (callback: (event: unknown, data: unknown) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dialogAPI: DialogAPI
    fileAPI: FileAPI
    proxyAPI: ProxyAPI
    apiExecutor: ApiExecutor
    tlsConfigAPI: TlsConfigAPI
    configAPI: ConfigAPI
    lizard: Lizard
  }
}
