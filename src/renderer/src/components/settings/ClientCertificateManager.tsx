import { JSX, useState, useId } from 'react'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import styles from './ClientCertificateManager.module.scss'

interface CertificateFormData {
  name: string
  host: string
  certPath: string
  keyPath: string
  passphrase: string
}

export const ClientCertificateManager = (): JSX.Element => {
  const {
    settings,
    updateSettings,
    addClientCertificate,
    updateClientCertificate,
    removeClientCertificate,
    toggleClientCertificate
  } = useGlobalSettingsStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CertificateFormData>({
    name: '',
    host: '',
    certPath: '',
    keyPath: '',
    passphrase: ''
  })

  const nameId = useId()
  const hostId = useId()
  const certPathId = useId()
  const keyPathId = useId()
  const passphraseId = useId()

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      certPath: '',
      keyPath: '',
      passphrase: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.certPath.trim() || !formData.keyPath.trim()) {
      alert('名前、証明書ファイル、秘密鍵ファイルは必須です')
      return
    }

    const certificateData = {
      name: formData.name.trim(),
      host: formData.host.trim() || undefined,
      certPath: formData.certPath.trim(),
      keyPath: formData.keyPath.trim(),
      passphrase: formData.passphrase.trim() || undefined,
      enabled: true
    }

    if (editingId) {
      updateClientCertificate(editingId, certificateData)
    } else {
      addClientCertificate(certificateData)
    }

    resetForm()
  }

  const handleEdit = (certificate: (typeof settings.clientCertificates.certificates)[0]) => {
    setFormData({
      name: certificate.name,
      host: certificate.host || '',
      certPath: certificate.certPath,
      keyPath: certificate.keyPath,
      passphrase: certificate.passphrase || ''
    })
    setEditingId(certificate.id)
    setShowAddForm(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`証明書「${name}」を削除しますか？`)) {
      removeClientCertificate(id)
    }
  }

  const handleSelectCertFile = async () => {
    try {
      const result = await window.dialogAPI.showOpenDialog({
        title: '証明書ファイルを選択',
        filters: [
          { name: 'Certificate Files', extensions: ['crt', 'cer', 'pem', 'p12', 'pfx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        setFormData((prev) => ({ ...prev, certPath: result.filePaths[0] }))
      }
    } catch (error) {
      console.error('Failed to select certificate file:', error)
      alert('証明書ファイルの選択に失敗しました')
    }
  }

  const handleSelectKeyFile = async () => {
    try {
      const result = await window.dialogAPI.showOpenDialog({
        title: '秘密鍵ファイルを選択',
        filters: [
          { name: 'Key Files', extensions: ['key', 'pem', 'p12', 'pfx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        setFormData((prev) => ({ ...prev, keyPath: result.filePaths[0] }))
      }
    } catch (error) {
      console.error('Failed to select key file:', error)
      alert('秘密鍵ファイルの選択に失敗しました')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>クライアント証明書</h3>
        <div className={styles.enableToggle}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.clientCertificates.enabled}
              onChange={(e) =>
                updateSettings({
                  clientCertificates: {
                    ...settings.clientCertificates,
                    enabled: e.target.checked
                  }
                })
              }
            />
            <span>クライアント証明書を使用</span>
          </label>
        </div>
      </div>

      {settings.clientCertificates.enabled && (
        <>
          <div className={styles.certificateList}>
            {settings.clientCertificates.certificates.length === 0 ? (
              <p className={styles.emptyMessage}>証明書が登録されていません</p>
            ) : (
              settings.clientCertificates.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className={`${styles.certificateItem} ${!cert.enabled ? styles.disabled : ''}`}
                >
                  <div className={styles.certificateInfo}>
                    <div className={styles.certificateName}>
                      <strong>{cert.name}</strong>
                      {cert.host && <span className={styles.host}>({cert.host})</span>}
                    </div>
                    <div className={styles.certificatePaths}>
                      <div>証明書: {cert.certPath}</div>
                      <div>秘密鍵: {cert.keyPath}</div>
                    </div>
                  </div>
                  <div className={styles.certificateActions}>
                    <label className={styles.enableCheckbox}>
                      <input
                        type="checkbox"
                        checked={cert.enabled}
                        onChange={() => toggleClientCertificate(cert.id)}
                      />
                      <span>有効</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleEdit(cert)}
                      className={styles.editButton}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cert.id, cert.name)}
                      className={styles.deleteButton}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.addSection}>
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className={styles.addButton}
              >
                証明書を追加
              </button>
            ) : (
              <form onSubmit={handleSubmit} className={styles.addForm}>
                <h4>{editingId ? '証明書を編集' : '証明書を追加'}</h4>

                <div className={styles.formRow}>
                  <label htmlFor={nameId}>名前 *</label>
                  <input
                    id={nameId}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="証明書の名前"
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <label htmlFor={hostId}>ホスト (オプション)</label>
                  <input
                    id={hostId}
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData((prev) => ({ ...prev, host: e.target.value }))}
                    placeholder="example.com (空白で全てのホストに適用)"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <label htmlFor={certPathId}>証明書ファイル *</label>
                  <div className={styles.fileInputGroup}>
                    <input
                      id={certPathId}
                      type="text"
                      value={formData.certPath}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, certPath: e.target.value }))
                      }
                      placeholder="証明書ファイルのパス"
                      required
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSelectCertFile()}
                      className={styles.fileSelectButton}
                    >
                      選択
                    </button>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor={keyPathId}>秘密鍵ファイル *</label>
                  <div className={styles.fileInputGroup}>
                    <input
                      id={keyPathId}
                      type="text"
                      value={formData.keyPath}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, keyPath: e.target.value }))
                      }
                      placeholder="秘密鍵ファイルのパス"
                      required
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSelectKeyFile()}
                      className={styles.fileSelectButton}
                    >
                      選択
                    </button>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label htmlFor={passphraseId}>パスフレーズ (オプション)</label>
                  <input
                    id={passphraseId}
                    type="password"
                    value={formData.passphrase}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, passphrase: e.target.value }))
                    }
                    placeholder="秘密鍵のパスフレーズ"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.submitButton}>
                    {editingId ? '更新' : '追加'}
                  </button>
                  <button type="button" onClick={resetForm} className={styles.cancelButton}>
                    キャンセル
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
