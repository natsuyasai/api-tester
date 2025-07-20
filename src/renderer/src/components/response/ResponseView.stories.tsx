import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { ApiResponse } from '@/types/types'
import { useApiStore } from '@renderer/stores/apiStore'
import { ResponseView } from './ResponseView'

// Sample responses are now handled by MSW

const successResponse: ApiResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-remaining': '99'
  },
  data: {
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]
  },
  duration: 150,
  timestamp: '2000-01-01T12:00:00Z'
}

const errorResponse: ApiResponse = {
  status: 404,
  statusText: 'Not Found',
  headers: {
    'content-type': 'application/json'
  },
  data: {
    error: 'User not found',
    message: 'The requested user does not exist'
  },
  duration: 120,
  timestamp: '2000-01-01T12:00:00Z'
}

const textResponse: ApiResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'text/plain'
  },
  data: 'This is a plain text response from the server.',
  duration: 89,
  timestamp: '2000-01-01T12:00:00Z'
}

const meta: Meta<typeof ResponseView> = {
  title: 'Components/ResponseView',
  component: ResponseView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'APIレスポンスを表示するコンポーネント。ステータス、ヘッダー、ボディを表示します。'
      }
    }
  },
  argTypes: {
    tabId: {
      description: 'タブのID',
      control: 'text'
    }
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // タブがない場合は作成
      if (store.tabs.length === 0) {
        store.addTab()
        const activeTab = store.tabs[0]
        store.updateUrl(activeTab.id, 'https://api.example.com/users')
      }

      return (
        <div style={{ width: '100%', height: '500px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof ResponseView>

export const NoResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('No Response')).toBeInTheDocument()
    await expect(canvas.getByText('Send a request to see the response here')).toBeInTheDocument()
  }
}

export const SuccessResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ステータス情報の確認
    await expect(canvas.getByText('200 OK')).toBeInTheDocument()
    await expect(canvas.getByText('150ms')).toBeInTheDocument()

    // タブの確認
    await expect(canvas.getByRole('button', { name: 'Body' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Headers' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Cookies' })).toBeInTheDocument()

    // JSONレスポンスの確認
    await expect(canvas.getByText(/"users":/)).toBeInTheDocument()
  }
}

export const ErrorResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users/999')
      store.setResponse(activeTab.id, errorResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // エラーステータスの確認
    await expect(canvas.getByText('404 Not Found')).toBeInTheDocument()

    // エラーレスポンスの確認
    await expect(canvas.getByText(/"error":/)).toBeInTheDocument()
  }
}

export const TextResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/health')
      store.setResponse(activeTab.id, textResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // テキストレスポンスの確認
    await expect(
      canvas.getByText('This is a plain text response from the server.')
    ).toBeInTheDocument()
  }
}

export const HeadersView: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ヘッダータブをクリック
    const headersTab = canvas.getByRole('button', { name: 'Headers' })
    await userEvent.click(headersTab)

    // ヘッダー情報の確認
    await expect(canvas.getByText('content-type:')).toBeInTheDocument()
    await expect(canvas.getByText('application/json')).toBeInTheDocument()
    await expect(canvas.getByText('x-ratelimit-remaining:')).toBeInTheDocument()
    await expect(canvas.getByText('99')).toBeInTheDocument()
  }
}

export const SlowResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/slow')

      const slowResponse = {
        ...successResponse,
        duration: 2500
      }
      store.setResponse(activeTab.id, slowResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 遅いレスポンス時間の表示確認
    await expect(canvas.getByText('2.50s')).toBeInTheDocument()
  }
}

export const TextSelection: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // レスポンスボディが表示されていることを確認
    const responseBody = canvas.getByText(/"users":/)

    // テキスト選択可能であることを確認（style属性のチェック）
    const preElement = responseBody.closest('pre')
    await expect(preElement).toHaveStyle('user-select: text')
    await expect(preElement).toHaveStyle('cursor: text')
  }
}

export const ActionButtons: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // コピーボタンの存在確認
    const copyButton = canvas.getByTitle('Copy current tab content to clipboard')
    await expect(copyButton).toBeInTheDocument()
    await expect(copyButton).toHaveTextContent('📋 Copy')
    await expect(copyButton).toBeEnabled()

    // エクスポートボタンの存在確認
    const exportButton = canvas.getByTitle('Export response data')
    await expect(exportButton).toBeInTheDocument()
    await expect(exportButton).toHaveTextContent('📄 Export')
    await expect(exportButton).toBeEnabled()
  }
}

export const HeadersTextSelection: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ヘッダータブをクリック
    const headersTab = canvas.getByRole('button', { name: 'Headers' })
    await userEvent.click(headersTab)

    // ヘッダー内容の表示確認
    const headersContent = canvas.getByText('content-type:').closest('div')

    // ヘッダー領域でテキスト選択可能であることを確認
    const headersContainer = headersContent?.parentElement
    await expect(headersContainer).toHaveStyle('user-select: text')
    await expect(headersContainer).toHaveStyle('cursor: text')
  }
}

export const CopyFunctionality: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      if (store.tabs.length === 0) {
        store.addTab()
      }

      const activeTab = store.tabs[0]
      store.updateUrl(activeTab.id, 'https://api.example.com/users')
      store.setResponse(activeTab.id, successResponse)

      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // コピーボタンをクリック（Bodyタブ）
    const copyButton = canvas.getByTitle('Copy current tab content to clipboard')
    await userEvent.click(copyButton)

    // ヘッダータブに切り替えてコピーボタンをクリック
    const headersTab = canvas.getByRole('button', { name: 'Headers' })
    await userEvent.click(headersTab)
    await userEvent.click(copyButton)

    // ボタンが正常に動作することを確認
    await expect(copyButton).toBeEnabled()
  }
}
