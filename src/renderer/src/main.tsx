import './assets/main.css'
import './styles/themes.scss'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { IpcApiService } from '@renderer/services/ipcApiService'
import App from './App'
import { useCookieStore } from './stores/cookieStore'

// クッキーリゾルバーの設定
IpcApiService.setCookieResolver((domain: string) => {
  return useCookieStore.getState().formatCookieHeader(domain)
}).catch(error => {
  console.error('Cookie resolver設定でエラーが発生:', error)
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
