import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { inject } from '@vercel/analytics'
import "./styles/tokens.css"
import "./styles/global.css"

// Initialize analytics
if (typeof window !== 'undefined') {
  inject()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
