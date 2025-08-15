import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GraphQLVariablesEditor } from './GraphQLVariablesEditor'

describe('GraphQLVariablesEditor', () => {
  const defaultProps = {
    variables: '{}',
    onVariablesChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render variables editor with textarea', () => {
    render(<GraphQLVariablesEditor {...defaultProps} />)

    expect(screen.getByText('Variables (JSON)')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Format' })).toBeInTheDocument()
  })

  it('should call onVariablesChange when textarea value changes', async () => {
    const user = userEvent.setup()
    render(<GraphQLVariablesEditor {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)

    // 一文字ずつ入力してエスケープの問題を回避
    fireEvent.change(textarea, { target: { value: '{"limit": 10}' } })

    expect(defaultProps.onVariablesChange).toHaveBeenCalledWith('{"limit": 10}')
  })

  it('should show error for invalid JSON', () => {
    const { container } = render(<GraphQLVariablesEditor {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'invalid json' } })

    expect(screen.getByText('Invalid JSON format')).toBeInTheDocument()
    // react-simple-code-editorが使用されているため、エラークラスはコンテナに適用される
    const editorContainer = container.querySelector('[class*="error"]')
    expect(editorContainer).toBeTruthy()
  })

  it('should not show error for valid JSON', () => {
    render(<GraphQLVariablesEditor {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '{"valid": "json"}' } })

    expect(screen.queryByText('Invalid JSON format')).not.toBeInTheDocument()
    expect(textarea.className).not.toContain('error')
  })

  it('should not show error for empty input', async () => {
    const user = userEvent.setup()
    render(<GraphQLVariablesEditor {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)

    expect(screen.queryByText('Invalid JSON format')).not.toBeInTheDocument()
  })

  it('should format JSON when format button is clicked', async () => {
    const user = userEvent.setup()
    const onVariablesChange = vi.fn()

    render(
      <GraphQLVariablesEditor
        variables='{"compact":"json"}'
        onVariablesChange={onVariablesChange}
      />
    )

    const formatButton = screen.getByRole('button', { name: 'Format' })
    await user.click(formatButton)

    expect(onVariablesChange).toHaveBeenCalledWith('{\n  "compact": "json"\n}')
  })

  it('should disable format button for empty input', () => {
    render(<GraphQLVariablesEditor variables="" onVariablesChange={vi.fn()} />)

    const formatButton = screen.getByRole('button', { name: 'Format' })
    expect(formatButton).toBeDisabled()
  })

  it('should show error when trying to format invalid JSON', async () => {
    const user = userEvent.setup()

    render(<GraphQLVariablesEditor variables="invalid json" onVariablesChange={vi.fn()} />)

    const formatButton = screen.getByRole('button', { name: 'Format' })
    await user.click(formatButton)

    expect(screen.getByText('Cannot format invalid JSON')).toBeInTheDocument()
  })

  it('should display placeholder text', () => {
    render(<GraphQLVariablesEditor {...defaultProps} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('"limit": 10'))
  })
})
