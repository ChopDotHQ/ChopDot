import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { AccountProvider } from './contexts/AccountContext'

// Hide loading spinner
const loadingEl = document.getElementById('loading')
if (loadingEl) {
  loadingEl.style.display = 'none'
}

const rootEl = document.getElementById('root')!

// Polyfill Buffer for deps that expect it in the browser
if (!(window as any).Buffer) {
  import('buffer').then(({ Buffer }) => {
    (window as any).Buffer = Buffer
  })
}

// Throwaway path-level page: /chain-test
if (window.location.pathname === '/chain-test') {
  (async () => {
    const { ChainTestPage } = await import('./chain/chain-test-page');
    createRoot(rootEl).render(
      <StrictMode>
        <AccountProvider>
          <ChainTestPage />
        </AccountProvider>
      </StrictMode>,
    )
  })()
} else {
  createRoot(rootEl).render(
  <StrictMode>
      <AccountProvider>
    <App />
      </AccountProvider>
  </StrictMode>,
)
}
