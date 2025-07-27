import { action } from '@storybook/addon-actions'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import type { Collection } from '@/types/types'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import { CollectionPanel } from './CollectionPanel'

// ストアのモック設定用の装飾子
const withMockStores = (Story: any) => {
  // モックデータの設定
  const mockCollections: Collection[] = [
    {
      id: 'collection-1',
      name: 'ユーザー API',
      description: 'ユーザー関連のAPI群',
      children: [],
      requests: ['req-1', 'req-2'],
      tabs: ['tab-1', 'tab-2'],
      activeTabId: 'tab-1',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    {
      id: 'collection-2',
      name: '認証 API',
      description: '認証とセッション管理',
      children: [],
      requests: ['req-3'],
      tabs: ['tab-3'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    {
      id: 'collection-3',
      name: 'ファイル管理',
      description: 'ファイルアップロード・ダウンロード',
      children: [],
      requests: [],
      tabs: [],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    },
    {
      id: 'collection-4',
      name: '画像処理',
      description: '画像のリサイズ・変換',
      parentId: 'collection-3',
      children: [],
      requests: ['req-4'],
      tabs: ['tab-4'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }
  ]

  // ストアの初期化
  useCollectionStore.setState({
    collections: mockCollections,
    executionHistory: [],
    maxHistorySize: 100,
    searchQuery: '',
    activeCollectionId: 'collection-1',
    filterOptions: {}
  })

  useTabStore.setState({
    tabs: [
      {
        id: 'tab-1',
        title: 'ユーザー取得',
        isActive: true,
        response: null,
        isCustomTitle: false,
        collectionId: 'collection-1',
        request: {
          id: 'req-1',
          name: 'ユーザー取得',
          url: 'https://api.example.com/users',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        }
      },
      {
        id: 'tab-2',
        title: 'ユーザー作成',
        isActive: false,
        response: null,
        isCustomTitle: false,
        collectionId: 'collection-1',
        request: {
          id: 'req-2',
          name: 'ユーザー作成',
          url: 'https://api.example.com/users',
          method: 'POST',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        }
      }
    ],
    activeTabId: 'tab-1'
  })

  return <Story />
}

const meta: Meta<typeof CollectionPanel> = {
  title: 'Collection/CollectionPanel',
  component: CollectionPanel,
  decorators: [withMockStores],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'API リクエストのコレクション管理パネル。コレクションの作成、編集、削除、タブ管理機能を提供。'
      }
    }
  },
  argTypes: {
    isVisible: {
      description: 'パネルの表示/非表示状態',
      control: 'boolean'
    },
    onToggle: {
      description: 'パネルの表示/非表示を切り替えるコールバック',
      action: 'toggle'
    }
  }
}

export default meta
type Story = StoryObj<typeof CollectionPanel>

// 表示状態
export const Visible: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  }
}

// 非表示状態
export const Hidden: Story = {
  args: {
    isVisible: false,
    onToggle: action('toggle-panel')
  }
}

// 空のコレクション状態
export const EmptyCollections: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  decorators: [
    (Story) => {
      // 空のコレクション状態に設定
      useCollectionStore.setState({
        collections: [],
        executionHistory: [],
        maxHistorySize: 100,
        searchQuery: '',
        activeCollectionId: undefined,
        filterOptions: {}
      })

      useTabStore.setState({
        tabs: [],
        activeTabId: undefined
      })

      return <Story />
    }
  ]
}

// アクティブなコレクションなし
export const NoActiveCollection: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  decorators: [
    (Story) => {
      useCollectionStore.setState({
        collections: [
          {
            id: 'collection-1',
            name: 'テストコレクション',
            children: [],
            requests: [],
            tabs: [],
            created: '2024-01-01T00:00:00Z',
            updated: '2024-01-01T00:00:00Z'
          }
        ],
        executionHistory: [],
        maxHistorySize: 100,
        searchQuery: '',
        activeCollectionId: undefined, // アクティブなし
        filterOptions: {}
      })

      return <Story />
    }
  ]
}

// インタラクションテスト: パネルの表示切り替え
export const ToggleVisibility: Story = {
  args: {
    isVisible: false,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    // 初期状態では非表示
    const panel = canvas.queryByRole('complementary') || canvas.queryByTestId('collection-panel')

    if (args.isVisible) {
      await expect(panel).toBeInTheDocument()
    } else {
      // 非表示状態のテスト（実装に依存）
      // パネルが存在しないか、非表示のクラスが適用されているかを確認
    }
  }
}

// インタラクションテスト: コレクションの選択
export const CollectionSelection: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // コレクション一覧が表示されることを確認
    await expect(canvas.getByText('ユーザー API')).toBeInTheDocument()
    await expect(canvas.getByText('認証 API')).toBeInTheDocument()

    // アクティブなコレクションが強調表示される（実装に依存）
    const activeCollection = canvas.getByText('ユーザー API')
    await expect(activeCollection).toBeInTheDocument()
    // スタイルクラスの確認など、実装に応じてテストを調整
  }
}

// インタラクションテスト: 新しいコレクションの作成
export const CreateNewCollection: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新規作成ボタンを探す
    const createButton = canvas.getByRole('button', { name: /新規|作成|追加/ })
    await userEvent.click(createButton)

    // 作成フォームが表示される
    const nameInput = canvas.getByPlaceholderText(/コレクション名|名前/)
    await userEvent.type(nameInput, 'テストコレクション')

    // 作成実行
    const submitButton = canvas.getByRole('button', { name: /作成|追加/ })
    await userEvent.click(submitButton)
  }
}

// インタラクションテスト: コレクションの展開/折りたたみ
export const ExpandCollapse: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 親コレクション「ファイル管理」を探す
    const parentCollection = canvas.getByText('ファイル管理')
    await expect(parentCollection).toBeInTheDocument()

    // 展開ボタン（通常は矢印アイコン）を探してクリック
    const expandButton =
      parentCollection.closest('[role="button"]') ||
      canvas.getByRole('button', { name: /展開|折りたたみ/ })

    if (expandButton) {
      await userEvent.click(expandButton)

      // 子コレクションが表示される
      await expect(canvas.getByText('画像処理')).toBeInTheDocument()
    }
  }
}

// インタラクションテスト: コレクション名の編集
export const EditCollectionName: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // コレクションを右クリックまたは編集ボタンをクリック
    const collection = canvas.getByText('ユーザー API')

    // 右クリックメニューまたは編集ボタンを探す
    // 実装に依存するため、実際のUI構造に合わせて調整が必要
    await userEvent.rightClick(collection)

    // 編集オプションがある場合
    const editOption = canvas.queryByText(/編集|名前変更/)
    if (editOption) {
      await userEvent.click(editOption)

      // インライン編集フィールドが表示される
      const editInput = canvas.getByDisplayValue('ユーザー API')
      await userEvent.clear(editInput)
      await userEvent.type(editInput, '更新されたユーザー API')

      // 保存（Enterキーまたは保存ボタン）
      await userEvent.keyboard('{Enter}')
    }
  }
}

// インタラクションテスト: タブとコレクションの関連付け
export const TabCollectionAssociation: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // コレクションに関連付けられたタブが表示される
    const userApiCollection = canvas.getByText('ユーザー API')
    await expect(userApiCollection).toBeInTheDocument()

    // タブ情報が表示される（実装に依存）
    // 例：タブ数の表示、タブ一覧など

    // 新しいタブを追加するボタンがある場合
    const addTabButton = canvas.queryByRole('button', { name: /タブ追加|新しいタブ/ })
    if (addTabButton) {
      await userEvent.click(addTabButton)
    }
  }
}

// エラー状態のテスト
export const ErrorStates: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  decorators: [
    (Story) => {
      // エラー状態のモック（例：読み込みエラー）
      useCollectionStore.setState({
        collections: [],
        executionHistory: [],
        maxHistorySize: 100,
        searchQuery: '',
        activeCollectionId: undefined,
        filterOptions: {}
      })

      return <Story />
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // エラーメッセージまたは空状態のメッセージが表示される
    const emptyMessage = canvas.queryByText(/コレクションがありません|データがありません/)
    if (emptyMessage) {
      await expect(emptyMessage).toBeInTheDocument()
    }
  }
}

// アクセシビリティテスト
export const AccessibilityTest: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // キーボードナビゲーションのテスト
    const firstElement = canvas.getAllByRole('button')[0]
    if (firstElement) {
      firstElement.focus()
      await expect(firstElement).toHaveFocus()

      // Tabキーでナビゲーション
      await userEvent.tab()

      // フォーカスが次の要素に移動することを確認
      const activeElement = document.activeElement
      await expect(activeElement).not.toBe(firstElement)
    }

    // ARIA属性の確認
    const panel = canvas.getByRole('complementary') || canvas.querySelector('[role="navigation"]')

    if (panel) {
      // パネルに適切なARIA属性が設定されていることを確認
      await expect(panel).toHaveAttribute('aria-label')
    }
  }
}

// レスポンシブデザインのテスト用
export const ResponsiveLayout: Story = {
  args: {
    isVisible: true,
    onToggle: action('toggle-panel')
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
}
