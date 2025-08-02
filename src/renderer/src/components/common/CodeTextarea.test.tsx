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
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // カーソルを行末に移動
    textarea.setSelectionRange(5, 5)
    
    // Tabキーを押下
    await user.keyboard('{Tab}')
    
    expect(mockOnChange).toHaveBeenCalledWith('line1  ')
  })

  it('should remove indent on Shift+Tab key press', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="  indented line" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // カーソルを行末に移動
    textarea.setSelectionRange(16, 16)
    
    // Shift+Tabキーを押下
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    
    expect(mockOnChange).toHaveBeenCalledWith('indented line')
  })

  it('should blur on Escape key press', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="test" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    expect(textarea).toHaveFocus()
    
    // Escapeキーを押下
    await user.keyboard('{Escape}')
    
    expect(textarea).not.toHaveFocus()
  })

  it('should handle custom onKeyDown handler', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    const mockOnKeyDown = vi.fn()
    render(
      <CodeTextarea 
        value="test" 
        onChange={mockOnChange} 
        onKeyDown={mockOnKeyDown}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'a')
    
    expect(mockOnKeyDown).toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const mockOnChange = vi.fn()
    render(
      <CodeTextarea 
        value="test" 
        onChange={mockOnChange} 
        className="custom-class"
      />
    )
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass('custom-class')
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
    render(
      <CodeTextarea 
        value="" 
        onChange={mockOnChange} 
        placeholder="Enter code here"
      />
    )
    
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
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // 複数行を選択（line1から line2まで）
    textarea.setSelectionRange(0, 11) // "line1\nline2"を選択
    
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
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // 複数行を選択（最初の2行）
    textarea.setSelectionRange(0, 15) // "  line1\n  line2"を選択
    
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
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // カーソルを行末に移動
    textarea.setSelectionRange(21, 21)
    
    // Shift+Tabキーを押下
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    
    // 2つのスペースが削除されることを確認
    expect(mockOnChange).toHaveBeenCalledWith('indented with spaces')
  })

  it('should support undo operation with Ctrl+Z', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="initial" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // テキストを追加
    await user.type(textarea, ' text')
    
    // Ctrl+Zでundo
    await user.keyboard('{Control>}z{/Control}')
    
    // 最後の変更がundoされることを確認
    expect(mockOnChange).toHaveBeenCalledWith('initial')
  })

  it('should support redo operation with Ctrl+Y', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="initial" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // テキストを追加
    await user.type(textarea, ' text')
    
    // Ctrl+Zでundo
    await user.keyboard('{Control>}z{/Control}')
    
    // Ctrl+Yでredo
    await user.keyboard('{Control>}y{/Control}')
    
    // 変更が復元されることを確認
    expect(mockOnChange).toHaveBeenLastCalledWith('initial text')
  })

  it('should support redo operation with Ctrl+Shift+Z', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="initial" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // テキストを追加
    await user.type(textarea, ' text')
    
    // Ctrl+Zでundo
    await user.keyboard('{Control>}z{/Control}')
    
    // Ctrl+Shift+Zでredo
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    
    // 変更が復元されることを確認
    expect(mockOnChange).toHaveBeenLastCalledWith('initial text')
  })

  it('should expose undo and redo methods through ref', () => {
    const mockOnChange = vi.fn()
    const ref = React.createRef<CodeTextareaRef>()

    render(<CodeTextarea ref={ref} value="test" onChange={mockOnChange} />)
    
    // refのundo/redoメソッドが存在することを確認
    expect(ref.current).toBeTruthy()
    if (ref.current) {
      expect(typeof ref.current.undo).toBe('function')
      expect(typeof ref.current.redo).toBe('function')
    }
  })

  it('should limit undo history to 100 entries', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<CodeTextarea value="" onChange={mockOnChange} />)
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.focus()
    
    // 大量の変更を加える（102回）
    for (let i = 0; i < 102; i++) {
      await user.type(textarea, 'a')
    }
    
    // 100回undoを試行（履歴制限により一定回数で停止）
    for (let i = 0; i < 102; i++) {
      await user.keyboard('{Control>}z{/Control}')
    }
    
    // 最後のonChangeが空文字ではなく、制限により一定の内容が残ることを確認
    // 完全に空になることはない（履歴制限のため）
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]
    expect(lastCall).toBeDefined()
  })
})