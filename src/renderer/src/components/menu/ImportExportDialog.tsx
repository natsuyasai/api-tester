import { JSX, useState, useRef } from 'react'
import { useApiStore } from '@renderer/stores/apiStore'
import { YamlService } from '@/services/yamlService'
import styles from './ImportExportDialog.module.scss'

interface ImportExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'json' | 'yaml'
type ImportType = 'json' | 'yaml' | 'postman' | 'openapi'

export const ImportExportDialog = ({ isOpen, onClose }: ImportExportDialogProps): JSX.Element => {
  const { exportConfig, importConfig, exportYaml, importYaml } = useApiStore()
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [importType, setImportType] = useState<ImportType>('json')
  const [importContent, setImportContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return <></>

  const handleExport = () => {
    try {
      const content = exportFormat === 'yaml' ? exportYaml() : exportConfig()
      const blob = new Blob([content], { 
        type: exportFormat === 'yaml' ? 'application/x-yaml' : 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-collection.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess(`Collection exported as ${exportFormat.toUpperCase()}`)
      setError(null)
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setSuccess(null)
    }
  }

  const handleImport = () => {
    try {
      setError(null)
      setSuccess(null)

      if (!importContent.trim()) {
        setError('Please provide content to import')
        return
      }

      switch (importType) {
        case 'json':
          importConfig(importContent)
          setSuccess('JSON configuration imported successfully')
          break
        case 'yaml':
          importYaml(importContent)
          setSuccess('YAML configuration imported successfully')
          break
        case 'postman':
          const postmanData = JSON.parse(importContent)
          const yamlFromPostman = YamlService.convertPostmanToYaml(postmanData)
          importYaml(yamlFromPostman)
          setSuccess('Postman collection imported successfully')
          break
        case 'openapi':
          const openApiData = JSON.parse(importContent)
          const yamlFromOpenApi = YamlService.convertOpenApiToYaml(openApiData)
          importYaml(yamlFromOpenApi)
          setSuccess('OpenAPI specification imported successfully')
          break
        default:
          setError('Unsupported import type')
      }
      
      setImportContent('')
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setSuccess(null)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportContent(content)
      
      // ファイル拡張子に基づいて自動判定
      const extension = file.name.split('.').pop()?.toLowerCase()
      switch (extension) {
        case 'json':
          if (content.includes('"info"') && content.includes('"item"')) {
            setImportType('postman')
          } else if (content.includes('"openapi"') || content.includes('"swagger"')) {
            setImportType('openapi')
          } else {
            setImportType('json')
          }
          break
        case 'yaml':
        case 'yml':
          setImportType('yaml')
          break
        default:
          setImportType('json')
      }
    }
    reader.readAsText(file)
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleTabChange = (tab: 'export' | 'import') => {
    setActiveTab(tab)
    clearMessages()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>Import / Export Collection</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'export' ? styles.active : ''}`}
            onClick={() => handleTabChange('export')}
          >
            Export
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'import' ? styles.active : ''}`}
            onClick={() => handleTabChange('import')}
          >
            Import
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'export' ? (
            <div className={styles.exportTab}>
              <div className={styles.section}>
                <label className={styles.label}>Export Format:</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    />
                    JSON
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="yaml"
                      checked={exportFormat === 'yaml'}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    />
                    YAML
                  </label>
                </div>
              </div>
              <button 
                className={styles.primaryButton}
                onClick={handleExport}
              >
                Export Collection
              </button>
            </div>
          ) : (
            <div className={styles.importTab}>
              <div className={styles.section}>
                <label className={styles.label}>Import Type:</label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as ImportType)}
                  className={styles.select}
                >
                  <option value="json">JSON Configuration</option>
                  <option value="yaml">YAML Configuration</option>
                  <option value="postman">Postman Collection</option>
                  <option value="openapi">OpenAPI Specification</option>
                </select>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>Import Source:</label>
                <div className={styles.importMethods}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <span className={styles.orText}>or paste content below</span>
                </div>
              </div>

              <div className={styles.section}>
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder={`Paste your ${importType.toUpperCase()} content here...`}
                  className={styles.textarea}
                />
              </div>

              <button 
                className={styles.primaryButton}
                onClick={handleImport}
                disabled={!importContent.trim()}
              >
                Import Collection
              </button>
            </div>
          )}
        </div>

        {(error || success) && (
          <div className={styles.messages}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            {success && (
              <div className={styles.successMessage}>
                {success}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}