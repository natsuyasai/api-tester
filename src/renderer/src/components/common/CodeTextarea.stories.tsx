import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { useState } from 'react'
import { CodeTextarea } from './CodeTextarea'

const meta: Meta<typeof CodeTextarea> = {
  title: 'Components/Common/CodeTextarea',
  component: CodeTextarea,
  parameters: {
    layout: 'padded'
  },
  argTypes: {
    onChange: { action: 'changed' },
    onKeyDown: { action: 'keyDown' }
  }
}

export default meta
type Story = StoryObj<typeof CodeTextarea>

// 基本的な使用例
export const Default: Story = {
  args: {
    value: 'function example() {\n  console.log("Hello, World!");\n  return true;\n}',
    placeholder: 'Enter your code here...',
    rows: 10
  },
  render: function RenderComponent(args) {
    const [value, setValue] = useState(args.value)
    return <CodeTextarea {...args} value={value} onChange={setValue} />
  }
}

// 空の状態
export const Empty: Story = {
  args: {
    value: '',
    placeholder:
      'Start typing your code...\nPress Tab for indentation\nPress Shift+Tab to reduce indentation\nPress Esc to blur',
    rows: 8
  },
  render: function RenderComponent(args) {
    const [value, setValue] = useState(args.value)
    return <CodeTextarea {...args} value={value} onChange={setValue} />
  }
}

// JSON編集用
export const JSONEditor: Story = {
  args: {
    value:
      '{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "skills": [\n    "JavaScript",\n    "TypeScript",\n    "React"\n  ]\n}',
    placeholder: 'Enter JSON data...',
    rows: 12
  },
  render: function JSONEditorStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div style={{ maxWidth: '600px' }}>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// スクリプト編集用
export const ScriptEditor: Story = {
  args: {
    value:
      '// Post-script example\nif (getStatus() === 200) {\n  const token = getData("access_token");\n  if (token) {\n    setGlobalVariable("AUTH_TOKEN", token, "認証トークン");\n  }\n  \n  const userId = getData("user.id");\n  if (userId) {\n    setGlobalVariable("USER_ID", String(userId), "ユーザーID");\n  }\n}',
    placeholder: 'Enter your script...',
    rows: 15
  },
  render: function ScriptEditorStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div style={{ maxWidth: '800px' }}>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// 無効状態
export const Disabled: Story = {
  args: {
    value: 'This textarea is disabled\nYou cannot edit this content',
    disabled: true,
    rows: 4
  },
  render: function RenderComponent(args) {
    const [value, setValue] = useState(args.value)
    return <CodeTextarea {...args} value={value} onChange={setValue} />
  }
}

// 読み取り専用
export const ReadOnly: Story = {
  args: {
    value: 'This textarea is read-only\nYou can select and copy this content\nbut cannot modify it',
    readOnly: true,
    rows: 5
  },
  render: function RenderComponent(args) {
    const [value, setValue] = useState(args.value)
    return <CodeTextarea {...args} value={value} onChange={setValue} />
  }
}

// カスタムスタイリング
export const CustomStyling: Story = {
  args: {
    value: 'Custom styled textarea\nwith custom height and styling',
    minHeight: 150,
    maxHeight: 300,
    className: 'custom-textarea'
  },
  render: function CustomStylingStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div>
        <style>{`
          .custom-textarea {
            border: 2px solid #007acc;
            border-radius: 8px;
            background: linear-gradient(135deg, #1e1e1e, #2a2a2a);
          }
        `}</style>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// 行番号表示
export const WithLineNumbers: Story = {
  args: {
    value:
      'function calculateSum(a, b) {\n  return a + b;\n}\n\nconst result = calculateSum(5, 3);\nconsole.log("Result:", result);',
    showLineNumbers: true,
    language: 'javascript',
    rows: 8
  },
  render: function WithLineNumbersStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          機能:
          <br />• 行番号表示
          <br />• JavaScript シンタックスハイライト
          <br />• 通常の編集機能すべて利用可能
        </p>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// アクティブライン ハイライト
export const WithActiveLineHighlight: Story = {
  args: {
    value:
      'const data = {\n  name: "John",\n  age: 30,\n  city: "New York"\n};\n\n// Click on different lines\n// to see active line highlighting',
    showLineNumbers: true,
    highlightActiveLine: true,
    language: 'javascript',
    rows: 10
  },
  render: function WithActiveLineHighlightStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          機能:
          <br />• 行番号表示
          <br />• アクティブライン ハイライト
          <br />• カーソルのある行がハイライトされます
        </p>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// JSON編集（ハイライト付き）
export const JSONEditorWithHighlight: Story = {
  args: {
    value:
      '{\n  "name": "API Response",\n  "status": 200,\n  "data": [\n    {\n      "id": 1,\n      "title": "First Item"\n    },\n    {\n      "id": 2,\n      "title": "Second Item"\n    }\n  ],\n  "timestamp": "2024-01-01T00:00:00Z"\n}',
    showLineNumbers: true,
    language: 'json',
    rows: 15
  },
  render: function JSONEditorWithHighlightStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div style={{ maxWidth: '700px' }}>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          JSON編集エディタ:
          <br />• 行番号表示
          <br />• JSON シンタックスハイライト
          <br />• 文字列、数値、キーワードの色分け
        </p>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// Undo/Redoテスト
export const UndoRedoTest: Story = {
  args: {
    value: 'Type here to test undo/redo functionality',
    placeholder: 'Test undo/redo features',
    rows: 8
  },
  render: function UndoRedoTestStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          テスト手順:
          <br />• テキストを編集してください
          <br />• Ctrl+Z でUndo
          <br />• Ctrl+Y または Ctrl+Shift+Z でRedo
          <br />• 履歴は100件まで保持されます
        </p>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  }
}

// インタラクションテスト
export const InteractionTest: Story = {
  args: {
    value: 'line1\nline2\nline3',
    placeholder: 'Test indentation features',
    rows: 8
  },
  render: function InteractionTestStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          テスト手順:
          <br />• タブキーでインデント挿入
          <br />• Shift+タブキーでインデント削除
          <br />• Escキーでフォーカス解除
          <br />• Ctrl+Z/Ctrl+Y でUndo/Redo
        </p>
        <CodeTextarea {...args} value={value} onChange={setValue} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textarea = canvas.getByRole('textbox')

    // フォーカス
    await userEvent.click(textarea)
    await expect(textarea).toHaveFocus()

    // テキストをクリア
    await userEvent.clear(textarea)

    // テストコードを入力
    await userEvent.type(textarea, 'function test() {')
    await userEvent.keyboard('{Enter}')

    // タブキーでインデント挿入
    await userEvent.keyboard('{Tab}')
    await userEvent.type(textarea, 'console.log("indented");')
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('}')

    // 期待される内容を確認
    await expect(textarea).toHaveValue('function test() {\n  console.log("indented");\n}')
  }
}
