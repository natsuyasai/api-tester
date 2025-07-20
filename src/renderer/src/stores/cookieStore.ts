import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Cookie, CookieStore } from '@/types/types'

interface CookieState extends CookieStore {
  // クッキー管理
  addCookie: () => void
  updateCookie: (id: string, cookie: Partial<Omit<Cookie, 'id'>>) => void
  removeCookie: (id: string) => void

  // クッキー解決
  getCookiesForDomain: (domain: string) => Cookie[]
  formatCookieHeader: (domain: string) => string
  getEnabledCookies: () => Cookie[]
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const createDefaultCookies = (): Cookie[] => [
  {
    id: 'session-example',
    name: 'session_id',
    value: 'abc123def456',
    domain: 'example.com',
    path: '/',
    enabled: true,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  },
  {
    id: 'auth-token',
    name: 'auth_token',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    domain: 'api.example.com',
    path: '/api',
    enabled: true,
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  }
]

const initialState: CookieStore = {
  cookies: createDefaultCookies()
}

export const useCookieStore = create<CookieState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      addCookie: () => {
        const newCookie: Cookie = {
          id: generateId(),
          name: '',
          value: '',
          domain: '',
          path: '/',
          enabled: false,
          secure: false,
          httpOnly: false,
          sameSite: 'Lax'
        }
        set(
          (state) => ({
            cookies: [...state.cookies, newCookie]
          }),
          false,
          'addCookie'
        )
      },

      updateCookie: (id: string, cookieUpdate: Partial<Omit<Cookie, 'id'>>) => {
        set(
          (state) => ({
            cookies: state.cookies.map((cookie) =>
              cookie.id === id ? { ...cookie, ...cookieUpdate } : cookie
            )
          }),
          false,
          'updateCookie'
        )
      },

      removeCookie: (id: string) => {
        set(
          (state) => ({
            cookies: state.cookies.filter((cookie) => cookie.id !== id)
          }),
          false,
          'removeCookie'
        )
      },

      getCookiesForDomain: (domain: string) => {
        const cookies = get().cookies.filter((cookie) => cookie.enabled)
        return cookies.filter((cookie) => {
          // ドメインのマッチング: cookie.domain が空の場合はすべてのドメインにマッチ
          if (!cookie.domain) return true

          // 完全一致
          if (cookie.domain === domain) return true

          // サブドメインマッチング (.example.com は subdomain.example.com にマッチ)
          if (cookie.domain.startsWith('.') && domain.endsWith(cookie.domain.substring(1))) {
            return true
          }

          return false
        })
      },

      formatCookieHeader: (domain: string) => {
        const cookies = get().getCookiesForDomain(domain)
        return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
      },

      getEnabledCookies: () => {
        return get().cookies.filter((cookie) => cookie.enabled)
      }
    }),
    {
      name: 'cookie-store'
    }
  )
)
