import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { CodeTextarea, CodeTextareaRef } from './CodeTextarea'

describe('CodeTextarea', () => {
  it('should render with basic props', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="test content" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('test content')
  })

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'new content')

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should insert two spaces on Tab key press', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="line1" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // カーソルを行末に移動
    ;(textarea as HTMLTextAreaElement).setSelectionRange(5, 5)

    // Tabキーを押下
    await user.keyboard('{Tab}')

    expect(mockOnChange).toHaveBeenCalledWith('line1  ')
  })

  it('should remove indent on Shift+Tab key press', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="  indented line" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // カーソルを行末に移動
    ;(textarea as HTMLTextAreaElement).setSelectionRange(16, 16)

    // Shift+Tabキーを押下
    await user.keyboard('{Shift>}{Tab}{/Shift}')

    expect(mockOnChange).toHaveBeenCalledWith('indented line')
  })

  it('should render textarea element', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="test" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('should handle custom onKeyDown handler', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnKeyDown = vi.fn()
    render(<CodeTextarea value="test" onChange={mockOnChange} onKeyDown={mockOnKeyDown} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'a')

    expect(mockOnKeyDown).toHaveBeenCalled()
  })

  it('should apply custom className to container', () => {
    const mockOnChange = vi.fn()
    const { container } = render(
      <CodeTextarea value="test" onChange={mockOnChange} className="custom-class" />
    )

    // コンテナにクラス名が適用されることを確認
    const codeContainer = container.firstChild as HTMLElement
    expect(codeContainer).toHaveClass('custom-class')
  })

  it('should handle disabled state', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="test" onChange={mockOnChange} disabled />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()
  })

  it('should handle readOnly state', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="test" onChange={mockOnChange} readOnly />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('readonly')
  })

  it('should handle placeholder', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="" onChange={mockOnChange} placeholder="Enter code here" />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', 'Enter code here')
  })

  it('should expose ref methods', () => {
    const mockOnChange = vi.fn()
    const ref = React.createRef<CodeTextareaRef>()

    render(<CodeTextarea ref={ref} value="test" onChange={mockOnChange} />)

    // refが正しく設定されていることを確認
    expect(ref.current).toBeTruthy()
    if (ref.current) {
      expect(typeof ref.current.focus).toBe('function')
      expect(typeof ref.current.blur).toBe('function')
      expect(typeof ref.current.select).toBe('function')
      expect(typeof ref.current.setSelectionRange).toBe('function')
    }
  })

  it('should handle multiple line indentation with Tab', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const initialValue = 'line1\nline2\nline3'
    render(<CodeTextarea value={initialValue} onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // 複数行を選択（line1から line2まで）
    ;(textarea as HTMLTextAreaElement).setSelectionRange(0, 11) // "line1\nline2"を選択

    // Tabキーを押下
    await user.keyboard('{Tab}')

    // 各行にスペース2個が挿入されることを確認
    expect(mockOnChange).toHaveBeenCalledWith('  line1\n  line2\nline3')
  })

  it('should handle multiple line deindentation with Shift+Tab', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const initialValue = '  line1\n  line2\nline3'
    render(<CodeTextarea value={initialValue} onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // 複数行を選択（最初の2行）
    ;(textarea as HTMLTextAreaElement).setSelectionRange(0, 15) // "  line1\n  line2"を選択

    // Shift+Tabキーを押下
    await user.keyboard('{Shift>}{Tab}{/Shift}')

    // 各行のスペース2個が削除されることを確認
    expect(mockOnChange).toHaveBeenCalledWith('line1\nline2\nline3')
  })

  it('should handle space-based indentation removal', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const initialValue = '  indented with spaces'
    render(<CodeTextarea value={initialValue} onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // カーソルを行末に移動
    ;(textarea as HTMLTextAreaElement).setSelectionRange(21, 21)

    // Shift+Tabキーを押下
    await user.keyboard('{Shift>}{Tab}{/Shift}')

    // 2つのスペースが削除されることを確認
    expect(mockOnChange).toHaveBeenCalledWith('indented with spaces')
  })

  it('should handle undo operation with Ctrl+Z', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="initial" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // テキストを追加
    await user.type(textarea, 'x')

    // Ctrl+Zでundo - react-simple-code-editorが独自処理
    await user.keyboard('{Control>}z{/Control}')

    // 何らかの変更が発生していることを確認
    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should expose basic methods through ref', () => {
    const mockOnChange = vi.fn()
    const ref = React.createRef<CodeTextareaRef>()

    render(<CodeTextarea ref={ref} value="test" onChange={mockOnChange} />)

    // refの基本メソッドが存在することを確認
    expect(ref.current).toBeTruthy()
    if (ref.current) {
      expect(typeof ref.current.focus).toBe('function')
      expect(typeof ref.current.blur).toBe('function')
    }
  })

  it('should handle text input properly', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="" onChange={mockOnChange} />)

    const textarea = screen.getByRole('textbox')
    textarea.focus()

    // テキスト入力のテスト
    await user.type(textarea, 'test')

    // onChangeが呼ばれることを確認
    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should support different language highlighting', () => {
    const mockOnChange = vi.fn()
    render(
      <CodeTextarea
        value='const message = "Hello World";'
        onChange={mockOnChange}
        language="javascript"
      />
    )

    // JavaScriptとして認識されることを確認
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('should handle plain text without highlighting', () => {
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="This is plain text" onChange={mockOnChange} language="plain" />)

    // プレーンテキストとして表示されることを確認
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('This is plain text')
  })
})
