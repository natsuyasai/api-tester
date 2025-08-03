import { join } from 'path'
import { app, BrowserWindow, screen } from 'electron'
import { NodeFileService } from './nodeFileService'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
  isFullScreen?: boolean
}


/**
 * ウィンドウの状態を保存・復元するサービス
 */
export class WindowStateService {
  private static readonly CONFIG_FILE = 'window-state.json'
  private static configPath: string | null = null

  /**
   * 設定ファイルのパスを取得
   */
  private static getConfigPath(): string {
    if (this.configPath) {
      return this.configPath
    }

    const userDataPath = app.getPath('userData')
    this.configPath = join(userDataPath, this.CONFIG_FILE)
    return this.configPath
  }

  /**
   * デフォルトのウィンドウ設定を取得
   */
  private static getDefaultWindowState(): WindowState {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    return {
      width: Math.min(1200, Math.floor(width * 0.8)),
      height: Math.min(800, Math.floor(height * 0.8)),
      isMaximized: false,
      isFullScreen: false
    }
  }

  /**
   * ウィンドウ状態をファイルから読み込み
   */
  static async loadWindowState(): Promise<WindowState> {
    try {
      const configPath = this.getConfigPath()
      
      if (!(await NodeFileService.fileExists(configPath))) {
        return this.getDefaultWindowState()
      }

      const content = await NodeFileService.processFile(configPath, 'binary')
      const savedState = JSON.parse(content) as Partial<WindowState>

      // 保存された設定を検証
      const defaultState = this.getDefaultWindowState()
      const state: WindowState = {
        width: savedState.width || defaultState.width,
        height: savedState.height || defaultState.height,
        x: savedState.x,
        y: savedState.y,
        isMaximized: savedState.isMaximized || false,
        isFullScreen: savedState.isFullScreen || false
      }

      // ウィンドウが画面外にある場合は位置をリセット
      if (state.x !== undefined && state.y !== undefined) {
        const displays = screen.getAllDisplays()
        const isOnScreen = displays.some(display => {
          const { x, y, width, height } = display.bounds
          return state.x! >= x && state.y! >= y && 
                 state.x! < x + width && state.y! < y + height
        })

        if (!isOnScreen) {
          delete state.x
          delete state.y
        }
      }

      return state
    } catch (error) {
      console.error('ウィンドウ状態の読み込みに失敗:', error)
      return this.getDefaultWindowState()
    }
  }

  /**
   * ウィンドウ状態をファイルに保存
   */
  static async saveWindowState(window: BrowserWindow): Promise<void> {
    try {
      const bounds = window.getBounds()
      const state: WindowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: window.isMaximized(),
        isFullScreen: window.isFullScreen()
      }

      const configPath = this.getConfigPath()
      await NodeFileService.writeTextFile(configPath, JSON.stringify(state, null, 2))
    } catch (error) {
      console.error('ウィンドウ状態の保存に失敗:', error)
    }
  }

  /**
   * ウィンドウの状態変更を監視して自動保存するリスナーを設定
   */
  static setupWindowStateManager(window: BrowserWindow): void {
    let saveTimeout: NodeJS.Timeout | null = null

    const throttledSave = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      saveTimeout = setTimeout(() => {
        this.saveWindowState(window).catch(error => {
          console.error('自動保存に失敗:', error)
        })
      }, 100) // 100msの遅延でスロットリング
    }

    // ウィンドウサイズ・位置変更時
    window.on('resize', throttledSave)
    window.on('move', throttledSave)
    
    // 最大化・最小化状態変更時
    window.on('maximize', throttledSave)
    window.on('unmaximize', throttledSave)
    window.on('enter-full-screen', throttledSave)
    window.on('leave-full-screen', throttledSave)

    // アプリケーション終了時に最終保存
    window.on('close', () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      // 同期的に保存（アプリ終了前に確実に保存）
      this.saveWindowState(window).catch(error => {
        console.error('終了時の保存に失敗:', error)
      })
    })
  }

  /**
   * 保存されたウィンドウ状態を適用
   */
  static async applyWindowState(window: BrowserWindow): Promise<void> {
    try {
      const state = await this.loadWindowState()

      // サイズを設定
      window.setSize(state.width, state.height)

      // 位置を設定（保存されている場合）
      if (state.x !== undefined && state.y !== undefined) {
        window.setPosition(state.x, state.y)
      }

      // ウィンドウが表示されてから状態を復元
      window.once('ready-to-show', () => {
        if (state.isMaximized) {
          window.maximize()
        } else if (state.isFullScreen) {
          window.setFullScreen(true)
        }
      })
    } catch (error) {
      console.error('ウィンドウ状態の適用に失敗:', error)
    }
  }

  /**
   * 設定ファイルを削除（デフォルト状態にリセット）
   */
  static async resetWindowState(): Promise<void> {
    try {
      const configPath = this.getConfigPath()
      
      if (await NodeFileService.fileExists(configPath)) {
        await NodeFileService.deleteFile(configPath)
      }
    } catch (error) {
      console.error('ウィンドウ状態のリセットに失敗:', error)
      throw new Error('ウィンドウ状態のリセットに失敗しました')
    }
  }

  /**
   * 現在の設定情報を取得
   */
  static async getWindowStateInfo(): Promise<{
    configPath: string
    hasConfigFile: boolean
    currentState?: WindowState
  }> {
    try {
      const configPath = this.getConfigPath()
      const hasConfigFile = await NodeFileService.fileExists(configPath)
      
      let currentState: WindowState | undefined
      if (hasConfigFile) {
        currentState = await this.loadWindowState()
      }

      return {
        configPath,
        hasConfigFile,
        currentState
      }
    } catch (error) {
      console.error('ウィンドウ状態情報の取得に失敗:', error)
      const configPath = this.getConfigPath()
      return {
        configPath,
        hasConfigFile: false
      }
    }
  }
}