import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Figma's "send to Figma" capture widget — dev-only, never bundled into
// production builds (import.meta.env.DEV is statically false in prod, so
// Vite drops this whole block during the production build).
if (import.meta.env.DEV) {
  const script = document.createElement('script')
  script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js'
  script.async = true
  document.head.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
