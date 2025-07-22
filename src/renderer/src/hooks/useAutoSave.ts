import { useEffect, useRef, useCallback } from 'react'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { useTabStore } from '@renderer/stores/tabStore'

/**
 * 自動保存機能を管理するカスタムフック
 */
export const useAutoSave = () => {
  const { settings } = useGlobalSettingsStore()
  const { tabs, saveAllTabs } = useTabStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<number>(Date.now())

  // タブの状態を文字列化してハッシュ化する関数
  const getTabsHash = useCallback(() => {
    return JSON.stringify(
      tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        request: tab.request,
        response: tab.response
          ? {
              status: tab.response.status,
              headers: tab.response.headers,
              data: '[Response Data]' // レスポンスデータは文字列化せずに固定メッセージ
            }
          : null
      }))
    )
  }, [tabs])

  const previousTabsHashRef = useRef<string>('')

  // 自動保存を実行する関数
  const performAutoSave = useCallback(() => {
    if (!settings.autoSave) {
      return
    }

    const currentHash = getTabsHash()

    // 前回の保存時と内容が変わっていない場合はスキップ
    if (currentHash === previousTabsHashRef.current) {
      return
    }
    previousTabsHashRef.current = currentHash

    try {
      saveAllTabs()
      previousTabsHashRef.current = currentHash
      lastSaveRef.current = Date.now()

      if (settings.debugLogs) {
        console.log('[AutoSave] Tabs auto-saved at', new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('[AutoSave] Failed to auto-save tabs:', error)
    }
  }, [settings.autoSave, settings.debugLogs, saveAllTabs, getTabsHash])

  // 自動保存タイマーをリセットする関数
  const resetAutoSaveTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (settings.autoSave) {
      timeoutRef.current = setTimeout(() => {
        performAutoSave()
      }, settings.autoSaveInterval * 1000)
    }
  }, [settings.autoSave, settings.autoSaveInterval, performAutoSave])

  // タブの変更を監視して自動保存をトリガー
  useEffect(() => {
    if (!settings.autoSave) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // 即座に自動保存タイマーをリセット
    resetAutoSaveTimer()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [tabs, settings.autoSave, settings.autoSaveInterval, resetAutoSaveTimer])

  // 手動保存用の関数（API経由で呼び出し可能）
  const forceSave = () => {
    performAutoSave()
  }

  // 最後の保存時刻を取得
  const getLastSaveTime = () => {
    return lastSaveRef.current
  }

  // 次回の自動保存までの残り時間（秒）を取得
  const getTimeUntilNextSave = () => {
    if (!settings.autoSave || !timeoutRef.current) {
      return null
    }

    const elapsed = Math.floor((Date.now() - lastSaveRef.current) / 1000)
    const remaining = Math.max(0, settings.autoSaveInterval - elapsed)
    return remaining
  }

  return {
    forceSave,
    getLastSaveTime,
    getTimeUntilNextSave,
    isAutoSaveEnabled: settings.autoSave,
    autoSaveInterval: settings.autoSaveInterval
  }
}
