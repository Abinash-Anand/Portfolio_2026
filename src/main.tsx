import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { createVercelAnalytics } from './app/infrastructure/vercelAnalytics'

const analytics = createVercelAnalytics(import.meta.env.PROD && import.meta.env.VITE_PORTFOLIO_ANALYTICS === 'vercel')
if (import.meta.hot) import.meta.hot.dispose(() => analytics.dispose())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App analytics={analytics.port} />
  </React.StrictMode>,
)
