import { ipcMain, BrowserWindow } from 'electron'
import { MainProcessConfig, getMainProcessConfig } from '../config/defaultConfig'

let currentConfig: MainProcessConfig = getMainProcessConfig()

export function setupConfigHandlers(): void {
  ipcMain.handle('getMainProcessConfig', (): MainProcessConfig => {
    return currentConfig
  })

  ipcMain.handle(
    'updateMainProcessConfig',
    (_event, newConfig: Partial<MainProcessConfig>): MainProcessConfig => {
      const oldConfig = { ...currentConfig }
      currentConfig = { ...currentConfig, ...newConfig }

      // 設定変更を全てのレンダラープロセスに通知
      notifyConfigChange(oldConfig, currentConfig)

      return currentConfig
    }
  )
}

/**
 * 設定変更を全てのレンダラープロセスに通知
 */
function notifyConfigChange(oldConfig: MainProcessConfig, newConfig: MainProcessConfig): void {
  const allWindows = BrowserWindow.getAllWindows()

  allWindows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('mainProcessConfigChanged', {
        oldConfig,
        newConfig,
        timestamp: new Date().toISOString()
      })
    }
  })
}

export function getCurrentMainProcessConfig(): MainProcessConfig {
  return currentConfig
}

/**
 * プログラムから設定を更新（内部使用）
 */
export function updateMainProcessConfig(newConfig: Partial<MainProcessConfig>): MainProcessConfig {
  const oldConfig = { ...currentConfig }
  currentConfig = { ...currentConfig, ...newConfig }

  // 設定変更を通知
  notifyConfigChange(oldConfig, currentConfig)

  return currentConfig
}
