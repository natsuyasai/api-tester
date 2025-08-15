import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RequestSettings, DEFAULT_REQUEST_SETTINGS } from '@/types/types'
import { RequestSettingsEditor } from './RequestSettingsEditor'

describe('RequestSettingsEditor', () => {
  const mockOnChange = vi.fn()

  const defaultProps = {
    onChange: mockOnChange
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default settings when no settings provided', () => {
    render(<RequestSettingsEditor {...defaultProps} />)

    expect(screen.getByText('このリクエストの設定')).toBeInTheDocument()
    expect(screen.getByDisplayValue(DEFAULT_REQUEST_SETTINGS.timeout)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /リダイレクトを自動フォロー/ })).toBeChecked()
    expect(screen.getByDisplayValue(DEFAULT_REQUEST_SETTINGS.maxRedirects)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /SSL証明書を検証/ })).toBeChecked()
    expect(screen.getByDisplayValue(DEFAULT_REQUEST_SETTINGS.userAgent || '')).toBeInTheDocument()
  })

  it('should render with provided settings', () => {
    const customSettings: RequestSettings = {
      timeout: 5000,
      followRedirects: false,
      maxRedirects: 3,
      validateSSL: false,
      userAgent: 'Custom Agent'
    }

    render(<RequestSettingsEditor {...defaultProps} settings={customSettings} />)

    expect(screen.getByDisplayValue(5000)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /リダイレクトを自動フォロー/ })).not.toBeChecked()
    expect(screen.getByDisplayValue(3)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /SSL証明書を検証/ })).not.toBeChecked()
    expect(screen.getByDisplayValue('Custom Agent')).toBeInTheDocument()
  })

  it('should call onChange when timeout is updated', () => {
    render(<RequestSettingsEditor {...defaultProps} />)

    const timeoutInput = screen.getByLabelText('タイムアウト (ミリ秒):')

    // 値を直接設定してchangeイベントを発火
    fireEvent.change(timeoutInput, { target: { value: '15000' } })

    // onChangeが呼ばれたことを確認
    expect(mockOnChange).toHaveBeenCalled()
    // タイムアウト値が変更されていることを確認
    const timeoutCall = mockOnChange.mock.calls.find((call) => call[0].timeout === 15000)
    expect(timeoutCall).toBeDefined()
  })

  it('should call onChange when follow redirects is toggled', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const redirectsCheckbox = screen.getByRole('checkbox', { name: /リダイレクトを自動フォロー/ })
    await user.click(redirectsCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_REQUEST_SETTINGS,
      followRedirects: false
    })
  })

  it('should call onChange when max redirects is updated', () => {
    render(<RequestSettingsEditor {...defaultProps} />)

    const maxRedirectsInput = screen.getByLabelText('最大リダイレクト回数:')

    // 値を直接設定してchangeイベントを発火
    fireEvent.change(maxRedirectsInput, { target: { value: '3' } })

    // onChangeが呼ばれたことを確認
    expect(mockOnChange).toHaveBeenCalled()
    // maxRedirects値が変更されていることを確認
    const redirectCall = mockOnChange.mock.calls.find((call) => call[0].maxRedirects === 3)
    expect(redirectCall).toBeDefined()
  })

  it('should disable max redirects input when follow redirects is disabled', () => {
    const customSettings: RequestSettings = {
      ...DEFAULT_REQUEST_SETTINGS,
      followRedirects: false
    }

    render(<RequestSettingsEditor {...defaultProps} settings={customSettings} />)

    const maxRedirectsInput = screen.getByLabelText('最大リダイレクト回数:')
    expect(maxRedirectsInput).toBeDisabled()
  })

  it('should call onChange when SSL validation is toggled', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const sslCheckbox = screen.getByRole('checkbox', { name: /SSL証明書を検証/ })
    await user.click(sslCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_REQUEST_SETTINGS,
      validateSSL: false
    })
  })

  it('should call onChange when user agent is updated', () => {
    render(<RequestSettingsEditor {...defaultProps} />)

    const userAgentInput = screen.getByLabelText('User-Agent:')

    // 値を直接設定してchangeイベントを発火
    fireEvent.change(userAgentInput, { target: { value: 'TestAgent' } })

    // onChangeが呼ばれたことを確認
    expect(mockOnChange).toHaveBeenCalled()
    // userAgent値が変更されていることを確認
    const agentCall = mockOnChange.mock.calls.find((call) => call[0].userAgent === 'TestAgent')
    expect(agentCall).toBeDefined()
  })

  it('should set default settings when default preset is clicked', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const defaultButton = screen.getByRole('button', { name: 'デフォルト' })
    await user.click(defaultButton)

    expect(mockOnChange).toHaveBeenCalledWith(DEFAULT_REQUEST_SETTINGS)
  })

  it('should set fast mode settings when fast mode preset is clicked', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const fastModeButton = screen.getByRole('button', { name: '高速モード' })
    await user.click(fastModeButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      timeout: 5000,
      followRedirects: false,
      maxRedirects: 0,
      validateSSL: true,
      userAgent: 'API Tester Fast Mode'
    })
  })

  it('should set development mode settings when development mode preset is clicked', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const devModeButton = screen.getByRole('button', { name: '開発モード' })
    await user.click(devModeButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      timeout: 120000,
      followRedirects: true,
      maxRedirects: 10,
      validateSSL: false,
      userAgent: 'API Tester Development Mode'
    })
  })

  it('should handle empty user agent as undefined', async () => {
    const user = userEvent.setup()
    render(<RequestSettingsEditor {...defaultProps} />)

    const userAgentInput = screen.getByLabelText('User-Agent:')
    await user.clear(userAgentInput)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...DEFAULT_REQUEST_SETTINGS,
      userAgent: undefined
    })
  })
})
