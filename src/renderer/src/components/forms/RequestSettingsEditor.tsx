import { JSX, useId } from 'react'
import { RequestSettings, DEFAULT_REQUEST_SETTINGS } from '@/types/types'
import styles from './RequestSettingsEditor.module.scss'

interface RequestSettingsEditorProps {
  settings?: RequestSettings
  onChange: (settings: RequestSettings) => void
}

export const RequestSettingsEditor = ({
  settings,
  onChange
}: RequestSettingsEditorProps): JSX.Element => {
  const currentSettings = settings || DEFAULT_REQUEST_SETTINGS
  const timeoutId = useId()
  const maxRedirectsId = useId()
  const userAgentId = useId()

  const handleTimeoutChange = (timeout: number) => {
    onChange({ ...currentSettings, timeout })
  }

  const handleFollowRedirectsChange = (followRedirects: boolean) => {
    onChange({ ...currentSettings, followRedirects })
  }

  const handleMaxRedirectsChange = (maxRedirects: number) => {
    onChange({ ...currentSettings, maxRedirects })
  }

  const handleValidateSSLChange = (validateSSL: boolean) => {
    onChange({ ...currentSettings, validateSSL })
  }

  const handleUserAgentChange = (userAgent: string) => {
    onChange({ ...currentSettings, userAgent: userAgent || undefined })
  }

  return (
    <div className={styles.requestSettingsEditor}>
      <div className={styles.header}>
        <h3>このリクエストの設定</h3>
        <p className={styles.description}>
          このリクエスト専用の設定です。空欄の場合はグローバル設定が使用されます。
        </p>
      </div>

      <div className={styles.settingsGrid}>
        <div className={styles.fieldGroup}>
          <label htmlFor={timeoutId}>タイムアウト (ミリ秒):</label>
          <input
            id={timeoutId}
            type="number"
            min="1000"
            max="300000"
            step="1000"
            value={currentSettings.timeout}
            onChange={(e) => handleTimeoutChange(parseInt(e.target.value, 10))}
            className={styles.input}
          />
          <span className={styles.hint}>1秒 = 1000ミリ秒（推奨: 30000）</span>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={currentSettings.followRedirects}
              onChange={(e) => handleFollowRedirectsChange(e.target.checked)}
            />
            <span>リダイレクトを自動フォロー</span>
          </label>
          <span className={styles.hint}>
            有効にすると3xx系レスポンスで自動的にリダイレクト先にリクエストします
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={maxRedirectsId}>最大リダイレクト回数:</label>
          <input
            id={maxRedirectsId}
            type="number"
            min="0"
            max="20"
            value={currentSettings.maxRedirects}
            onChange={(e) => handleMaxRedirectsChange(parseInt(e.target.value, 10))}
            disabled={!currentSettings.followRedirects}
            className={styles.input}
          />
          <span className={styles.hint}>無限ループを防ぐための上限（推奨: 5）</span>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={currentSettings.validateSSL}
              onChange={(e) => handleValidateSSLChange(e.target.checked)}
            />
            <span>SSL証明書を検証</span>
          </label>
          <span className={styles.hint}>
            無効にすると自己署名証明書や期限切れ証明書でもリクエストを送信します
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={userAgentId}>User-Agent:</label>
          <input
            id={userAgentId}
            type="text"
            value={currentSettings.userAgent || ''}
            onChange={(e) => handleUserAgentChange(e.target.value)}
            placeholder={DEFAULT_REQUEST_SETTINGS.userAgent}
            className={styles.input}
          />
          <span className={styles.hint}>空欄の場合はデフォルト値を使用</span>
        </div>
      </div>

      <div className={styles.presets}>
        <h4>プリセット設定</h4>
        <div className={styles.presetButtons}>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_REQUEST_SETTINGS)}
            className={styles.presetButton}
          >
            デフォルト
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                timeout: 5000,
                followRedirects: false,
                maxRedirects: 0,
                validateSSL: true,
                userAgent: 'API Tester Fast Mode'
              })
            }
            className={styles.presetButton}
          >
            高速モード
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                timeout: 120000,
                followRedirects: true,
                maxRedirects: 10,
                validateSSL: false,
                userAgent: 'API Tester Development Mode'
              })
            }
            className={styles.presetButton}
          >
            開発モード
          </button>
        </div>
      </div>
    </div>
  )
}
