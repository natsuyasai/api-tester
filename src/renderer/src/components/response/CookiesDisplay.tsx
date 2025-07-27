import { JSX } from 'react'
import { ApiResponse, Cookie } from '@/types/types'
import { useCookieStore } from '@renderer/stores/cookieStore'
import { extractCookiesFromResponse } from '@renderer/utils/cookieUtils'
import styles from './CookiesDisplay.module.scss'

interface CookiesDisplayProps {
  response: ApiResponse
  requestUrl: string
}

export const CookiesDisplay = ({ response, requestUrl }: CookiesDisplayProps): JSX.Element => {
  const { cookies: storedCookies, updateCookie, addCookie } = useCookieStore()

  // レスポンスからCookieを抽出
  const responseCookies = extractCookiesFromResponse(response.headers, requestUrl)

  // Cookie をストアに追加
  const handleAddCookie = (cookie: Cookie) => {
    // 既存のCookieと同じname+domainの組み合わせがあるかチェック
    const existingCookie = storedCookies.find(
      (stored) => stored.name === cookie.name && stored.domain === cookie.domain
    )

    if (existingCookie) {
      // 既存のCookieを更新
      updateCookie(existingCookie.id, {
        value: cookie.value,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        enabled: true
      })
    } else {
      // 新しいCookieとして追加（addCookieを使って空のCookieを作成してから更新）
      addCookie()
      const newCookies = useCookieStore.getState().cookies
      const newCookie = newCookies[newCookies.length - 1]

      updateCookie(newCookie.id, {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        enabled: true
      })
    }
  }

  if (responseCookies.length === 0) {
    return (
      <div className={styles.noCookies}>
        <p>No cookies found in response</p>
      </div>
    )
  }

  return (
    <div className={styles.cookiesContainer}>
      <div className={styles.header}>
        <h4>Cookies ({responseCookies.length})</h4>
        <button
          type="button"
          className={styles.addAllButton}
          onClick={() => responseCookies.forEach(handleAddCookie)}
        >
          Add All to Cookie Store
        </button>
      </div>

      <div className={styles.cookiesList}>
        {responseCookies.map((cookie, index) => (
          <div key={index} className={styles.cookieItem}>
            <div className={styles.cookieHeader}>
              <div className={styles.cookieName}>
                <strong>{cookie.name}</strong>
                <span className={styles.cookieValue}>{cookie.value}</span>
              </div>
              <button
                type="button"
                className={styles.addButton}
                onClick={() => handleAddCookie(cookie)}
                title="Add to Cookie Store"
              >
                + Add
              </button>
            </div>

            <div className={styles.cookieDetails}>
              {cookie.domain && (
                <div className={styles.detail}>
                  <span className={styles.label}>Domain:</span>
                  <span className={styles.value}>{cookie.domain}</span>
                </div>
              )}

              {cookie.path && (
                <div className={styles.detail}>
                  <span className={styles.label}>Path:</span>
                  <span className={styles.value}>{cookie.path}</span>
                </div>
              )}

              {cookie.expires && (
                <div className={styles.detail}>
                  <span className={styles.label}>Expires:</span>
                  <span className={styles.value}>{new Date(cookie.expires).toLocaleString()}</span>
                </div>
              )}

              <div className={styles.flags}>
                {cookie.httpOnly && <span className={styles.flag}>HttpOnly</span>}
                {cookie.secure && <span className={styles.flag}>Secure</span>}
                {cookie.sameSite && <span className={styles.flag}>SameSite={cookie.sameSite}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
