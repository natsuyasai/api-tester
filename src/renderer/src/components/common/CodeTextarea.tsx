import { JSX, forwardRef, KeyboardEvent, useRef, useImperativeHandle, useState, useCallback, useEffect } from 'react'
import styles from './CodeTextarea.module.scss'

export interface CodeTextareaRef {
  focus: () => void
  blur: () => void
  select: () => void
  setSelectionRange: (start: number, end: number) => void
  undo: () => void
  redo: () => void
}

interface HistoryState {
  value: string
  selectionStart: number
  selectionEnd: number
}

interface CodeTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  rows?: number
  minHeight?: number
  maxHeight?: number
  disabled?: boolean
  readOnly?: boolean
  spellCheck?: boolean
  id?: string
  'data-testid'?: string
}

export const CodeTextarea = forwardRef<CodeTextareaRef, CodeTextareaProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      placeholder,
      className,
      rows = 10,
      minHeight,
      maxHeight,
      disabled = false,
      readOnly = false,
      spellCheck = false,
      id,
      'data-testid': dataTestId,
      ...rest
    },
    ref
  ): JSX.Element => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    
    // Undo/Redo履歴管理
    const [undoStack, setUndoStack] = useState<HistoryState[]>([])
    const [redoStack, setRedoStack] = useState<HistoryState[]>([])
    const [isUndoRedoing, setIsUndoRedoing] = useState(false)
    
    // 履歴に状態を追加
    const addToHistory = useCallback((newValue: string, selectionStart: number, selectionEnd: number) => {
      if (isUndoRedoing) return
      
      const newState: HistoryState = {
        value: newValue,
        selectionStart,
        selectionEnd
      }
      
      setUndoStack(prev => {
        const newStack = [...prev, newState]
        // 履歴数を100に制限
        return newStack.length > 100 ? newStack.slice(-100) : newStack
      })
      
      // 新しい変更があったらredoスタックをクリア
      setRedoStack([])
    }, [isUndoRedoing])
    
    // 初期状態を履歴に追加
    useEffect(() => {
      if (undoStack.length === 0 && value) {
        const textarea = textareaRef.current
        addToHistory(value, textarea?.selectionStart || 0, textarea?.selectionEnd || 0)
      }
    }, [value, undoStack.length, addToHistory])
    
    // Undo操作
    const performUndo = useCallback(() => {
      if (undoStack.length < 2) return
      
      setIsUndoRedoing(true)
      
      const currentState = undoStack[undoStack.length - 1]
      const previousState = undoStack[undoStack.length - 2]
      
      // 現在の状態をredoスタックに追加
      setRedoStack(prev => [...prev, currentState])
      
      // undoスタックから最新状態を削除
      setUndoStack(prev => prev.slice(0, -1))
      
      // 前の状態に復元
      onChange(previousState.value)
      
      setTimeout(() => {
        const textarea = textareaRef.current
        if (textarea) {
          textarea.setSelectionRange(previousState.selectionStart, previousState.selectionEnd)
        }
        setIsUndoRedoing(false)
      }, 0)
    }, [undoStack, onChange])
    
    // Redo操作
    const performRedo = useCallback(() => {
      if (redoStack.length === 0) return
      
      setIsUndoRedoing(true)
      
      const nextState = redoStack[redoStack.length - 1]
      
      // redoスタックから状態を削除
      setRedoStack(prev => prev.slice(0, -1))
      
      // undoスタックに追加
      setUndoStack(prev => [...prev, nextState])
      
      // 状態を復元
      onChange(nextState.value)
      
      setTimeout(() => {
        const textarea = textareaRef.current
        if (textarea) {
          textarea.setSelectionRange(nextState.selectionStart, nextState.selectionEnd)
        }
        setIsUndoRedoing(false)
      }, 0)
    }, [redoStack, onChange])

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      select: () => textareaRef.current?.select(),
      setSelectionRange: (start: number, end: number) =>
        textareaRef.current?.setSelectionRange(start, end),
      undo: performUndo,
      redo: performRedo
    }), [performUndo, performRedo])

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Z (Undo) または Ctrl+Y (Redo)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          performUndo()
          return
        }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault()
          performRedo()
          return
        }
      }

      // Escキー押下でフォーカスを外す（入力状態から抜ける）
      if (e.key === 'Escape') {
        e.preventDefault()
        textareaRef.current?.blur()
        return
      }

      // Tabキー押下でインデント挿入
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentValue = textarea.value
        const beforeSelection = currentValue.substring(0, start)
        const selectedText = currentValue.substring(start, end)
        const afterSelection = currentValue.substring(end)

        if (e.shiftKey) {
          // Shift+Tab: インデントを減らす
          if (start === end) {
            // カーソル位置の行のインデントを減らす
            const lines = beforeSelection.split('\n')
            const currentLine = lines[lines.length - 1]

            if (currentLine.startsWith('  ')) {
              // 2つのスペースを削除
              lines[lines.length - 1] = currentLine.substring(2)
              const newBeforeSelection = lines.join('\n')
              const newValue = newBeforeSelection + afterSelection
              onChange(newValue)

              // カーソル位置を調整
              setTimeout(() => {
                const newCursorPos = newBeforeSelection.length
                textarea.setSelectionRange(newCursorPos, newCursorPos)
              }, 0)
            } else if (currentLine.startsWith('\t')) {
              // タブを削除（後方互換性のため）
              lines[lines.length - 1] = currentLine.substring(1)
              const newBeforeSelection = lines.join('\n')
              const newValue = newBeforeSelection + afterSelection
              onChange(newValue)

              // カーソル位置を調整
              setTimeout(() => {
                const newCursorPos = newBeforeSelection.length
                textarea.setSelectionRange(newCursorPos, newCursorPos)
              }, 0)
            }
          } else {
            // 選択範囲の各行のインデントを減らす
            const allLines = currentValue.split('\n')
            const startLineIndex = beforeSelection.split('\n').length - 1
            const endLineIndex = (beforeSelection + selectedText).split('\n').length - 1

            let removedChars = 0
            for (let i = startLineIndex; i <= endLineIndex; i++) {
              const line = allLines[i]
              if (line.startsWith('  ')) {
                allLines[i] = line.substring(2)
                removedChars += 2
              } else if (line.startsWith('\t')) {
                allLines[i] = line.substring(1)
                removedChars += 1
              }
            }

            const newValue = allLines.join('\n')
            onChange(newValue)

            // 選択範囲を調整
            setTimeout(() => {
              textarea.setSelectionRange(start, end - removedChars)
            }, 0)
          }
        } else {
          // Tab: インデント挿入（スペース2個）
          if (start === end) {
            // カーソル位置にスペース2個を挿入
            const newValue = beforeSelection + '  ' + afterSelection
            onChange(newValue)

            // カーソル位置を調整
            setTimeout(() => {
              const newCursorPos = start + 2
              textarea.setSelectionRange(newCursorPos, newCursorPos)
            }, 0)
          } else {
            // 選択範囲の各行にスペース2個を追加
            const allLines = currentValue.split('\n')
            const startLineIndex = beforeSelection.split('\n').length - 1
            const endLineIndex = (beforeSelection + selectedText).split('\n').length - 1

            let addedChars = 0
            for (let i = startLineIndex; i <= endLineIndex; i++) {
              allLines[i] = '  ' + allLines[i]
              addedChars += 2
            }

            const newValue = allLines.join('\n')
            onChange(newValue)

            // 選択範囲を調整
            setTimeout(() => {
              textarea.setSelectionRange(start + 2, end + addedChars)
            }, 0)
          }
        }
        return
      }

      // カスタムのキーハンドラがある場合は実行
      onKeyDown?.(e)
    }

    // テキスト変更時のハンドラ
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const textarea = e.target
      
      // 履歴に追加（現在の状態を記録）
      if (!isUndoRedoing) {
        addToHistory(value, textarea.selectionStart, textarea.selectionEnd)
      }
      
      onChange(newValue)
    }

    const combinedClassName = [styles.textarea, className].filter(Boolean).join(' ')

    const style: React.CSSProperties = {}
    if (minHeight) style.minHeight = `${minHeight}px`
    if (maxHeight) style.maxHeight = `${maxHeight}px`

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={combinedClassName}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        spellCheck={spellCheck}
        id={id}
        data-testid={dataTestId}
        style={style}
        {...rest}
      />
    )
  }
)

CodeTextarea.displayName = 'CodeTextarea'
