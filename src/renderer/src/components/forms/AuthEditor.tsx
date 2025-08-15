import { JSX, useId } from 'react'
import { AuthConfig, AuthType, ApiKeyLocation } from '@/types/types'
import styles from './AuthEditor.module.scss'

interface AuthEditorProps {
  auth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}

export const AuthEditor = ({ auth, onChange }: AuthEditorProps): JSX.Element => {
  const currentAuth = auth || { type: 'none' }
  const authTypeId = useId()
  const basicUserNameId = useId()
  const basicPasswordId = useId()
  const bearerTokenId = useId()
  const apiKeyKeyId = useId()
  const apiKeyValueId = useId()
  const apiKeyLocationId = useId()

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
        <label htmlFor={authTypeId}>認証タイプ:</label>
        <select
          id={authTypeId}
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
            <label htmlFor={basicUserNameId}>ユーザー名:</label>
            <input
              id={basicUserNameId}
              type="text"
              value={currentAuth.basic?.username || ''}
              onChange={(e) => handleBasicChange('username', e.target.value)}
              placeholder="ユーザー名を入力"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor={basicPasswordId}>パスワード:</label>
            <input
              id={basicPasswordId}
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
            <label htmlFor={bearerTokenId}>Token:</label>
            <input
              id={bearerTokenId}
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
            <label htmlFor={apiKeyKeyId}>キー名:</label>
            <input
              id={apiKeyKeyId}
              type="text"
              value={currentAuth.apiKey?.key || ''}
              onChange={(e) => handleApiKeyChange('key', e.target.value)}
              placeholder="API Keyの名前（例: X-API-Key）"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor={apiKeyValueId}>値:</label>
            <input
              id={apiKeyValueId}
              type="text"
              value={currentAuth.apiKey?.value || ''}
              onChange={(e) => handleApiKeyChange('value', e.target.value)}
              placeholder="API Keyの値"
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor={apiKeyLocationId}>配置場所:</label>
            <select
              id={apiKeyLocationId}
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
