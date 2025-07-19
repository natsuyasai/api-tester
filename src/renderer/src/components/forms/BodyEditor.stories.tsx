import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { BodyEditor } from './BodyEditor'

const meta: Meta<typeof BodyEditor> = {
  title: 'Components/BodyEditor',
  component: BodyEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'APIリクエストのボディを編集するコンポーネント。JSON、Form Data、Raw、GraphQLなど様々な形式に対応'
      }
    }
  },
  argTypes: {
    tabId: {
      description: 'タブのID',
      control: 'text'
    },
    body: {
      description: 'ボディの内容',
      control: 'text'
    },
    bodyType: {
      description: 'ボディのタイプ',
      control: { type: 'select' },
      options: ['json', 'form-data', 'x-www-form-urlencoded', 'raw', 'graphql']
    },
    onBodyChange: {
      description: 'ボディ変更時のコールバック',
      action: 'bodyChanged'
    },
    onBodyTypeChange: {
      description: 'ボディタイプ変更時のコールバック',
      action: 'bodyTypeChanged'
    }
  }
}

export default meta
type Story = StoryObj<typeof BodyEditor>

export const JSONEmpty: Story = {
  args: {
    tabId: 'tab-1',
    body: '',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // JSON選択の確認
    await expect(canvas.getByDisplayValue('JSON')).toBeInTheDocument()

    // JSONモードトグルボタンの確認
    await expect(canvas.getByRole('button', { name: 'JSON' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Raw' })).toBeInTheDocument()

    // フォーマットボタンの確認
    await expect(canvas.getByRole('button', { name: 'Format' })).toBeInTheDocument()

    // テキストエリアの確認
    const textarea = canvas.getByPlaceholderText(/Enter JSON body/)
    await expect(textarea).toBeInTheDocument()
  }
}

export const JSONWithData: Story = {
  args: {
    tabId: 'tab-1',
    body: '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30,\n  "preferences": {\n    "theme": "dark",\n    "notifications": true\n  }\n}',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // JSON内容の確認
    const textarea = canvas.getByDisplayValue(/"name": "John Doe"/)
    await expect(textarea).toBeInTheDocument()

    // フォーマットボタンのテスト
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await userEvent.click(formatButton)
  }
}

export const GraphQLEmpty: Story = {
  args: {
    tabId: 'tab-1',
    body: '',
    bodyType: 'graphql',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // GraphQL選択の確認
    await expect(canvas.getByDisplayValue('GraphQL')).toBeInTheDocument()

    // GraphQL用のプレースホルダー確認
    const textarea = canvas.getByPlaceholderText(/Enter GraphQL query/)
    await expect(textarea).toBeInTheDocument()

    // JSONモードトグルボタンの確認（GraphQLでも表示される）
    await expect(canvas.getByRole('button', { name: 'JSON' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Raw' })).toBeInTheDocument()

    // フォーマットボタンはGraphQLでは表示されない
    expect(canvas.queryByRole('button', { name: 'Format' })).not.toBeInTheDocument()
  }
}

export const GraphQLWithQuery: Story = {
  args: {
    tabId: 'tab-1',
    body: 'query GetUsers($limit: Int) {\n  users(limit: $limit) {\n    id\n    name\n    email\n    createdAt\n  }\n}',
    bodyType: 'graphql',
    variables: { limit: 10, offset: 0 },
    onBodyChange: () => {},
    onBodyTypeChange: () => {},
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // GraphQLクエリの確認
    const textarea = canvas.getByDisplayValue(/query GetUsers/)
    await expect(textarea).toBeInTheDocument()
    
    // 変数エディターの確認
    await expect(canvas.getByText('Variables (JSON)')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue(/\"limit\": 10/)).toBeInTheDocument()
  }
}

export const RawText: Story = {
  args: {
    tabId: 'tab-1',
    body: 'This is raw text data\nWith multiple lines\nAnd special characters: !@#$%^&*()',
    bodyType: 'raw',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Raw選択の確認
    await expect(canvas.getByDisplayValue('Raw')).toBeInTheDocument()

    // Raw用のプレースホルダー確認
    const textarea = canvas.getByPlaceholderText(/Enter raw body/)
    await expect(textarea).toBeInTheDocument()

    // コントロールボタンが表示されないことを確認
    expect(canvas.queryByRole('button', { name: 'JSON' })).not.toBeInTheDocument()
    expect(canvas.queryByRole('button', { name: 'Format' })).not.toBeInTheDocument()
  }
}

export const FormData: Story = {
  args: {
    tabId: 'tab-1',
    body: '',
    bodyType: 'form-data',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Form Data選択の確認
    await expect(canvas.getByDisplayValue('Form Data')).toBeInTheDocument()

    // プレースホルダーメッセージの確認
    await expect(canvas.getByText('Form data editor will be implemented here')).toBeInTheDocument()

    // テキストエリアが表示されないことを確認
    expect(canvas.queryByRole('textbox')).not.toBeInTheDocument()
  }
}

export const URLEncoded: Story = {
  args: {
    tabId: 'tab-1',
    body: '',
    bodyType: 'x-www-form-urlencoded',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // URL Encoded選択の確認
    await expect(canvas.getByDisplayValue('URL Encoded')).toBeInTheDocument()

    // プレースホルダーメッセージの確認
    await expect(canvas.getByText('Form data editor will be implemented here')).toBeInTheDocument()
  }
}

export const InteractiveBodyTypeSwitch: Story = {
  args: {
    tabId: 'tab-1',
    body: '{"test": "data"}',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 最初はJSONが選択されている
    await expect(canvas.getByDisplayValue('JSON')).toBeInTheDocument()

    // GraphQLに切り替え
    const bodyTypeSelect = canvas.getByDisplayValue('JSON')
    await userEvent.selectOptions(bodyTypeSelect, 'graphql')

    // Rawに切り替え
    await userEvent.selectOptions(bodyTypeSelect, 'raw')

    // Form Dataに切り替え
    await userEvent.selectOptions(bodyTypeSelect, 'form-data')
  }
}

export const JSONModeToggle: Story = {
  args: {
    tabId: 'tab-1',
    body: '{"test": "data"}',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 最初はJSONモードが選択されている
    const jsonButton = canvas.getByRole('button', { name: 'JSON' })
    const rawButton = canvas.getByRole('button', { name: 'Raw' })

    await expect(jsonButton).toHaveClass(/active/)

    // Rawモードに切り替え
    await userEvent.click(rawButton)
    await expect(rawButton).toHaveClass(/active/)

    // JSONモードに戻す
    await userEvent.click(jsonButton)
    await expect(jsonButton).toHaveClass(/active/)
  }
}

export const JSONFormatting: Story = {
  args: {
    tabId: 'tab-1',
    body: '{"name":"John","age":30,"city":"New York"}',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 圧縮されたJSONが表示されている
    const textarea = canvas.getByDisplayValue('{"name":"John","age":30,"city":"New York"}')
    await expect(textarea).toBeInTheDocument()

    // フォーマットボタンをクリック
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await userEvent.click(formatButton)
  }
}

export const LongContent: Story = {
  args: {
    tabId: 'tab-1',
    body: JSON.stringify(
      {
        users: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          profile: {
            age: 20 + i,
            interests: [`hobby${i + 1}`, `sport${i + 1}`],
            settings: {
              notifications: true,
              theme: i % 2 === 0 ? 'light' : 'dark'
            }
          }
        }))
      },
      null,
      2
    ),
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 長いJSONコンテンツが表示されている
    const textarea = canvas.getByDisplayValue(/"users":/)
    await expect(textarea).toBeInTheDocument()

    // スクロールが可能な状態であることを確認
    expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight)
  }
}

export const ErrorHandling: Story = {
  args: {
    tabId: 'tab-1',
    body: '{"invalid": json content}',
    bodyType: 'json',
    onBodyChange: () => {},
    onBodyTypeChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 無効なJSONが表示されている
    const textarea = canvas.getByDisplayValue('{"invalid": json content}')
    await expect(textarea).toBeInTheDocument()

    // フォーマットボタンをクリック（エラーが発生するはず）
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await userEvent.click(formatButton)

    // エラーが発生してもアプリケーションがクラッシュしないことを確認
    await expect(textarea).toBeInTheDocument()
  }
}
