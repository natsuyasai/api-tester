import { MessageBoxOptions, OpenDialogOptions, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { LizardParameter } from '../types/types'

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
      showModalMessageBox: (options: MessageBoxOptions) =>
        ipcRenderer.invoke('showModalMessageBox', options)
    })
    contextBridge.exposeInMainWorld('lizard', {
      execute: (parameter: LizardParameter) => ipcRenderer.invoke('lizardExecute', parameter)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
