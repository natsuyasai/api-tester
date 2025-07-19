import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyValuePair } from '@/types/types'
import { FormDataEditor } from './FormDataEditor'

describe('FormDataEditor', () => {
  const mockOnChange = vi.fn()

  const defaultProps = {
    data: [] as KeyValuePair[],
    onChange: mockOnChange
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render table view by default', () => {
    render(<FormDataEditor {...defaultProps} />)

    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('should render initial empty row', () => {
    render(<FormDataEditor {...defaultProps} />)

    const keyInputs = screen.getAllByPlaceholderText('Enter key')
    const valueInputs = screen.getAllByPlaceholderText('Enter value')

    expect(keyInputs).toHaveLength(1)
    expect(valueInputs).toHaveLength(1)
  })

  it('should display existing data', () => {
    const data: KeyValuePair[] = [
      { key: 'name', value: 'John Doe', enabled: true },
      { key: 'age', value: '30', enabled: false }
    ]

    render(<FormDataEditor {...defaultProps} data={data} />)

    expect(screen.getByDisplayValue('name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('age')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('should add new row when typing in last empty row', async () => {
    render(<FormDataEditor {...defaultProps} />)

    const keyInput = screen.getByPlaceholderText('Enter key')
    fireEvent.change(keyInput, { target: { value: 'test' } })

    expect(mockOnChange).toHaveBeenCalledWith([{ key: 'test', value: '', enabled: true }])
  })

  it('should update existing data', () => {
    const data: KeyValuePair[] = [{ key: 'name', value: 'John', enabled: true }]

    render(<FormDataEditor {...defaultProps} data={data} />)

    const valueInput = screen.getByDisplayValue('John')
    fireEvent.change(valueInput, { target: { value: 'Jane' } })

    expect(mockOnChange).toHaveBeenCalledWith([{ key: 'name', value: 'Jane', enabled: true }])
  })

  it('should toggle enabled state', async () => {
    const user = userEvent.setup()
    const data: KeyValuePair[] = [{ key: 'name', value: 'John', enabled: true }]

    render(<FormDataEditor {...defaultProps} data={data} />)

    const checkboxes = screen.getAllByRole('checkbox')
    const itemCheckbox = checkboxes[1] // First checkbox is "toggle all"

    await user.click(itemCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith([{ key: 'name', value: 'John', enabled: false }])
  })

  it('should remove row when remove button is clicked', async () => {
    const user = userEvent.setup()
    const data: KeyValuePair[] = [
      { key: 'name', value: 'John', enabled: true },
      { key: 'age', value: '30', enabled: true }
    ]

    render(<FormDataEditor {...defaultProps} data={data} />)

    const removeButtons = screen.getAllByLabelText(/Remove/)
    await user.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([{ key: 'age', value: '30', enabled: true }])
  })

  it('should switch to bulk edit mode', async () => {
    const user = userEvent.setup()
    render(<FormDataEditor {...defaultProps} />)

    const bulkButton = screen.getByText('Bulk Edit')
    await user.click(bulkButton)

    expect(
      screen.getByText('Enter one key-value pair per line in the format: key: value')
    ).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('should parse bulk text into table data', async () => {
    const user = userEvent.setup()
    render(<FormDataEditor {...defaultProps} />)

    // Switch to bulk mode
    await user.click(screen.getByText('Bulk Edit'))

    const textarea = screen.getByPlaceholderText(/key1: value1/)
    await user.type(textarea, 'name: John Doe\nage: 30\nemail: john@example.com')

    expect(mockOnChange).toHaveBeenCalledWith([
      { key: 'name', value: 'John Doe', enabled: true },
      { key: 'age', value: '30', enabled: true },
      { key: 'email', value: 'john@example.com', enabled: true }
    ])
  })

  it('should switch back to table mode from bulk edit', async () => {
    const user = userEvent.setup()
    render(<FormDataEditor {...defaultProps} />)

    // Switch to bulk mode
    await user.click(screen.getByText('Bulk Edit'))

    // Switch back to table mode
    await user.click(screen.getByText('Done'))

    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
  })

  it('should use custom placeholders', () => {
    const placeholder = {
      key: 'Custom key placeholder',
      value: 'Custom value placeholder'
    }

    render(<FormDataEditor {...defaultProps} placeholder={placeholder} />)

    expect(screen.getByPlaceholderText('Custom key placeholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Custom value placeholder')).toBeInTheDocument()
  })

  it('should toggle all items with master checkbox', async () => {
    const user = userEvent.setup()
    const data: KeyValuePair[] = [
      { key: 'name', value: 'John', enabled: true },
      { key: 'age', value: '30', enabled: true }
    ]

    render(<FormDataEditor {...defaultProps} data={data} />)

    const masterCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(masterCheckbox)

    expect(mockOnChange).toHaveBeenCalledWith([
      { key: 'name', value: 'John', enabled: false },
      { key: 'age', value: '30', enabled: false }
    ])
  })
})
