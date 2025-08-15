import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { RequestForm } from './RequestForm'

const meta: Meta<typeof RequestForm> = {
  title: 'Components/RequestForm',
  component: RequestForm,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'APIリクエストを設定するフォームコンポーネント。URL、メソッド、ヘッダー、パラメータ、ボディを設定できます。'
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
    tabId: 'sample-tab-1'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // URL入力フィールドの確認
    const urlInput = canvas.getByPlaceholderText('Enter request URL')
    await expect(urlInput).toBeInTheDocument()

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
    tabId: 'sample-tab-2'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '600px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // メソッド選択を確認
    const methodSelect = canvas.getByDisplayValue('GET')
    await expect(methodSelect).toBeInTheDocument()

    // POSTに変更
    await userEvent.selectOptions(methodSelect, 'POST')
    await expect(canvas.getByDisplayValue('POST')).toBeInTheDocument()

    // ボディタブをクリック
    const bodyTab = canvas.getByRole('button', { name: 'Body' })
    await userEvent.click(bodyTab)

    // ボディエリアが表示されることを確認
    const bodyTextarea = canvas.getByPlaceholderText(/Enter JSON body/)
    await expect(bodyTextarea).toBeInTheDocument()
  }
}

export const InteractiveExample: Story = {
  args: {
    tabId: 'sample-tab-3'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // URLを変更
    const urlInput = canvas.getByPlaceholderText('Enter request URL')
    await userEvent.clear(urlInput)
    await userEvent.type(urlInput, 'https://api.example.com/posts')

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

// その他の複雑なストーリーは削除し、実用的なものに集約
