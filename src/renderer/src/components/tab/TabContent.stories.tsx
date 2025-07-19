import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { useApiStore } from '@renderer/stores/apiStore'
import { TabContent } from './TabContent'

const mockTab = {
  id: 'tab-1',
  title: 'Test API',
  isActive: true,
  request: {
    id: 'req-1',
    name: 'Test Request',
    url: 'https://api.example.com/users',
    method: 'GET' as const,
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    params: [{ key: 'limit', value: '10', enabled: true }],
    body: '',
    bodyType: 'json' as const,
    type: 'rest' as const
  },
  response: {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json'
    },
    data: {
      users: [{ id: 1, name: 'John Doe' }]
    },
    duration: 150,
    timestamp: '2024-01-01T10:30:00.000Z'
  }
}

const mockStore = {
  tabs: [mockTab],
  activeTabId: 'tab-1',
  isLoading: false,
  updateUrl: () => {},
  updateMethod: () => {},
  updateBody: () => {},
  updateBodyType: () => {},
  updateTabTitle: () => {},
  setLoading: () => {},
  setResponse: () => {}
}

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
      ;(useApiStore as any) = () => mockStore

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

    // レスポンスセクションの確認
    await expect(canvas.getByText('200 OK')).toBeInTheDocument()
    await expect(canvas.getByText(/"users":/)).toBeInTheDocument()
  }
}

export const NoActiveTab: Story = {
  args: {},
  decorators: [
    (Story) => {
      const noTabStore = {
        ...mockStore,
        tabs: [],
        activeTabId: ''
      }
      ;(useApiStore as any) = () => noTabStore

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

export const POSTRequestWithResponse: Story = {
  args: {},
  decorators: [
    (Story) => {
      const postTab = {
        ...mockTab,
        request: {
          ...mockTab.request,
          method: 'POST' as const,
          url: 'https://api.example.com/users',
          body: JSON.stringify(
            {
              name: 'John Doe',
              email: 'john@example.com'
            },
            null,
            2
          )
        },
        response: {
          status: 201,
          statusText: 'Created',
          headers: {
            'content-type': 'application/json',
            location: '/users/123'
          },
          data: {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: '2024-01-01T10:30:00.000Z'
          },
          duration: 230,
          timestamp: '2024-01-01T10:30:00.000Z'
        }
      }

      const postStore = {
        ...mockStore,
        tabs: [postTab]
      }

      ;(useApiStore as any) = () => postStore

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // POSTリクエストの確認
    await expect(canvas.getByDisplayValue('POST')).toBeInTheDocument()

    // ボディタブをクリック
    const bodyTab = canvas.getByRole('button', { name: 'Body' })
    await userEvent.click(bodyTab)

    // JSONボディの確認
    await expect(canvas.getByDisplayValue(/"name": "John Doe"/)).toBeInTheDocument()

    // レスポンス確認
    await expect(canvas.getByText('201 Created')).toBeInTheDocument()
    await expect(canvas.getByText(/"id": 123/)).toBeInTheDocument()
  }
}

export const ErrorResponse: Story = {
  args: {},
  decorators: [
    (Story) => {
      const errorTab = {
        ...mockTab,
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'content-type': 'application/json'
          },
          data: {
            error: 'User not found',
            code: 'NOT_FOUND'
          },
          duration: 89,
          timestamp: '2024-01-01T10:30:00.000Z'
        }
      }

      const errorStore = {
        ...mockStore,
        tabs: [errorTab]
      }

      ;(useApiStore as any) = () => errorStore

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // エラーレスポンスの確認
    await expect(canvas.getByText('404 Not Found')).toBeInTheDocument()
    await expect(canvas.getByText(/"error":/)).toBeInTheDocument()
  }
}

export const LoadingState: Story = {
  args: {},
  decorators: [
    (Story) => {
      const loadingStore = {
        ...mockStore,
        isLoading: true
      }

      ;(useApiStore as any) = () => loadingStore

      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ローディング状態の確認
    const sendButton = canvas.getByRole('button', { name: 'Sending...' })
    await expect(sendButton).toBeInTheDocument()
    await expect(sendButton).toBeDisabled()
  }
}

export const WithCustomClassName: Story = {
  args: {
    className: 'custom-tab-content'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // カスタムクラスが適用されているか確認
    const tabContent = canvas.getByText('200 OK').closest('.custom-tab-content')
    await expect(tabContent).toBeInTheDocument()
  }
}
