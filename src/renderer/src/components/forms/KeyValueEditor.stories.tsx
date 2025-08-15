import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { KeyValueEditor } from './KeyValueEditor'

const meta: Meta<typeof KeyValueEditor> = {
  title: 'Components/KeyValueEditor',
  component: KeyValueEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'ヘッダーやパラメータのキー・バリューペアを編集するコンポーネント'
      }
    }
  },
  argTypes: {
    tabId: {
      description: 'タブのID',
      control: 'text'
    },
    type: {
      description: 'エディターのタイプ',
      control: { type: 'radio' },
      options: ['headers', 'params']
    },
    items: {
      description: 'キー・バリューペアの配列',
      control: 'object'
    }
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '400px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof KeyValueEditor>

export const HeadersEmpty: Story = {
  args: {
    tabId: 'tab-1',
    type: 'headers',
    items: [{ key: '', value: '', enabled: true }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ヘッダーの確認
    await expect(canvas.getByText('Key')).toBeInTheDocument()
    await expect(canvas.getByText('Value')).toBeInTheDocument()
    await expect(canvas.getByText('Actions')).toBeInTheDocument()

    // 空の入力フィールドの確認
    const keyInput = canvas.getByPlaceholderText('Key')
    const valueInput = canvas.getByPlaceholderText('Value')
    await expect(keyInput).toBeInTheDocument()
    await expect(valueInput).toBeInTheDocument()

    // 追加ボタンの確認
    await expect(canvas.getByRole('button', { name: 'Add Header' })).toBeInTheDocument()
  }
}

export const HeadersWithData: Story = {
  args: {
    tabId: 'tab-1',
    type: 'headers',
    items: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer token123', enabled: true },
      { key: 'X-API-Key', value: 'secret-key', enabled: false },
      { key: 'Accept', value: 'application/json', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ヘッダー値の確認
    await expect(canvas.getByDisplayValue('Content-Type')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('application/json')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('Authorization')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('Bearer token123')).toBeInTheDocument()

    // チェックボックスの状態確認
    const checkboxes = canvas.getAllByRole('checkbox')
    await expect(checkboxes[0]).toBeChecked()
    await expect(checkboxes[1]).toBeChecked()
    await expect(checkboxes[2]).not.toBeChecked()
    await expect(checkboxes[3]).toBeChecked()

    // 削除ボタンの確認
    const removeButtons = canvas.getAllByLabelText('Remove item')
    await expect(removeButtons).toHaveLength(4)
  }
}

export const ParametersEmpty: Story = {
  args: {
    tabId: 'tab-1',
    type: 'params',
    items: [{ key: '', value: '', enabled: true }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // パラメータ用の追加ボタンの確認
    await expect(canvas.getByRole('button', { name: 'Add Parameter' })).toBeInTheDocument()
  }
}

export const ParametersWithData: Story = {
  args: {
    tabId: 'tab-1',
    type: 'params',
    items: [
      { key: 'limit', value: '20', enabled: true },
      { key: 'offset', value: '0', enabled: true },
      { key: 'sort', value: 'name', enabled: false },
      { key: 'filter', value: 'active', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // パラメータ値の確認
    await expect(canvas.getByDisplayValue('limit')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('20')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('offset')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('0')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('sort')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('name')).toBeInTheDocument()

    // 無効化されたフィールドの確認
    const inputs = canvas.getAllByRole('textbox')
    const sortKeyInput = inputs.find((input) => (input as HTMLInputElement).value === 'sort')
    const sortValueInput = inputs.find((input) => (input as HTMLInputElement).value === 'name')

    await expect(sortKeyInput).toBeDisabled()
    await expect(sortValueInput).toBeDisabled()
  }
}

export const InteractiveHeaders: Story = {
  args: {
    tabId: 'tab-1',
    type: 'headers',
    items: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: '', value: '', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいヘッダーを追加
    const addButton = canvas.getByRole('button', { name: 'Add Header' })
    await userEvent.click(addButton)

    // チェックボックスの切り替えテスト
    const checkboxes = canvas.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])

    // 入力フィールドの編集テスト
    const keyInputs = canvas.getAllByPlaceholderText('Key')
    await userEvent.clear(keyInputs[1])
    await userEvent.type(keyInputs[1], 'X-Custom-Header')

    const valueInputs = canvas.getAllByPlaceholderText('Value')
    await userEvent.clear(valueInputs[1])
    await userEvent.type(valueInputs[1], 'custom-value')
  }
}

export const InteractiveParams: Story = {
  args: {
    tabId: 'tab-1',
    type: 'params',
    items: [
      { key: 'page', value: '1', enabled: true },
      { key: '', value: '', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 削除ボタンのテスト
    const removeButtons = canvas.getAllByLabelText('Remove item')
    await userEvent.click(removeButtons[0])

    // 新しいパラメータを追加
    const addButton = canvas.getByRole('button', { name: 'Add Parameter' })
    await userEvent.click(addButton)
  }
}

export const LongValueTruncation: Story = {
  args: {
    tabId: 'tab-1',
    type: 'headers',
    items: [
      {
        key: 'Authorization',
        value:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        enabled: true
      },
      {
        key: 'X-Very-Long-Header-Name-That-Might-Overflow',
        value: 'very-long-header-value-that-might-cause-ui-issues-when-displayed-in-the-interface',
        enabled: true
      }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 長い値が表示されているか確認
    await expect(canvas.getByDisplayValue(/Bearer eyJhbGciOiJIUzI1NiIs/)).toBeInTheDocument()
    await expect(
      canvas.getByDisplayValue('X-Very-Long-Header-Name-That-Might-Overflow')
    ).toBeInTheDocument()
  }
}

export const MixedEnabledDisabled: Story = {
  args: {
    tabId: 'tab-1',
    type: 'headers',
    items: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer token', enabled: false },
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'X-Debug', value: 'true', enabled: false }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 有効・無効のフィールドが適切に表示されているか確認
    const inputs = canvas.getAllByRole('textbox')
    const enabledInputs = inputs.filter((input) => !(input as HTMLInputElement).disabled)
    const disabledInputs = inputs.filter((input) => (input as HTMLInputElement).disabled)

    // 有効なフィールド（Content-Type, Accept）は4つ（キー2つ、値2つ）
    await expect(enabledInputs).toHaveLength(4)
    // 無効なフィールド（Authorization, X-Debug）は4つ（キー2つ、値2つ）
    await expect(disabledInputs).toHaveLength(4)
  }
}

export const WithFileParameters: Story = {
  args: {
    tabId: 'tab-1',
    type: 'params',
    items: [
      { key: 'name', value: 'test', enabled: true },
      {
        key: 'file',
        value: '[File: example.txt]',
        enabled: true,
        isFile: true,
        fileName: 'example.txt',
        fileContent: 'SGVsbG8gV29ybGQ=',
        fileEncoding: 'base64'
      },
      {
        key: 'document',
        value: 'This is file content',
        enabled: true,
        isFile: true,
        fileName: 'document.txt',
        fileContent: 'This is file content',
        fileEncoding: 'binary'
      },
      { key: '', value: '', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ファイル名が表示されているか確認
    await expect(canvas.getByText(/📎 example.txt/)).toBeInTheDocument()
    await expect(canvas.getByText(/📎 document.txt/)).toBeInTheDocument()

    // エンコーディング選択ボックスの確認
    const encodingSelects = canvas.getAllByDisplayValue('base64')
    await expect(encodingSelects).toHaveLength(1)

    const binarySelects = canvas.getAllByDisplayValue('binary')
    await expect(binarySelects).toHaveLength(1)

    // ファイルボタンの確認
    const fileButtons = canvas.getAllByTitle('ファイルを選択')
    await expect(fileButtons).toHaveLength(2) // 通常の入力フィールド用

    // クリアボタンの確認
    const clearButtons = canvas.getAllByTitle('ファイルをクリア')
    await expect(clearButtons).toHaveLength(2)
  }
}

export const FileUploadInteraction: Story = {
  args: {
    tabId: 'tab-1',
    type: 'params',
    items: [
      { key: 'file', value: '', enabled: true },
      { key: '', value: '', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ファイル選択ボタンの確認
    const fileButton = canvas.getAllByTitle('ファイルを選択')[0]
    await expect(fileButton).toBeInTheDocument()
    await expect(fileButton).toBeEnabled()

    // 通常のテキスト入力フィールドの確認
    const valueInput = canvas.getAllByPlaceholderText('Value')[0]
    await expect(valueInput).toBeInTheDocument()
  }
}
