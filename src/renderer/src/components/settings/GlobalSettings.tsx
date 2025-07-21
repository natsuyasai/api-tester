import { JSX, useState, useId } from 'react'
import { AutoSaveStatus } from '@renderer/components/ui/AutoSaveStatus'
import { useAutoSave } from '@renderer/hooks/useAutoSave'
import { useGlobalSettingsStore } from '@renderer/stores/globalSettingsStore'
import { validateProxyUrl } from '@renderer/utils/proxyUtils'
import styles from './GlobalSettings.module.scss'

export const GlobalSettings = (): JSX.Element => {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } =
    useGlobalSettingsStore()
  const { forceSave } = useAutoSave()
  const [importData, setImportData] = useState('')
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [proxyTestResult, setProxyTestResult] = useState<{
    testing: boolean
    result?: { success: boolean; message: string; responseTime?: number; ipAddress?: string }
  }>({ testing: false })

  // IDの生成
  const timeoutId = useId()
  const maxRedirectsId = useId()
  const userAgentId = useId()
  const tabSizeId = useId()
  const maxHistoryId = useId()
  const autoSaveIntervalId = useId()
  const proxyUrlId = useId()
  const proxyUsernameId = useId()
  const proxyPasswordId = useId()

  const handleExport = async () => {
    try {
      const content = exportSettings()
      const result = await window.dialogAPI.showSaveDialog({
        title: 'グローバル設定をエクスポート',
        defaultPath: `api-tester-settings-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        const writeResult = await window.fileAPI.writeFile(result.filePath, content)
        if (!writeResult.success) {
          throw new Error(writeResult.error ?? 'Failed to export settings')
        }
        alert('設定をエクスポートしました')
      }
    } catch (error) {
      console.error('Failed to export settings:', error)
      alert('エクスポートに失敗しました')
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.dialogAPI.showOpenDialog({
        title: 'グローバル設定をインポート',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const readResult = await window.fileAPI.readFile(result.filePaths[0])
        if (readResult.success && readResult.data) {
          if (importSettings(readResult.data)) {
            alert('設定をインポートしました')
          } else {
            alert('無効な設定ファイルです')
          }
        } else {
          throw new Error(readResult.error ?? 'Failed to read file')
        }
      }
    } catch (error) {
      console.error('Failed to import settings:', error)
      alert('インポートに失敗しました')
    }
  }

  const handleImportFromText = () => {
    if (importSettings(importData)) {
      alert('設定をインポートしました')
      setImportData('')
      setShowImportPreview(false)
    } else {
      alert('無効な設定データです')
    }
  }

  const handleReset = () => {
    if (confirm('すべての設定をデフォルトに戻しますか？この操作は元に戻せません。')) {
      resetSettings()
      alert('設定をリセットしました')
    }
  }

  const handleProxyTest = async () => {
    setProxyTestResult({ testing: true })

    try {
      if (!settings.proxyEnabled || !settings.proxyUrl) {
        // プロキシが無効の場合、現在のIPアドレスを取得
        if (window.proxyAPI) {
          const result = await window.proxyAPI.getCurrentIpAddress()
          setProxyTestResult({
            testing: false,
            result: {
              success: true,
              message: 'プロキシは無効です。直接接続でテストしました。',
              ipAddress: result.ipAddress
            }
          })
        }
        return
      }

      // プロキシURLの妥当性をチェック
      const validation = validateProxyUrl(settings.proxyUrl)
      if (!validation.valid) {
        setProxyTestResult({
          testing: false,
          result: {
            success: false,
            message: `プロキシURL検証エラー: ${validation.error}`
          }
        })
        return
      }

      // プロキシテストを実行
      if (window.proxyAPI) {
        const result = await window.proxyAPI.testProxyConnection()
        setProxyTestResult({
          testing: false,
          result
        })
      }
    } catch (error) {
      setProxyTestResult({
        testing: false,
        result: {
          success: false,
          message: `テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })
    }
  }

  return (
    <div className={styles.globalSettings}>
      <div className={styles.header}>
        <h1>グローバル設定</h1>
        <p className={styles.description}>アプリケーション全体の動作とデフォルト値を設定します</p>
      </div>

      <div className={styles.settingsContainer}>
        {/* リクエストのデフォルト設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>デフォルトリクエスト設定</h2>
            <p className={styles.sectionDescription}>新しいリクエストを作成する際のデフォルト値</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.fieldGroup}>
              <label htmlFor={timeoutId}>デフォルトタイムアウト (ミリ秒):</label>
              <input
                id={timeoutId}
                type="number"
                min="1000"
                max="300000"
                step="1000"
                value={settings.defaultTimeout}
                onChange={(e) => updateSettings({ defaultTimeout: parseInt(e.target.value, 10) })}
                className={styles.input}
              />
              <span className={styles.hint}>新しいリクエストのデフォルトタイムアウト</span>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.defaultFollowRedirects}
                  onChange={(e) => updateSettings({ defaultFollowRedirects: e.target.checked })}
                />
                <span>デフォルトでリダイレクトをフォロー</span>
              </label>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={maxRedirectsId}>デフォルト最大リダイレクト回数:</label>
              <input
                id={maxRedirectsId}
                type="number"
                min="0"
                max="20"
                value={settings.defaultMaxRedirects}
                onChange={(e) =>
                  updateSettings({ defaultMaxRedirects: parseInt(e.target.value, 10) })
                }
                className={styles.input}
              />
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.defaultValidateSSL}
                  onChange={(e) => updateSettings({ defaultValidateSSL: e.target.checked })}
                />
                <span>デフォルトでSSL証明書を検証</span>
              </label>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={userAgentId}>デフォルトUser-Agent:</label>
              <input
                id={userAgentId}
                type="text"
                value={settings.defaultUserAgent}
                onChange={(e) => updateSettings({ defaultUserAgent: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* UI設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>UI設定</h2>
            <p className={styles.sectionDescription}>アプリケーションの外観と操作性</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>テーマ:</span>
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={settings.theme === 'light'}
                    onChange={() => updateSettings({ theme: 'light' })}
                  />
                  <span>ライト</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={settings.theme === 'dark'}
                    onChange={() => updateSettings({ theme: 'dark' })}
                  />
                  <span>ダーク</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="theme"
                    value="auto"
                    checked={settings.theme === 'auto'}
                    onChange={() => updateSettings({ theme: 'auto' })}
                  />
                  <span>システム設定に従う</span>
                </label>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>フォントサイズ:</span>
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fontSize"
                    value="small"
                    checked={settings.fontSize === 'small'}
                    onChange={() => updateSettings({ fontSize: 'small' })}
                  />
                  <span>小</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fontSize"
                    value="medium"
                    checked={settings.fontSize === 'medium'}
                    onChange={() => updateSettings({ fontSize: 'medium' })}
                  />
                  <span>中</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fontSize"
                    value="large"
                    checked={settings.fontSize === 'large'}
                    onChange={() => updateSettings({ fontSize: 'large' })}
                  />
                  <span>大</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* エディタ設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>エディタ設定</h2>
            <p className={styles.sectionDescription}>JSONエディタやコード表示の設定</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.rangeGroup}>
              <label htmlFor={tabSizeId}>タブサイズ:</label>
              <div className={styles.rangeContainer}>
                <input
                  id={tabSizeId}
                  type="range"
                  min="2"
                  max="8"
                  step="2"
                  value={settings.tabSize}
                  onChange={(e) => updateSettings({ tabSize: parseInt(e.target.value, 10) })}
                  className={styles.rangeInput}
                />
                <span className={styles.rangeValue}>{settings.tabSize}</span>
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.wordWrap}
                  onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
                />
                <span>自動改行</span>
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.lineNumbers}
                  onChange={(e) => updateSettings({ lineNumbers: e.target.checked })}
                />
                <span>行番号を表示</span>
              </label>
            </div>
          </div>
        </div>

        {/* アプリケーション設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>アプリケーション設定</h2>
            <p className={styles.sectionDescription}>自動保存やアップデートなどの一般的な設定</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                />
                <span>自動保存</span>
              </label>
              <span className={styles.hint}>変更を自動的に保存します</span>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={autoSaveIntervalId}>自動保存間隔 (秒):</label>
              <input
                id={autoSaveIntervalId}
                type="number"
                min="10"
                max="300"
                step="10"
                value={settings.autoSaveInterval}
                onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value, 10) })}
                disabled={!settings.autoSave}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <AutoSaveStatus />
              <button
                type="button"
                onClick={forceSave}
                className={styles.secondaryButton}
                disabled={!settings.autoSave}
              >
                手動保存を実行
              </button>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.saveHistory}
                  onChange={(e) => updateSettings({ saveHistory: e.target.checked })}
                />
                <span>履歴を保存</span>
              </label>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={maxHistoryId}>最大履歴数:</label>
              <input
                id={maxHistoryId}
                type="number"
                min="10"
                max="1000"
                step="10"
                value={settings.maxHistorySize}
                onChange={(e) => updateSettings({ maxHistorySize: parseInt(e.target.value, 10) })}
                disabled={!settings.saveHistory}
                className={styles.input}
              />
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.checkForUpdates}
                  onChange={(e) => updateSettings({ checkForUpdates: e.target.checked })}
                />
                <span>アップデートを自動チェック</span>
              </label>
            </div>
          </div>
        </div>

        {/* プロキシ設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>プロキシ設定</h2>
            <p className={styles.sectionDescription}>ネットワークプロキシの設定</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.proxyEnabled}
                  onChange={(e) => updateSettings({ proxyEnabled: e.target.checked })}
                />
                <span>プロキシを使用</span>
              </label>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={proxyUrlId}>プロキシURL:</label>
              <input
                id={proxyUrlId}
                type="text"
                value={settings.proxyUrl || ''}
                onChange={(e) => updateSettings({ proxyUrl: e.target.value || undefined })}
                disabled={!settings.proxyEnabled}
                placeholder="http://proxy.example.com:8080"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={proxyUsernameId}>プロキシユーザー名:</label>
              <input
                id={proxyUsernameId}
                type="text"
                value={settings.proxyAuth?.username || ''}
                onChange={(e) =>
                  updateSettings({
                    proxyAuth: {
                      ...settings.proxyAuth,
                      username: e.target.value,
                      password: settings.proxyAuth?.password || ''
                    }
                  })
                }
                disabled={!settings.proxyEnabled}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={proxyPasswordId}>プロキシパスワード:</label>
              <input
                id={proxyPasswordId}
                type="password"
                value={settings.proxyAuth?.password || ''}
                onChange={(e) =>
                  updateSettings({
                    proxyAuth: {
                      ...settings.proxyAuth,
                      username: settings.proxyAuth?.username || '',
                      password: e.target.value
                    }
                  })
                }
                disabled={!settings.proxyEnabled}
                className={styles.input}
              />
            </div>

            <div className={styles.proxyTestSection}>
              <button
                type="button"
                onClick={() => void handleProxyTest()}
                disabled={proxyTestResult.testing}
                className={styles.testButton}
              >
                {proxyTestResult.testing ? '接続テスト中...' : 'プロキシ接続テスト'}
              </button>

              {proxyTestResult.result && (
                <div
                  className={`${styles.testResult} ${proxyTestResult.result.success ? styles.success : styles.error}`}
                >
                  <div className={styles.testMessage}>{proxyTestResult.result.message}</div>
                  {proxyTestResult.result.success && (
                    <div className={styles.testDetails}>
                      {proxyTestResult.result.ipAddress && (
                        <div>IP Address: {proxyTestResult.result.ipAddress}</div>
                      )}
                      {proxyTestResult.result.responseTime && (
                        <div>Response Time: {proxyTestResult.result.responseTime}ms</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 開発者設定 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>開発者設定</h2>
            <p className={styles.sectionDescription}>デバッグやセキュリティに関する設定</p>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.debugLogs}
                  onChange={(e) => updateSettings({ debugLogs: e.target.checked })}
                />
                <span>デバッグログ</span>
              </label>
              <span className={styles.hint}>詳細なログ出力を有効にします</span>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.allowInsecureConnections}
                  onChange={(e) => updateSettings({ allowInsecureConnections: e.target.checked })}
                />
                <span>安全でない接続を許可</span>
              </label>
              <span className={styles.hint}>
                HTTPSでない接続や無効な証明書を許可します（非推奨）
              </span>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.certificateValidation}
                  onChange={(e) => updateSettings({ certificateValidation: e.target.checked })}
                />
                <span>証明書の検証</span>
              </label>
            </div>
          </div>
        </div>

        {/* 設定のインポート/エクスポート */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>設定のバックアップ</h2>
            <p className={styles.sectionDescription}>設定をファイルで保存・復元</p>
          </div>

          <div className={styles.importExport}>
            <div className={styles.settingsGrid}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>設定をテキストからインポート:</span>
                <textarea
                  value={importData}
                  onChange={(e) => {
                    setImportData(e.target.value)
                    setShowImportPreview(!!e.target.value.trim())
                  }}
                  placeholder="設定のJSONデータをここに貼り付けてください"
                  className={styles.textarea}
                />
                {showImportPreview && (
                  <button
                    type="button"
                    onClick={handleImportFromText}
                    className={styles.primaryButton}
                  >
                    設定をインポート
                  </button>
                )}
              </div>

              {showImportPreview && (
                <div className={styles.previewContainer}>
                  <div className={styles.previewTitle}>プレビュー:</div>
                  <div className={styles.previewContent}>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(importData), null, 2)
                      } catch {
                        return '無効なJSONデータです'
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className={styles.actionButtons}>
        <button type="button" onClick={() => void handleExport()} className={styles.primaryButton}>
          設定をエクスポート
        </button>

        <button
          type="button"
          onClick={() => void handleImport()}
          className={styles.secondaryButton}
        >
          ファイルからインポート
        </button>

        <button type="button" onClick={handleReset} className={styles.dangerButton}>
          設定をリセット
        </button>
      </div>
    </div>
  )
}
