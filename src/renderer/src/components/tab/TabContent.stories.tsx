import { useApiStore } from '@renderer/stores/apiStore'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { TabContent } from './TabContent'

const meta: Meta<typeof TabContent> = {
  title: 'Components/TabContent',
  component: TabContent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'アクティブなタブのリクエストフォームとレスポンス表示を含むメインコンテンツエリア'
      }
    }
  },
  argTypes: {
    className: {
      description: 'カスタムCSSクラス',
      control: 'text'
    }
  },
  decorators: [
    (Story) => {
      // ストーリー表示前にストアを初期化
      const store = useApiStore.getState()

      // 新しいタブを追加してサンプルデータを設定
      if (store.tabs.length === 0) {
        store.addTab()
        const activeTab = store.tabs[0]
        store.updateUrl(activeTab.id, 'https://api.example.com/users')
        store.updateTabTitle(activeTab.id, 'API Test')
      }

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof TabContent>

export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // リクエストセクションの確認
    const urlInput = canvas.getByPlaceholderText('Enter request URL')
    await expect(urlInput).toBeInTheDocument()
    await expect(urlInput).toHaveValue('https://api.example.com/users')

    // Sendボタンの確認
    const sendButton = canvas.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeInTheDocument()

    // オプションタブの確認
    await expect(canvas.getByRole('button', { name: 'Params' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Headers' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Body' })).toBeInTheDocument()

    // レスポンスエリアの確認（まだレスポンスはない）
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const NoActiveTab: Story = {
  args: {},
  decorators: [
    (Story) => {
      // すべてのタブを削除
      const store = useApiStore.getState()
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // タブが無い場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

export const WithAPICall: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // このストーリー専用のハンドラーがあれば追加可能
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // リクエストを送信
    const sendButton = canvas.getByRole('button', { name: 'Send' })
    await userEvent.click(sendButton)

    // MSWによるモックレスポンスを待機
    await expect(canvas.getByText('200 OK')).toBeInTheDocument()

    // レスポンスボディの確認
    await expect(canvas.getByText(/"users":/)).toBeInTheDocument()
  }
}

export const POSTRequest: Story = {
  args: {},
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.updateMethod(activeTab.id, 'POST')
      store.updateBody(
        activeTab.id,
        JSON.stringify({ name: 'John Doe', email: 'john@example.com' }, null, 2)
      )

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // POSTメソッドの確認
    await expect(canvas.getByDisplayValue('POST')).toBeInTheDocument()

    // ボディタブをクリック
    const bodyTab = canvas.getByRole('button', { name: 'Body' })
    await userEvent.click(bodyTab)

    // JSONボディの確認
    await expect(canvas.getByDisplayValue(/"name": "John Doe"/)).toBeInTheDocument()

    // リクエストを送信
    const sendButton = canvas.getByRole('button', { name: 'Send' })
    await userEvent.click(sendButton)

    // MSWによる201レスポンスを待機
    await expect(canvas.getByText('201 Created')).toBeInTheDocument()
  }
}

// 他のストーリーは削除して、実用的なものに集約

export const WithCustomClassName: Story = {
  args: {
    className: 'custom-tab-content'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // カスタムクラスが適用されているか確認
    const tabContent = canvas.getByText('No Response').closest('.custom-tab-content')
    await expect(tabContent).toBeInTheDocument()
  }
}

export const ResizableLayout: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'RequestFormとResponseViewの間をマウス操作でリサイズできるGridレイアウト。境界線をドラッグしてgrid-template-rowsが動的に更新されます。'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Gridレイアウトの確認
    const tabContent = canvasElement.querySelector('.tabContent')
    await expect(tabContent).toBeInTheDocument()

    // リサイズハンドルの存在確認
    const resizeHandle = canvasElement.querySelector('.resizeHandle')
    await expect(resizeHandle).toBeInTheDocument()

    // 初期状態の確認
    await expect(canvas.getByPlaceholderText('Enter request URL')).toBeInTheDocument()
    await expect(canvas.getByText('No Response')).toBeInTheDocument()

    // リサイズ機能の説明を表示するため、一時的にフォーカス
    if (resizeHandle) {
      resizeHandle.dispatchEvent(new Event('mouseenter', { bubbles: true }))
    }
  }
}
