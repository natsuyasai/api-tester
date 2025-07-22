import './assets/main.css'
import './styles/themes.scss'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApiServiceV2 } from '@/services/apiServiceV2'
import App from './App'
import { useCookieStore } from './stores/cookieStore'

// クッキーリゾルバーの設定
ApiServiceV2.setCookieResolver((domain: string) => {
  return useCookieStore.getState().formatCookieHeader(domain)
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
