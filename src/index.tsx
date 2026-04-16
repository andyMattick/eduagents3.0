import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { inject } from '@vercel/analytics'
import "./styles/tokens.css"
import "./styles/global.css"

if (!import.meta.env.VITE_GOOGLE_API_KEY) {
  console.warn("VITE_GOOGLE_API_KEY not set: frontend Gemini direct calls are disabled; backend/API flows still work.");
}

// Initialize analytics
if (typeof window !== 'undefined') {
  inject()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
