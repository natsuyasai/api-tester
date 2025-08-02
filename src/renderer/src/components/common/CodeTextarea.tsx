import { highlight, languages } from 'prismjs/components/prism-core'
import {
  JSX,
  forwardRef,
  KeyboardEvent,
  useRef,
  useImperativeHandle,
  useState,
  useCallback
} from 'react'
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
  // 新機能用のプロパティ
  showLineNumbers?: boolean
  language?: string // シンタックスハイライト用の言語指定
  highlightActiveLine?: boolean
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
      'data-testid': dataTestId,
      showLineNumbers = false,
      language = 'javascript',
      highlightActiveLine = false,
      ...rest
    },
    ref
  ): JSX.Element => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null)

    // 行番号とハイライト関連の状態
    const [currentLineNumber] = useState(1)

    // 行番号を計算（メモ化）
    const lineCount = useCallback(() => {
      return value.split('\n').length
    }, [value])

    const memoizedLineCount = lineCount()

    // PrismJSハイライト関数
    const highlightWithPrism = useCallback((text: string) => {
      try {
        if (!language || language === 'plain') {
          return text
        }
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const prismLanguage = language === 'javascript' ? languages.javascript : 
                             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                             language === 'json' ? (languages.json || languages.javascript) : 
                             // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                             languages.javascript
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return highlight(text, prismLanguage, language)
      } catch (error) {
        console.warn('Syntax highlighting error:', error)
        return text
      }
    }, [language])

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

    const containerClassName = [
      styles.container,
      showLineNumbers ? styles.containerWithLineNumbers : '',
      className
    ]
      .filter(Boolean)
      .join(' ')

    const editorStyle: React.CSSProperties = {
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      fontSize: '0.9rem',
      lineHeight: 1.5,
      minHeight: minHeight ? `${minHeight}px` : undefined,
      maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      ...(rows && { height: `${rows * 1.5 * 0.9}rem` })
    }

    return (
      <div className={containerClassName}>
        {showLineNumbers && (
          <div className={styles.lineNumbers}>
            {Array.from({ length: memoizedLineCount }, (_, i) => (
              <div
                key={i + 1}
                className={`${styles.lineNumber} ${
                  highlightActiveLine && i + 1 === currentLineNumber ? styles.activeLine : ''
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <div className={styles.editorWrapper}>
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
            className={showLineNumbers ? styles.withLineNumbers : ''}
            id={id}
            data-testid={dataTestId}
            {...rest}
          />
        </div>
      </div>
    )
  }
)

CodeTextarea.displayName = 'CodeTextarea'
