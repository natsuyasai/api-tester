import { ElectronAPI } from '@electron-toolkit/preload'

export interface DialogAPI {
  showOpenDialog: (options: OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
  showModalMessageBox: (options: MessageBoxOptions) => Promise<Electron.MessageBoxOptions>
}

export interface Lizard {
  execute: (parameter: LizardParameter) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dialogAPI: DialogAPI
    lizard: Lizard
  }
}
