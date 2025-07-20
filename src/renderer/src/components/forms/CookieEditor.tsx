import { JSX } from 'react'
import { Cookie } from '@/types/types'
import { useCookieStore } from '@renderer/stores/cookieStore'
import styles from './CookieEditor.module.scss'

export const CookieEditor = (): JSX.Element => {
  const { cookies, addCookie, updateCookie, removeCookie } = useCookieStore()

  const handleCookieChange = (
    id: string,
    field: keyof Omit<Cookie, 'id'>,
    value: string | boolean
  ) => {
    updateCookie(id, { [field]: value })
  }

  const handleAddCookie = () => {
    addCookie()
  }

  const handleRemoveCookie = (id: string) => {
    removeCookie(id)
  }

  return (
    <div className={styles.cookieEditor}>
      <div className={styles.header}>
        <h3>クッキー管理</h3>
        <p className={styles.description}>
          リクエストに自動的に含まれるクッキーを管理します。ドメインとパスに基づいてクッキーが自動選択されます。
        </p>
      </div>

      <div className={styles.cookiesContainer}>
        <div className={styles.cookiesHeader}>
          <div className={styles.columnHeader}>有効</div>
          <div className={styles.columnHeader}>名前</div>
          <div className={styles.columnHeader}>値</div>
          <div className={styles.columnHeader}>ドメイン</div>
          <div className={styles.columnHeader}>パス</div>
          <div className={styles.columnHeader}>Secure</div>
          <div className={styles.columnHeader}>HttpOnly</div>
          <div className={styles.columnHeader}>SameSite</div>
          <div className={styles.columnHeader}>操作</div>
        </div>

        <div className={styles.cookiesList}>
          {cookies.map((cookie) => (
            <div key={cookie.id} className={styles.cookieRow}>
              <div className={styles.enabledColumn}>
                <input
                  type="checkbox"
                  checked={cookie.enabled}
                  onChange={(e) => handleCookieChange(cookie.id, 'enabled', e.target.checked)}
                  className={styles.checkbox}
                />
              </div>

              <div className={styles.nameColumn}>
                <input
                  type="text"
                  value={cookie.name}
                  onChange={(e) => {
                    handleCookieChange(cookie.id, 'name', e.target.value)
                    // 名前に入力があった場合、自動的にチェックボックスを有効にする
                    if (e.target.value.trim() && !cookie.enabled) {
                      handleCookieChange(cookie.id, 'enabled', true)
                    }
                  }}
                  placeholder="クッキー名"
                  className={styles.input}
                />
              </div>

              <div className={styles.valueColumn}>
                <input
                  type="text"
                  value={cookie.value}
                  onChange={(e) => {
                    handleCookieChange(cookie.id, 'value', e.target.value)
                    // 値に入力があった場合、自動的にチェックボックスを有効にする
                    if (e.target.value.trim() && !cookie.enabled) {
                      handleCookieChange(cookie.id, 'enabled', true)
                    }
                  }}
                  placeholder="クッキー値"
                  className={styles.input}
                />
              </div>

              <div className={styles.domainColumn}>
                <input
                  type="text"
                  value={cookie.domain}
                  onChange={(e) => handleCookieChange(cookie.id, 'domain', e.target.value)}
                  placeholder="example.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.pathColumn}>
                <input
                  type="text"
                  value={cookie.path}
                  onChange={(e) => handleCookieChange(cookie.id, 'path', e.target.value)}
                  placeholder="/"
                  className={styles.input}
                />
              </div>

              <div className={styles.secureColumn}>
                <input
                  type="checkbox"
                  checked={cookie.secure || false}
                  onChange={(e) => handleCookieChange(cookie.id, 'secure', e.target.checked)}
                  className={styles.checkbox}
                />
              </div>

              <div className={styles.httpOnlyColumn}>
                <input
                  type="checkbox"
                  checked={cookie.httpOnly || false}
                  onChange={(e) => handleCookieChange(cookie.id, 'httpOnly', e.target.checked)}
                  className={styles.checkbox}
                />
              </div>

              <div className={styles.sameSiteColumn}>
                <select
                  value={cookie.sameSite || 'Lax'}
                  onChange={(e) => handleCookieChange(cookie.id, 'sameSite', e.target.value)}
                  className={styles.select}
                >
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div className={styles.actionsColumn}>
                <button
                  onClick={() => handleRemoveCookie(cookie.id)}
                  className={styles.removeButton}
                  type="button"
                  title="クッキーを削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.addCookieSection}>
          <button onClick={handleAddCookie} className={styles.addButton} type="button">
            + クッキーを追加
          </button>
        </div>
      </div>

      <div className={styles.usageExamples}>
        <h4>設定例</h4>
        <div className={styles.examplesList}>
          <div className={styles.example}>
            <strong>セッションクッキー:</strong>
            <code>session_id=abc123; Domain=example.com; Path=/; HttpOnly; Secure</code>
          </div>
          <div className={styles.example}>
            <strong>認証トークン:</strong>
            <code>auth_token=jwt...; Domain=api.example.com; Path=/api; SameSite=Strict</code>
          </div>
          <div className={styles.example}>
            <strong>サブドメイン共有:</strong>
            <code>user_pref=theme; Domain=.example.com; Path=/</code>
          </div>
        </div>
      </div>
    </div>
  )
}
