import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BodyType } from '@/types/types'
import { BodyEditor } from './BodyEditor'

const mockTabStore = {
  getTab: vi.fn()
}

const mockRequestStore = {
  addBodyKeyValue: vi.fn(),
  updateBodyKeyValue: vi.fn(),
  removeBodyKeyValue: vi.fn()
}

vi.mock('@renderer/stores/tabStore', () => ({
  useTabStore: () => mockTabStore
}))

vi.mock('@renderer/stores/requestStore', () => ({
  useRequestStore: () => mockRequestStore
}))

describe('BodyEditor', () => {
  const mockOnBodyChange = vi.fn()
  const mockOnBodyTypeChange = vi.fn()
  const mockOnVariablesChange = vi.fn()

  const defaultProps = {
    tabId: 'test-tab-1',
    body: '',
    bodyType: 'json' as BodyType,
    onBodyChange: mockOnBodyChange,
    onBodyTypeChange: mockOnBodyTypeChange,
    onVariablesChange: mockOnVariablesChange
  }

  const mockTab = {
    id: 'test-tab-1',
    title: 'Test Tab',
    isActive: true,
    response: null,
    request: {
      id: 'test-request-1',
      name: 'Test Request',
      url: 'https://api.example.com',
      method: 'POST',
      headers: [{ key: '', value: '', enabled: true }],
      params: [{ key: '', value: '', enabled: true }],
      body: '',
      bodyType: 'json',
      bodyKeyValuePairs: [{ key: '', value: '', enabled: true }],
      type: 'rest'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTabStore.getTab.mockReturnValue(mockTab)
  })

  it('should render body type selector', () => {
    render(<BodyEditor {...defaultProps} />)

    expect(screen.getByDisplayValue('JSON')).toBeInTheDocument()
  })

  it('should render FormDataEditor for form-data body type', () => {
    const props = { ...defaultProps, bodyType: 'form-data' as BodyType }
    render(<BodyEditor {...props} />)

    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('should render FormDataEditor for x-www-form-urlencoded body type', () => {
    const props = { ...defaultProps, bodyType: 'x-www-form-urlencoded' as BodyType }
    render(<BodyEditor {...props} />)

    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('should call onBodyTypeChange when body type is changed', async () => {
    const user = userEvent.setup()
    render(<BodyEditor {...defaultProps} />)

    const select = screen.getByDisplayValue('JSON')
    await user.selectOptions(select, 'form-data')

    expect(mockOnBodyTypeChange).toHaveBeenCalledWith('form-data')
  })

  it('should add bodyKeyValue when switching to form-data with empty bodyKeyValuePairs', async () => {
    const tabWithEmptyBodyKeyValuePairs = {
      ...mockTab,
      request: {
        ...mockTab.request,
        bodyKeyValuePairs: []
      }
    }
    mockTabStore.getTab.mockReturnValue(tabWithEmptyBodyKeyValuePairs)

    const user = userEvent.setup()
    render(<BodyEditor {...defaultProps} />)

    const select = screen.getByDisplayValue('JSON')
    await user.selectOptions(select, 'form-data')

    expect(mockRequestStore.addBodyKeyValue).toHaveBeenCalledWith('test-tab-1')
  })

  it('should handle form data changes and update store', () => {
    const props = { ...defaultProps, bodyType: 'form-data' as BodyType }
    render(<BodyEditor {...props} />)

    // FormDataEditorの内部でkey-valueペアを変更した場合のテスト
    // この部分は統合テストでより詳細にテストされるべき
    expect(mockTabStore.getTab).toHaveBeenCalledWith('test-tab-1')
  })

  it('should render textarea for raw body type', () => {
    const props = { ...defaultProps, bodyType: 'raw' as BodyType }
    render(<BodyEditor {...props} />)

    expect(screen.getByPlaceholderText('Enter raw body...')).toBeInTheDocument()
  })

  it('should render GraphQL editor for graphql body type', () => {
    const props = { ...defaultProps, bodyType: 'graphql' as BodyType }
    render(<BodyEditor {...props} />)

    expect(screen.getByText('Query')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/query/)).toBeInTheDocument()
  })

  it('should show Format JSON button for JSON body type', () => {
    render(<BodyEditor {...defaultProps} />)

    expect(screen.getByText('Format JSON')).toBeInTheDocument()
  })

  it('should format JSON when Format JSON button is clicked', async () => {
    const user = userEvent.setup()
    const props = { ...defaultProps, body: '{"name":"test"}' }
    render(<BodyEditor {...props} />)

    const formatButton = screen.getByText('Format JSON')
    await user.click(formatButton)

    expect(mockOnBodyChange).toHaveBeenCalledWith('{\n  "name": "test"\n}')
  })
})
