import { highlight, languages } from 'prismjs/components/prism-core'
import { JSX, forwardRef, KeyboardEvent, useRef, useImperativeHandle, useCallback } from 'react'
import Editor from 'react-simple-code-editor'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/themes/prism-dark.css'
import styles from './CodeTextarea.module.scss'

export interface CodeTextareaRef {
  focus: () => void
  blur: () => void
  select?: () => void
  setSelectionRange?: (start: number, end: number) => void
  undo?: () => void
  redo?: () => void
}

interface CodeTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => void
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
  language?: string // シンタックスハイライト用の言語指定
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
      spellCheck: _spellCheck = false,
      id,
      'data-testid': _dataTestId,
      language = 'javascript'
      // restは除外（react-simple-code-editorに不要なpropsを渡さない）
    },
    ref
  ): JSX.Element => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null)

    // PrismJSハイライト関数
    const highlightWithPrism = useCallback(
      (text: string) => {
        try {
          if (!language || language === 'plain') {
            return text
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const prismLanguage =
            language === 'javascript'
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                languages.javascript
              : language === 'json'
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  languages.json || languages.javascript
                : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  languages.javascript

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
          return highlight(text, prismLanguage, language)
        } catch (error) {
          console.warn('Syntax highlighting error:', error)
          return text
        }
      },
      [language]
    )

    useImperativeHandle(
      ref,
      () => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        focus: () => editorRef.current?.textareaRef?.current?.focus(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        blur: () => editorRef.current?.textareaRef?.current?.blur(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        select: () => editorRef.current?.textareaRef?.current?.select?.(),
        setSelectionRange: (start: number, end: number) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          editorRef.current?.textareaRef?.current?.setSelectionRange?.(start, end),
        undo: () => {},
        redo: () => {}
      }),
      []
    )

    // カスタムキーハンドラー
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
      // Escキー押下でフォーカスを外す
      if (e.key === 'Escape') {
        e.preventDefault()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        editorRef.current?.textareaRef?.current?.blur()
        return
      }

      // カスタムのキーハンドラがある場合は実行
      onKeyDown?.(e)
    }

    const containerClassName = [styles.container, className].filter(Boolean).join(' ')

    const editorStyle: React.CSSProperties = {
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      fontSize: '0.9rem',
      lineHeight: 1.5,
      minHeight: minHeight ? `${minHeight}px` : undefined
      // その他のスタイルはreact-simple-code-editorが自動で適用
    }

    return (
      <div className={containerClassName}>
        <Editor
          ref={editorRef}
          value={value}
          onValueChange={onChange}
          highlight={highlightWithPrism}
          padding={16}
          tabSize={2}
          insertSpaces={true}
          style={editorStyle}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onKeyDown={handleKeyDown}
          textareaId={id}
          // data-testidはtextareaIdで代用可能
        />
      </div>
    )
  }
)

CodeTextarea.displayName = 'CodeTextarea'
