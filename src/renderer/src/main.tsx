import './assets/main.css'
import './styles/themes.scss'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// クッキーリゾルバーは初期化サービスで設定されるため、ここでは設定しない

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
