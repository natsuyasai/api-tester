import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { ResponseView } from './ResponseView'
import { useApiStore } from '@/stores/apiStore'
import { ApiResponse } from '@/types/types'

const successResponse: ApiResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-remaining': '99',
    'cache-control': 'no-cache'
  },
  data: {
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    total: 2,
    page: 1
  },
  duration: 150,
  timestamp: '2024-01-01T10:30:00.000Z'
}

const errorResponse: ApiResponse = {
  status: 404,
  statusText: 'Not Found',
  headers: {
    'content-type': 'application/json'
  },
  data: {
    error: 'Resource not found',
    code: 'NOT_FOUND'
  },
  duration: 89,
  timestamp: '2024-01-01T10:30:00.000Z'
}

const textResponse: ApiResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'text/plain'
  },
  data: 'This is a plain text response from the server.',
  duration: 75,
  timestamp: '2024-01-01T10:30:00.000Z'
}

const meta: Meta<typeof ResponseView> = {
  title: 'Components/ResponseView',
  component: ResponseView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'APIレスポンスを表示するコンポーネント。ステータス、ヘッダー、ボディを表示します。'
      }
    }
  },
  argTypes: {
    tabId: {
      description: 'タブのID',
      control: 'text'
    }
  }
}

export default meta
type Story = StoryObj<typeof ResponseView>

export const NoResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const storeWithoutResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: '',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: null
        }]
      }
      ;(useApiStore as any) = () => storeWithoutResponse
      
      return (
        <div style={{ width: '100%', height: '400px' }}>
          <Story />
        </div>
      )
    }
  ],
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
      const storeWithResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com/users',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: successResponse
        }]
      }
      ;(useApiStore as any) = () => storeWithResponse
      
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
      const storeWithErrorResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com/users/999',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: errorResponse
        }]
      }
      ;(useApiStore as any) = () => storeWithErrorResponse
      
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
      const storeWithTextResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com/health',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: textResponse
        }]
      }
      ;(useApiStore as any) = () => storeWithTextResponse
      
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
    await expect(canvas.getByText('This is a plain text response from the server.')).toBeInTheDocument()
  }
}

export const HeadersView: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      const storeWithResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com/users',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: successResponse
        }]
      }
      ;(useApiStore as any) = () => storeWithResponse
      
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
      const slowResponse = {
        ...successResponse,
        duration: 2500
      }
      
      const storeWithSlowResponse = {
        tabs: [{
          id: 'tab-1',
          title: 'Test Tab',
          isActive: true,
          request: {
            id: 'req-1',
            name: 'Test Request',
            url: 'https://api.example.com/slow',
            method: 'GET' as const,
            headers: [],
            params: [],
            body: '',
            bodyType: 'json' as const,
            type: 'rest' as const
          },
          response: slowResponse
        }]
      }
      ;(useApiStore as any) = () => storeWithSlowResponse
      
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