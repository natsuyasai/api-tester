import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyValuePair } from '@/types/types'
import { KeyValueEditor } from './KeyValueEditor'

// requestStoreをモック
vi.mock('@renderer/stores/requestStore', () => ({
  useRequestStore: () => ({
    addHeader: mockAddHeader,
    updateHeader: mockUpdateHeader,
    removeHeader: mockRemoveHeader,
    addParam: mockAddParam,
    updateParam: mockUpdateParam,
    removeParam: mockRemoveParam,
    addBodyKeyValue: mockAddBodyKeyValue,
    updateBodyKeyValue: mockUpdateBodyKeyValue,
    removeBodyKeyValue: mockRemoveBodyKeyValue
  })
}))

const mockAddHeader = vi.fn()
const mockUpdateHeader = vi.fn()
const mockRemoveHeader = vi.fn()
const mockAddParam = vi.fn()
const mockUpdateParam = vi.fn()
const mockRemoveParam = vi.fn()
const mockAddBodyKeyValue = vi.fn()
const mockUpdateBodyKeyValue = vi.fn()
const mockRemoveBodyKeyValue = vi.fn()

describe('KeyValueEditor', () => {
  const defaultProps = {
    tabId: 'test-tab',
    type: 'headers' as const,
    items: [] as KeyValuePair[]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render editor with headers', () => {
    render(<KeyValueEditor {...defaultProps} />)

    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Add Header')).toBeInTheDocument()
  })

  it('should render items', () => {
    const items: KeyValuePair[] = [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Authorization', value: 'Bearer token', enabled: false }
    ]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument()
    expect(screen.getByDisplayValue('application/json')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bearer token')).toBeInTheDocument()
  })

  it('should automatically enable checkbox when key is entered from disabled state', () => {
    const items: KeyValuePair[] = [{ key: '', value: '', enabled: false }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const keyInput = screen.getByPlaceholderText('Key')

    // enabledがfalseの状態で文字入力をシミュレート
    fireEvent.change(keyInput, { target: { value: 'Authorization' } })

    expect(mockUpdateHeader).toHaveBeenCalledWith('test-tab', 0, {
      key: 'Authorization',
      enabled: true
    })
  })

  it('should automatically enable checkbox when value is entered from disabled state', () => {
    const items: KeyValuePair[] = [{ key: '', value: '', enabled: false }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const valueInput = screen.getByPlaceholderText('Value')

    // enabledがfalseの状態で文字入力をシミュレート
    fireEvent.change(valueInput, { target: { value: 'Bearer token' } })

    expect(mockUpdateHeader).toHaveBeenCalledWith('test-tab', 0, {
      value: 'Bearer token',
      enabled: true
    })
  })

  it('should not enable checkbox if already enabled', async () => {
    const user = userEvent.setup()
    const items: KeyValuePair[] = [{ key: 'test', value: '', enabled: true }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const valueInput = screen.getByPlaceholderText('Value')
    await user.type(valueInput, 'value')

    expect(mockUpdateHeader).toHaveBeenCalledWith('test-tab', 0, {
      value: 'v'
    })
  })

  it('should not enable checkbox for empty input', async () => {
    const user = userEvent.setup()
    const items: KeyValuePair[] = [{ key: 'test', value: 'value', enabled: true }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const keyInput = screen.getByDisplayValue('test')
    await user.clear(keyInput)

    expect(mockUpdateHeader).toHaveBeenCalledWith('test-tab', 0, {
      key: ''
    })
  })

  it('should work with params type', () => {
    const items: KeyValuePair[] = [{ key: '', value: '', enabled: false }]

    render(<KeyValueEditor {...defaultProps} type="params" items={items} />)

    expect(screen.getByText('Add Parameter')).toBeInTheDocument()

    const keyInput = screen.getByPlaceholderText('Key')
    fireEvent.change(keyInput, { target: { value: 'limit' } })

    expect(mockUpdateParam).toHaveBeenCalledWith('test-tab', 0, {
      key: 'limit',
      enabled: true
    })
  })

  it('should work with body type', () => {
    const items: KeyValuePair[] = [{ key: '', value: '', enabled: false }]

    render(<KeyValueEditor {...defaultProps} type="body" items={items} />)

    expect(screen.getByText('Add Field')).toBeInTheDocument()

    const keyInput = screen.getByPlaceholderText('Key')
    fireEvent.change(keyInput, { target: { value: 'name' } })

    expect(mockUpdateBodyKeyValue).toHaveBeenCalledWith('test-tab', 0, {
      key: 'name',
      enabled: true
    })
  })

  it('should add new item when add button is clicked', async () => {
    const user = userEvent.setup()

    render(<KeyValueEditor {...defaultProps} />)

    const addButton = screen.getByText('Add Header')
    await user.click(addButton)

    expect(mockAddHeader).toHaveBeenCalledWith('test-tab')
  })

  it('should remove item when remove button is clicked', async () => {
    const user = userEvent.setup()
    const items: KeyValuePair[] = [{ key: 'test', value: 'value', enabled: true }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const removeButton = screen.getByLabelText('Remove item')
    await user.click(removeButton)

    expect(mockRemoveHeader).toHaveBeenCalledWith('test-tab', 0)
  })

  it('should toggle enabled state with checkbox', async () => {
    const user = userEvent.setup()
    const items: KeyValuePair[] = [{ key: 'test', value: 'value', enabled: true }]

    render(<KeyValueEditor {...defaultProps} items={items} />)

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(mockUpdateHeader).toHaveBeenCalledWith('test-tab', 0, {
      enabled: false
    })
  })
})
