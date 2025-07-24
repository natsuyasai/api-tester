import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { TabCollectionManager } from './tabCollectionManager'

/**
 * アプリケーション初期化サービス
 * デフォルトフォルダとタブの適切な初期化を保証
 */
export class InitializationService {
  /**
   * アプリケーションの完全な初期化を実行
   * 1. コレクション（フォルダ）の読み込み
   * 2. タブの読み込み
   * 3. デフォルトフォルダにタブが存在することを保証
   */
  static initializeApp(): void {
    try {
      // コレクションストアとタブストアのインスタンスを取得
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // 1. まずコレクション情報を読み込み（デフォルトフォルダ作成含む）
      collectionStore.loadFromStorage()

      // 2. タブ情報を読み込み
      tabStore.loadAllTabs()

      // 3. デフォルトフォルダの取得
      const collections = useCollectionStore.getState().collections
      const defaultCollection = collections.find((c) => !c.parentId) || collections[0]

      if (!defaultCollection) {
        console.error('デフォルトフォルダが見つかりません')
        return
      }

      // 4. デフォルトフォルダにタブが存在するかチェック
      const defaultCollectionTabs = tabStore.getTabsByCollection(defaultCollection.id)

      if (defaultCollectionTabs.length === 0) {
        // デフォルトフォルダにタブが存在しない場合、新しいタブを作成
        TabCollectionManager.createTabInCollection(defaultCollection.id)
      }

      // 5. アクティブなタブが存在しない場合の処理
      const currentTabs = useTabStore.getState().tabs
      const activeTab = currentTabs.find((t) => t.isActive)

      if (!activeTab && currentTabs.length > 0) {
        // 最初のタブをアクティブに設定
        tabStore.setActiveTab(currentTabs[0].id)
      }

      // 6. アクティブなコレクションが設定されていない場合はデフォルトに設定
      const currentActiveCollectionId = useCollectionStore.getState().activeCollectionId
      if (!currentActiveCollectionId) {
        collectionStore.setActiveCollection(defaultCollection.id)
      }

      // 7. TLS設定の初期化
      this.initializeTlsSettings().catch(error => {
        console.error('TLS設定の初期化でエラーが発生:', error)
      })

      console.log('アプリケーション初期化完了:', {
        collections: useCollectionStore.getState().collections.length,
        tabs: useTabStore.getState().tabs.length,
        activeCollection: useCollectionStore.getState().activeCollectionId,
        activeTab: useTabStore.getState().activeTabId
      })
    } catch (error) {
      console.error('アプリケーション初期化中にエラーが発生:', error)

      // エラー時のフォールバック処理
      this.createFallbackState()
    }
  }

  /**
   * エラー時のフォールバック状態を作成
   */
  private static createFallbackState(): void {
    try {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // 強制的にリセット
      tabStore.resetTabs()

      // デフォルトコレクションを確実に作成（初期タブ付き）
      const { collectionId: defaultCollectionId } = TabCollectionManager.createCollectionWithTab(
        'デフォルトフォルダ',
        'デフォルトのリクエスト保存フォルダ'
      )

      collectionStore.setActiveCollection(defaultCollectionId)

      console.log('フォールバック状態を作成しました')
    } catch (fallbackError) {
      console.error('フォールバック状態の作成に失敗:', fallbackError)
    }
  }

  /**
   * TLS設定の初期化
   * アプリケーション起動時に現在のグローバル設定に基づいてTLS設定を適用
   */
  private static async initializeTlsSettings(): Promise<void> {
    try {
      const globalSettings = useGlobalSettingsStore.getState().settings

      if (window.tlsConfigAPI) {
        const result = await window.tlsConfigAPI.updateSettings(globalSettings)
        if (result.success) {
          console.log('Initial TLS settings applied:', result.message)
        } else {
          console.error('Failed to apply initial TLS settings:', result.error)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('TLS settings initialization error:', errorMessage)
    }
  }

  /**
   * 新規フォルダにタブを自動作成
   * フォルダ作成後に呼び出される
   */
  static createTabForNewCollection(collectionId: string): void {
    try {
      const collectionStore = useCollectionStore.getState()
      const tabStore = useTabStore.getState()

      // フォルダの存在確認
      const collection = collectionStore.getCollection(collectionId)
      if (!collection) {
        console.error('指定されたフォルダが存在しません:', collectionId)
        return
      }

      // 既にタブが存在する場合はスキップ
      const existingTabs = tabStore.getTabsByCollection(collectionId)
      if (existingTabs.length > 0) {
        console.log('フォルダには既にタブが存在します:', collection.name)
        return
      }

      // 新しいタブを作成（統一APIを使用）
      const tabId = TabCollectionManager.createTabInCollection(collectionId)

      console.log(`新規フォルダ "${collection.name}" に初期タブを作成しました:`, {
        tabId,
        collectionId
      })
    } catch (error) {
      console.error('新規フォルダのタブ作成中にエラーが発生:', error)
    }
  }

  /**
   * デバッグ用: 現在の状態を出力
   */
  static debugCurrentState(): void {
    const collectionState = useCollectionStore.getState()
    const tabState = useTabStore.getState()

    console.group('現在のアプリケーション状態')
    console.log('コレクション数:', collectionState.collections.length)
    console.log(
      'コレクション:',
      collectionState.collections.map((c) => ({
        id: c.id,
        name: c.name,
        tabsCount: c.tabs?.length || 0,
        activeTab: c.activeTabId
      }))
    )
    console.log('タブ数:', tabState.tabs.length)
    console.log(
      'タブ:',
      tabState.tabs.map((t) => ({
        id: t.id,
        title: t.title,
        isActive: t.isActive,
        collectionId: t.collectionId
      }))
    )
    console.log('アクティブコレクション:', collectionState.activeCollectionId)
    console.log('アクティブタブ:', tabState.activeTabId)
    console.groupEnd()
  }
}
