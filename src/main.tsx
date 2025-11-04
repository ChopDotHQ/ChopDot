import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { WalletProvider } from './wallet/WalletProvider'
import { LightClientProvider } from './chain/LightClientProvider'

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
