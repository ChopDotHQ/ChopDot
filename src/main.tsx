import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'

// Hide loading spinner
const loadingEl = document.getElementById('loading')
if (loadingEl) {
  loadingEl.style.display = 'none'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
