import { electronAPI } from '@electron-toolkit/preload'
import { MessageBoxOptions, OpenDialogOptions, SaveDialogOptions, contextBridge, ipcRenderer } from 'electron'

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
  } catch (error) {
    console.error(error)
  }
} else {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.electron = electronAPI
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.api = api
}
