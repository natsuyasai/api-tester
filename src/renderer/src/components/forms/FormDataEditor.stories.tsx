import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { KeyValuePair } from '@/types/types'
import { FormDataEditor } from './FormDataEditor'

const meta: Meta<typeof FormDataEditor> = {
  title: 'Components/FormDataEditor',
  component: FormDataEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'テーブル形式とバルク編集の両方をサポートするForm Data/URL Encoded入力エディタ'
      }
    }
  },
  argTypes: {
    data: {
      description: 'キーバリューペアの配列',
      control: 'object'
    },
    onChange: {
      description: 'データ変更時のコールバック',
      action: 'onChange'
    },
    placeholder: {
      description: 'プレースホルダーテキスト',
      control: 'object'
    }
  }
}

export default meta
type Story = StoryObj<typeof FormDataEditor>

// Interactive wrapper component for Storybook
const InteractiveFormDataEditor = (
  props: Omit<React.ComponentProps<typeof FormDataEditor>, 'onChange'>
) => {
  const [data, setData] = useState<KeyValuePair[]>(props.data || [])

  return (
    <div style={{ height: '400px', border: '1px solid var(--color-border-primary)' }}>
      <FormDataEditor {...props} data={data} onChange={setData} />
    </div>
  )
}

export const Empty: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: []
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // デフォルトでテーブルビューが表示されることを確認
    await expect(canvas.getByText('Table')).toBeInTheDocument()
    await expect(canvas.getByText('Key')).toBeInTheDocument()
    await expect(canvas.getByText('Value')).toBeInTheDocument()

    // 空の入力行が表示されることを確認
    await expect(canvas.getByPlaceholderText('Enter key')).toBeInTheDocument()
    await expect(canvas.getByPlaceholderText('Enter value')).toBeInTheDocument()
  }
}

export const WithData: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: [
      { key: 'username', value: 'john_doe', enabled: true },
      { key: 'email', value: 'john@example.com', enabled: true },
      { key: 'age', value: '30', enabled: false },
      { key: 'city', value: 'New York', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // データが表示されることを確認
    await expect(canvas.getByDisplayValue('username')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('john_doe')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('email')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('john@example.com')).toBeInTheDocument()

    // 無効化されたアイテムを確認
    const checkboxes = canvas.getAllByRole('checkbox')
    const ageCheckbox = checkboxes.find((checkbox) =>
      checkbox.getAttribute('aria-label')?.includes('age')
    )
    await expect(ageCheckbox).not.toBeChecked()
  }
}

export const FormDataPlaceholders: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: [],
    placeholder: {
      key: 'Enter field name',
      value: 'Enter field value'
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // カスタムプレースホルダーが表示されることを確認
    await expect(canvas.getByPlaceholderText('Enter field name')).toBeInTheDocument()
    await expect(canvas.getByPlaceholderText('Enter field value')).toBeInTheDocument()
  }
}

export const URLEncodedPlaceholders: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: [],
    placeholder: {
      key: 'Enter parameter name',
      value: 'Enter parameter value'
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // URL Encodedのプレースホルダーが表示されることを確認
    await expect(canvas.getByPlaceholderText('Enter parameter name')).toBeInTheDocument()
    await expect(canvas.getByPlaceholderText('Enter parameter value')).toBeInTheDocument()
  }
}

export const BulkEditMode: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: [
      { key: 'name', value: 'John Doe', enabled: true },
      { key: 'city', value: 'New York', enabled: true }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const user = userEvent.setup()

    // バルク編集モードに切り替え
    const bulkButton = canvas.getByText('Bulk Edit')
    await user.click(bulkButton)

    // バルク編集UIが表示されることを確認
    await expect(
      canvas.getByText('Enter one key-value pair per line in the format: key: value')
    ).toBeInTheDocument()
    await expect(canvas.getByText('Done')).toBeInTheDocument()

    // テキストエリアが表示されることを確認
    const textarea = canvas.getByPlaceholderText(/key1: value1/)
    await expect(textarea).toBeInTheDocument()

    // 既存のデータがテキスト形式で表示されることを確認
    await expect(textarea).toHaveValue('name: John Doe\ncity: New York')
  }
}

export const Interactive: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: [{ key: 'username', value: 'john', enabled: true }]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const user = userEvent.setup()

    // 新しい行を追加
    const keyInputs = canvas.getAllByPlaceholderText('Enter key')
    const emptyKeyInput = keyInputs[keyInputs.length - 1]

    await user.type(emptyKeyInput, 'email')

    // 値を入力
    const valueInputs = canvas.getAllByPlaceholderText('Enter value')
    const emailValueInput = valueInputs[valueInputs.length - 1]

    await user.type(emailValueInput, 'john@example.com')

    // チェックボックスの操作
    const checkboxes = canvas.getAllByRole('checkbox')
    const firstItemCheckbox = checkboxes[1] // 最初はmaster checkbox
    await user.click(firstItemCheckbox)

    // 削除ボタンのテスト
    const removeButtons = canvas.getAllByLabelText(/Remove/)
    if (removeButtons.length > 0) {
      await user.click(removeButtons[0])
    }
  }
}

export const TableToBulkTransition: Story = {
  render: (args) => <InteractiveFormDataEditor {...args} />,
  args: {
    data: []
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const user = userEvent.setup()

    // テーブルモードでデータを入力
    const keyInput = canvas.getByPlaceholderText('Enter key')
    const valueInput = canvas.getByPlaceholderText('Enter value')

    await user.type(keyInput, 'test_key')
    await user.type(valueInput, 'test_value')

    // バルクモードに切り替え
    const bulkButton = canvas.getByText('Bulk Edit')
    await user.click(bulkButton)

    // テーブルで入力したデータがバルクテキストに反映されることを確認
    const textarea = canvas.getByPlaceholderText(/key1: value1/)
    await expect(textarea).toHaveValue('test_key: test_value')

    // バルクモードでデータを追加
    await user.type(textarea, '\nanother_key: another_value')

    // テーブルモードに戻る
    const doneButton = canvas.getByText('Done')
    await user.click(doneButton)

    // テーブルモードでバルクで追加したデータが表示されることを確認
    await expect(canvas.getByDisplayValue('test_key')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('test_value')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('another_key')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('another_value')).toBeInTheDocument()
  }
}
