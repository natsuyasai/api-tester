import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthConfig } from '@/types/types'
import { AuthEditor } from './AuthEditor'

describe('AuthEditor', () => {
  const mockOnChange = vi.fn()

  const defaultProps = {
    onChange: mockOnChange
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with "none" auth type by default', () => {
    render(<AuthEditor {...defaultProps} />)

    expect(screen.getByText('認証')).toBeInTheDocument()
    expect(screen.getByDisplayValue('認証なし')).toBeInTheDocument()
  })

  it('should show Basic auth fields when Basic is selected', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AuthEditor {...defaultProps} />)

    const authTypeSelect = screen.getByLabelText('認証タイプ:')
    await user.selectOptions(authTypeSelect, 'basic')

    expect(mockOnChange).toHaveBeenCalledWith({ type: 'basic' })

    // コンポーネントを再レンダリングして変更を反映
    rerender(<AuthEditor {...defaultProps} auth={{ type: 'basic' }} />)

    expect(screen.getByLabelText('ユーザー名:')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード:')).toBeInTheDocument()
  })

  it('should show Bearer token field when Bearer is selected', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AuthEditor {...defaultProps} />)

    const authTypeSelect = screen.getByLabelText('認証タイプ:')
    await user.selectOptions(authTypeSelect, 'bearer')

    expect(mockOnChange).toHaveBeenCalledWith({ type: 'bearer' })

    // コンポーネントを再レンダリングして変更を反映
    rerender(<AuthEditor {...defaultProps} auth={{ type: 'bearer' }} />)

    expect(screen.getByLabelText('Token:')).toBeInTheDocument()
  })

  it('should show API Key fields when API Key is selected', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AuthEditor {...defaultProps} />)

    const authTypeSelect = screen.getByLabelText('認証タイプ:')
    await user.selectOptions(authTypeSelect, 'api-key')

    expect(mockOnChange).toHaveBeenCalledWith({ type: 'api-key' })

    // コンポーネントを再レンダリングして変更を反映
    rerender(<AuthEditor {...defaultProps} auth={{ type: 'api-key' }} />)

    expect(screen.getByLabelText('キー名:')).toBeInTheDocument()
    expect(screen.getByLabelText('値:')).toBeInTheDocument()
    expect(screen.getByLabelText('配置場所:')).toBeInTheDocument()
  })

  it('should update Basic auth username', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'basic',
      basic: { username: '', password: '' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const usernameInput = screen.getByLabelText('ユーザー名:')
    await user.type(usernameInput, 'testuser')

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'basic',
      basic: { username: 't', password: '' }
    })
  })

  it('should update Basic auth password', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'basic',
      basic: { username: 'testuser', password: '' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const passwordInput = screen.getByLabelText('パスワード:')
    await user.type(passwordInput, 'testpass')

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'basic',
      basic: { username: 'testuser', password: 't' }
    })
  })

  it('should update Bearer token', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'bearer',
      bearer: { token: '' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const tokenInput = screen.getByLabelText('Token:')
    await user.type(tokenInput, 'token123')

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'bearer',
      bearer: { token: 't' }
    })
  })

  it('should update API Key key field', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'api-key',
      apiKey: { key: '', value: '', location: 'header' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const keyInput = screen.getByLabelText('キー名:')
    await user.clear(keyInput)
    await user.type(keyInput, 'X')

    expect(mockOnChange).toHaveBeenLastCalledWith({
      type: 'api-key',
      apiKey: { key: 'X', value: '', location: 'header' }
    })
  })

  it('should update API Key value field', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: '', location: 'header' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const valueInput = screen.getByLabelText('値:')
    await user.type(valueInput, 's')

    expect(mockOnChange).toHaveBeenLastCalledWith({
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: 's', location: 'header' }
    })
  })

  it('should update API Key location', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: 'secret123', location: 'header' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    const locationSelect = screen.getByLabelText('配置場所:')
    await user.selectOptions(locationSelect, 'query')

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'api-key',
      apiKey: { key: 'X-API-Key', value: 'secret123', location: 'query' }
    })
  })

  it('should preserve existing settings when switching auth types', async () => {
    const user = userEvent.setup()
    const auth: AuthConfig = {
      type: 'basic',
      basic: { username: 'testuser', password: 'testpass' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    // Switch to bearer and back to basic
    const authTypeSelect = screen.getByLabelText('認証タイプ:')
    await user.selectOptions(authTypeSelect, 'bearer')
    await user.selectOptions(authTypeSelect, 'basic')

    expect(mockOnChange).toHaveBeenLastCalledWith({
      type: 'basic',
      basic: { username: 'testuser', password: 'testpass' }
    })
  })

  it('should render existing Basic auth values', () => {
    const auth: AuthConfig = {
      type: 'basic',
      basic: { username: 'existinguser', password: 'existingpass' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    expect(screen.getByDisplayValue('existinguser')).toBeInTheDocument()
    expect(screen.getByDisplayValue('existingpass')).toBeInTheDocument()
  })

  it('should render existing Bearer token value', () => {
    const auth: AuthConfig = {
      type: 'bearer',
      bearer: { token: 'existing-token-123' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    expect(screen.getByDisplayValue('existing-token-123')).toBeInTheDocument()
  })

  it('should render existing API Key values', () => {
    const auth: AuthConfig = {
      type: 'api-key',
      apiKey: { key: 'X-Custom-Key', value: 'custom-secret', location: 'query' }
    }

    render(<AuthEditor {...defaultProps} auth={auth} />)

    expect(screen.getByDisplayValue('X-Custom-Key')).toBeInTheDocument()
    expect(screen.getByDisplayValue('custom-secret')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Query Parameter')).toBeInTheDocument()
  })
})
