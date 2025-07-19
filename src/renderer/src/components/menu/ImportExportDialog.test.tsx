import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApiStore } from '@renderer/stores/apiStore'
import { ImportExportDialog } from './ImportExportDialog'

// APIストアをモック
vi.mock('@renderer/stores/apiStore')

// ファイルAPIをモック
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url')
})

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
})

// document.createElementをモック
const mockDownloadLink = {
  href: '',
  download: '',
  click: vi.fn(),
  style: { display: '' }
}

const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return mockDownloadLink as unknown as HTMLAnchorElement
  }
  return originalCreateElement.call(document, tagName)
})

describe('ImportExportDialog', () => {
  const mockStore = {
    exportConfig: vi.fn(() => '{"test": "config"}'),
    importConfig: vi.fn(),
    exportYaml: vi.fn(() => 'test: yaml'),
    importYaml: vi.fn()
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useApiStore).mockImplementation(() => mockStore as any)

    // DOM操作のモックをリセット
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(<ImportExportDialog isOpen={false} onClose={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })

  it('should render dialog when isOpen is true', () => {
    render(<ImportExportDialog {...defaultProps} />)

    expect(screen.getByText('Import / Export Collection')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<ImportExportDialog {...defaultProps} />)

    const closeButton = screen.getByLabelText('Close dialog')
    await user.click(closeButton)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  describe('Export Tab', () => {
    it('should export JSON configuration', async () => {
      const user = userEvent.setup()
      render(<ImportExportDialog {...defaultProps} />)

      // JSONが選択されていることを確認
      const jsonRadio = screen.getByDisplayValue('json')
      expect(jsonRadio).toBeChecked()

      // エクスポートボタンをクリック
      const exportButton = screen.getByText('Export Collection')
      await user.click(exportButton)

      expect(mockStore.exportConfig).toHaveBeenCalledTimes(1)
      expect(mockDownloadLink.download).toBe('api-collection.json')
      expect(mockDownloadLink.click).toHaveBeenCalledTimes(1)
    })

    it('should export YAML configuration', async () => {
      const user = userEvent.setup()
      render(<ImportExportDialog {...defaultProps} />)

      // YAMLを選択
      const yamlRadio = screen.getByDisplayValue('yaml')
      await user.click(yamlRadio)

      // エクスポートボタンをクリック
      const exportButton = screen.getByText('Export Collection')
      await user.click(exportButton)

      expect(mockStore.exportYaml).toHaveBeenCalledTimes(1)
      expect(mockDownloadLink.download).toBe('api-collection.yaml')
      expect(mockDownloadLink.click).toHaveBeenCalledTimes(1)
    })

    it('should show success message after export', async () => {
      const user = userEvent.setup()
      render(<ImportExportDialog {...defaultProps} />)

      const exportButton = screen.getByText('Export Collection')
      await user.click(exportButton)

      expect(screen.getByText('Collection exported as JSON')).toBeInTheDocument()
    })
  })

  describe('Import Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<ImportExportDialog {...defaultProps} />)

      // Importタブに切り替え
      const importTab = screen.getByText('Import')
      await user.click(importTab)
    })

    it('should switch to import tab', async () => {
      expect(screen.getByText('Import Type:')).toBeInTheDocument()
      expect(screen.getByDisplayValue('JSON Configuration')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Paste your JSON content here...')).toBeInTheDocument()
    })

    it('should import JSON configuration', async () => {
      const user = userEvent.setup()

      const textarea = screen.getByPlaceholderText('Paste your JSON content here...')
      const jsonContent = '{"test": "data"}'

      await user.type(textarea, jsonContent)

      const importButton = screen.getByText('Import Collection')
      await user.click(importButton)

      expect(mockStore.importConfig).toHaveBeenCalledWith(jsonContent)
      expect(screen.getByText('JSON configuration imported successfully')).toBeInTheDocument()
    })

    it('should import YAML configuration', async () => {
      const user = userEvent.setup()

      // YAMLを選択
      const select = screen.getByDisplayValue('JSON Configuration')
      await user.selectOptions(select, 'yaml')

      const textarea = screen.getByPlaceholderText('Paste your YAML content here...')
      const yamlContent = 'test: data'

      await user.type(textarea, yamlContent)

      const importButton = screen.getByText('Import Collection')
      await user.click(importButton)

      expect(mockStore.importYaml).toHaveBeenCalledWith(yamlContent)
      expect(screen.getByText('YAML configuration imported successfully')).toBeInTheDocument()
    })

    it('should disable import button when no content', () => {
      const importButton = screen.getByText('Import Collection')
      expect(importButton).toBeDisabled()
    })

    it('should show error for empty content', async () => {
      const user = userEvent.setup()

      // 空のテキストエリアでインポートを試行
      const importButton = screen.getByText('Import Collection')

      // ボタンが無効化されているので、強制的に有効化してテスト
      importButton.removeAttribute('disabled')
      await user.click(importButton)

      expect(screen.getByText('Please provide content to import')).toBeInTheDocument()
    })

    it('should handle import errors', async () => {
      const user = userEvent.setup()

      // モックでエラーを発生させる
      mockStore.importConfig.mockImplementation(() => {
        throw new Error('Invalid format')
      })

      const textarea = screen.getByPlaceholderText('Paste your JSON content here...')
      await user.type(textarea, 'invalid content')

      const importButton = screen.getByText('Import Collection')
      await user.click(importButton)

      expect(screen.getByText('Import failed: Invalid format')).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('should handle file upload', async () => {
      const user = userEvent.setup()
      render(<ImportExportDialog {...defaultProps} />)

      // Importタブに切り替え
      const importTab = screen.getByText('Import')
      await user.click(importTab)

      // ファイル選択のモック
      const fileContent = '{"test": "file content"}'
      const file = new File([fileContent], 'test.json', { type: 'application/json' })

      // FileReaderをモック
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as ((event: any) => void) | null,
        result: fileContent
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const fileInput = screen.getByDisplayValue('')

      // ファイルをアップロード
      await user.upload(fileInput, file)

      // FileReaderのonloadを手動で実行
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: fileContent } })
      }

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file)
    })
  })
})
