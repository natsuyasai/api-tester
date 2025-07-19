import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { GraphQLVariablesEditor } from './GraphQLVariablesEditor'

const meta: Meta<typeof GraphQLVariablesEditor> = {
  title: 'Components/GraphQLVariablesEditor',
  component: GraphQLVariablesEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'GraphQLクエリ用の変数エディターコンポーネント'
      }
    }
  },
  argTypes: {
    variables: {
      description: 'JSON形式の変数文字列',
      control: 'text'
    },
    onVariablesChange: {
      description: '変数変更時のコールバック',
      action: 'variablesChanged'
    }
  }
}

export default meta
type Story = StoryObj<typeof GraphQLVariablesEditor>

export const Empty: Story = {
  args: {
    variables: '',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // エディターの基本要素が表示されることを確認
    await expect(canvas.getByText('Variables (JSON)')).toBeInTheDocument()
    await expect(canvas.getByRole('textbox')).toBeInTheDocument()
    
    // 空の場合はフォーマットボタンが無効
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await expect(formatButton).toBeDisabled()
  }
}

export const WithValidJSON: Story = {
  args: {
    variables: '{\n  "limit": 10,\n  "offset": 0,\n  "filter": {\n    "status": "active"\n  }\n}',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // 有効なJSONが表示されることを確認
    const textarea = canvas.getByDisplayValue(/\"limit\": 10/)
    await expect(textarea).toBeInTheDocument()
    await expect(textarea).not.toHaveClass('error')
    
    // フォーマットボタンが有効
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await expect(formatButton).not.toBeDisabled()
  }
}

export const WithInvalidJSON: Story = {
  args: {
    variables: '{ invalid: json }',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // 無効なJSONでエラーが表示されることを確認
    const textarea = canvas.getByDisplayValue('{ invalid: json }')
    await expect(textarea).toHaveClass('error')
    await expect(canvas.getByText('Invalid JSON format')).toBeInTheDocument()
  }
}

export const InteractiveEditing: Story = {
  args: {
    variables: '{}',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // テキストエリアに入力
    const textarea = canvas.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, '{"userId": 123, "includeDetails": true}')
    
    // フォーマットボタンをクリック
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await userEvent.click(formatButton)
  }
}

export const ComplexVariables: Story = {
  args: {
    variables: '{\n  "pagination": {\n    "limit": 50,\n    "offset": 0\n  },\n  "filters": {\n    "status": ["active", "pending"],\n    "dateRange": {\n      "start": "2024-01-01",\n      "end": "2024-12-31"\n    }\n  },\n  "sorting": {\n    "field": "createdAt",\n    "direction": "DESC"\n  }\n}',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // 複雑なJSONが適切に表示されることを確認
    await expect(canvas.getByDisplayValue(/\"pagination\":/)).toBeInTheDocument()
    await expect(canvas.getByDisplayValue(/\"filters\":/)).toBeInTheDocument()
    await expect(canvas.getByDisplayValue(/\"sorting\":/)).toBeInTheDocument()
    
    // フォーマットボタンが有効
    const formatButton = canvas.getByRole('button', { name: 'Format' })
    await expect(formatButton).not.toBeDisabled()
  }
}

export const ErrorRecovery: Story = {
  args: {
    variables: '{ "valid": "json" }',
    onVariablesChange: () => {}
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // 最初は有効なJSON
    let textarea = canvas.getByRole('textbox')
    await expect(textarea).not.toHaveClass('error')
    
    // 無効なJSONに変更
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'invalid json')
    
    // エラーが表示される
    await expect(textarea).toHaveClass('error')
    await expect(canvas.getByText('Invalid JSON format')).toBeInTheDocument()
    
    // 再び有効なJSONに修正
    await userEvent.clear(textarea)
    await userEvent.type(textarea, '{"fixed": true}')
    
    // エラーが消える
    textarea = canvas.getByRole('textbox')
    await expect(textarea).not.toHaveClass('error')
    await expect(canvas.queryByText('Invalid JSON format')).not.toBeInTheDocument()
  }
}