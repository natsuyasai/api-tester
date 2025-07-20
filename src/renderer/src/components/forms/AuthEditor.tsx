import { JSX } from 'react'
import { AuthConfig, AuthType, ApiKeyLocation } from '@/types/types'
import styles from './AuthEditor.module.scss'

interface AuthEditorProps {
  auth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}

export const AuthEditor = ({ auth, onChange }: AuthEditorProps): JSX.Element => {
  const currentAuth = auth || { type: 'none' }

  const handleTypeChange = (type: AuthType) => {
    const newAuth: AuthConfig = { type }

    // 既存の設定を保持
    if (type === 'basic' && currentAuth.basic) {
      newAuth.basic = currentAuth.basic
    } else if (type === 'bearer' && currentAuth.bearer) {
      newAuth.bearer = currentAuth.bearer
    } else if (type === 'api-key' && currentAuth.apiKey) {
      newAuth.apiKey = currentAuth.apiKey
    }

    onChange(newAuth)
  }

  const handleBasicChange = (field: 'username' | 'password', value: string) => {
    const newAuth: AuthConfig = {
      ...currentAuth,
      basic: {
        username: currentAuth.basic?.username || '',
        password: currentAuth.basic?.password || '',
        [field]: value
      }
    }
    onChange(newAuth)
  }

  const handleBearerChange = (token: string) => {
    const newAuth: AuthConfig = {
      ...currentAuth,
      bearer: { token }
    }
    onChange(newAuth)
  }

  const handleApiKeyChange = (field: 'key' | 'value' | 'location', value: string) => {
    const newAuth: AuthConfig = {
      ...currentAuth,
      apiKey: {
        key: currentAuth.apiKey?.key || '',
        value: currentAuth.apiKey?.value || '',
        location: currentAuth.apiKey?.location || 'header',
        [field]: value
      }
    }
    onChange(newAuth)
  }

  return (
    <div className={styles.authEditor}>
      <div className={styles.header}>
        <h3>認証</h3>
      </div>

      <div className={styles.typeSelector}>
        <label htmlFor="auth-type">認証タイプ:</label>
        <select
          id="auth-type"
          value={currentAuth.type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className={styles.select}
        >
          <option value="none">認証なし</option>
          <option value="basic">Basic認証</option>
          <option value="bearer">Bearer Token</option>
          <option value="api-key">API Key</option>
        </select>
      </div>

      {currentAuth.type === 'basic' && (
        <div className={styles.basicAuth}>
          <div className={styles.fieldGroup}>
            <label htmlFor="basic-username">ユーザー名:</label>
            <input
              id="basic-username"
              type="text"
              value={currentAuth.basic?.username || ''}
              onChange={(e) => handleBasicChange('username', e.target.value)}
              placeholder="ユーザー名を入力"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="basic-password">パスワード:</label>
            <input
              id="basic-password"
              type="password"
              value={currentAuth.basic?.password || ''}
              onChange={(e) => handleBasicChange('password', e.target.value)}
              placeholder="パスワードを入力"
              className={styles.input}
            />
          </div>
        </div>
      )}

      {currentAuth.type === 'bearer' && (
        <div className={styles.bearerAuth}>
          <div className={styles.fieldGroup}>
            <label htmlFor="bearer-token">Token:</label>
            <input
              id="bearer-token"
              type="text"
              value={currentAuth.bearer?.token || ''}
              onChange={(e) => handleBearerChange(e.target.value)}
              placeholder="Bearer tokenを入力"
              className={styles.input}
            />
          </div>
        </div>
      )}

      {currentAuth.type === 'api-key' && (
        <div className={styles.apiKeyAuth}>
          <div className={styles.fieldGroup}>
            <label htmlFor="apikey-key">キー名:</label>
            <input
              id="apikey-key"
              type="text"
              value={currentAuth.apiKey?.key || ''}
              onChange={(e) => handleApiKeyChange('key', e.target.value)}
              placeholder="API Keyの名前（例: X-API-Key）"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="apikey-value">値:</label>
            <input
              id="apikey-value"
              type="text"
              value={currentAuth.apiKey?.value || ''}
              onChange={(e) => handleApiKeyChange('value', e.target.value)}
              placeholder="API Keyの値"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="apikey-location">配置場所:</label>
            <select
              id="apikey-location"
              value={currentAuth.apiKey?.location || 'header'}
              onChange={(e) => handleApiKeyChange('location', e.target.value as ApiKeyLocation)}
              className={styles.select}
            >
              <option value="header">Header</option>
              <option value="query">Query Parameter</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
