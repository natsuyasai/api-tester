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

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dialogAPI: DialogAPI
    fileAPI: FileAPI
    lizard: Lizard
  }
}
