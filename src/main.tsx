import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { WalletProvider } from './wallet/WalletProvider'
import { LightClientProvider } from './chain/LightClientProvider'
// Polyfill Node Buffer for libraries that expect it in the browser
import { Buffer } from 'buffer/'
;(window as any).Buffer = (window as any).Buffer || Buffer

// Hide loading spinner
const loadingEl = document.getElementById('loading')
if (loadingEl) {
  loadingEl.style.display = 'none'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LightClientProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </LightClientProvider>
  </StrictMode>,
)
