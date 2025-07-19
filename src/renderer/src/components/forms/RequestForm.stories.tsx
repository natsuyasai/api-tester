import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { RequestForm } from './RequestForm'
import { useApiStore } from '@/stores/apiStore'

const mockTab = {
  id: 'tab-1',
  title: 'Test API',
  isActive: true,
  request: {
    id: 'req-1',
    name: 'Test Request',
    url: 'https://api.example.com/users',
    method: 'GET' as const,
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Authorization', value: '', enabled: false }
    ],
    params: [
      { key: 'limit', value: '10', enabled: true },
      { key: 'offset', value: '', enabled: false }
    ],
    body: '',
    bodyType: 'json' as const,
    type: 'rest' as const
  },
  response: null
}

const mockStore = {
  tabs: [mockTab],
  updateUrl: () => {},
  updateMethod: () => {},
  updateBody: () => {},
  updateBodyType: () => {},
  updateTabTitle: () => {},
  setLoading: () => {},
  setResponse: () => {},
  isLoading: false
}

const meta: Meta<typeof RequestForm> = {
  title: 'Components/RequestForm',
  component: RequestForm,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'APIリクエストを設定するフォームコンポーネント。URL、メソッド、ヘッダー、パラメータ、ボディを設定できます。'
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
      ;(useApiStore as any) = () => mockStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof RequestForm>

export const Default: Story = {
  args: {
    tabId: 'tab-1'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // URL入力フィールドの確認
    const urlInput = canvas.getByPlaceholderText('Enter request URL')
    await expect(urlInput).toBeInTheDocument()
    await expect(urlInput).toHaveValue('https://api.example.com/users')
    
    // メソッド選択の確認
    const methodSelect = canvas.getByDisplayValue('GET')
    await expect(methodSelect).toBeInTheDocument()
    
    // Sendボタンの確認
    const sendButton = canvas.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeInTheDocument()
    
    // オプションタブの確認
    await expect(canvas.getByRole('button', { name: 'Params' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Headers' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Body' })).toBeInTheDocument()
  }
}

export const POSTRequest: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const postTab = {
        ...mockTab,
        request: {
          ...mockTab.request,
          method: 'POST' as const,
          body: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}'
        }
      }
      
      const postStore = {
        ...mockStore,
        tabs: [postTab]
      }
      
      ;(useApiStore as any) = () => postStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
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
    
    // ボディ内容の確認
    const bodyTextarea = canvas.getByDisplayValue(/"name": "John Doe"/)
    await expect(bodyTextarea).toBeInTheDocument()
  }
}

export const WithHeaders: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const headerTab = {
        ...mockTab,
        request: {
          ...mockTab.request,
          headers: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Authorization', value: 'Bearer token123', enabled: true },
            { key: 'X-API-Key', value: 'secret-key', enabled: false }
          ]
        }
      }
      
      const headerStore = {
        ...mockStore,
        tabs: [headerTab]
      }
      
      ;(useApiStore as any) = () => headerStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
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
    
    // ヘッダー項目の確認
    await expect(canvas.getByDisplayValue('Content-Type')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('application/json')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('Authorization')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('Bearer token123')).toBeInTheDocument()
    
    // チェックボックスの確認
    const checkboxes = canvas.getAllByRole('checkbox')
    await expect(checkboxes[0]).toBeChecked()
    await expect(checkboxes[1]).toBeChecked()
    await expect(checkboxes[2]).not.toBeChecked()
  }
}

export const WithParams: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const paramTab = {
        ...mockTab,
        request: {
          ...mockTab.request,
          params: [
            { key: 'limit', value: '20', enabled: true },
            { key: 'offset', value: '10', enabled: true },
            { key: 'sort', value: 'name', enabled: false }
          ]
        }
      }
      
      const paramStore = {
        ...mockStore,
        tabs: [paramTab]
      }
      
      ;(useApiStore as any) = () => paramStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // パラメータタブ（デフォルトで選択されている）の確認
    await expect(canvas.getByDisplayValue('limit')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('20')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('offset')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('10')).toBeInTheDocument()
    
    // チェックボックスの確認
    const checkboxes = canvas.getAllByRole('checkbox')
    await expect(checkboxes[0]).toBeChecked()
    await expect(checkboxes[1]).toBeChecked()
    await expect(checkboxes[2]).not.toBeChecked()
  }
}

export const LoadingState: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const loadingStore = {
        ...mockStore,
        isLoading: true
      }
      
      ;(useApiStore as any) = () => loadingStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // ローディング状態のSendボタンの確認
    const sendButton = canvas.getByRole('button', { name: 'Sending...' })
    await expect(sendButton).toBeInTheDocument()
    await expect(sendButton).toBeDisabled()
  }
}

export const EmptyURL: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const emptyTab = {
        ...mockTab,
        request: {
          ...mockTab.request,
          url: ''
        }
      }
      
      const emptyStore = {
        ...mockStore,
        tabs: [emptyTab]
      }
      
      ;(useApiStore as any) = () => emptyStore
      
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // 空のURLの場合、Sendボタンが無効化されることを確認
    const sendButton = canvas.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeDisabled()
  }
}

export const InteractiveExample: Story = {
  args: {
    tabId: 'tab-1'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // URLを変更
    const urlInput = canvas.getByPlaceholderText('Enter request URL')
    await userEvent.clear(urlInput)
    await userEvent.type(urlInput, 'https://jsonplaceholder.typicode.com/posts')
    
    // メソッドをPOSTに変更
    const methodSelect = canvas.getByDisplayValue('GET')
    await userEvent.selectOptions(methodSelect, 'POST')
    
    // ボディタブに移動
    const bodyTab = canvas.getByRole('button', { name: 'Body' })
    await userEvent.click(bodyTab)
    
    // ボディを入力
    const bodyTextarea = canvas.getByPlaceholderText(/Enter JSON body/)
    await userEvent.type(bodyTextarea, '{"title": "Test Post", "body": "This is a test"}')
    
    // ヘッダータブに移動
    const headersTab = canvas.getByRole('button', { name: 'Headers' })
    await userEvent.click(headersTab)
    
    // ヘッダーを追加
    const addHeaderButton = canvas.getByRole('button', { name: /add header/i })
    await userEvent.click(addHeaderButton)
  }
}