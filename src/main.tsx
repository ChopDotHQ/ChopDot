import { StrictMode, Component, ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { AccountProvider } from './contexts/AccountContext'
import { AccountProviderLuno } from './contexts/AccountContextLuno'
import { EvmAccountProvider } from './contexts/EvmAccountContext'
import { DataProvider } from './services/data/DataContext'

// Simple error boundary to catch render errors and show them
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace', background: '#000', color: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: '#f00' }}>App Error</h1>
          <pre style={{ background: '#222', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Hide loading spinner
const loadingEl = document.getElementById('loading')
if (loadingEl) {
  loadingEl.style.display = 'none'
}

const rootEl = document.getElementById('root')!

const isFlagEnabled = (value?: string) =>
  value === '1' || value?.toLowerCase() === 'true';

const enableLunoKit = isFlagEnabled(import.meta.env.VITE_ENABLE_LUNOKIT);
const enableEmbeddedWallet = isFlagEnabled(import.meta.env.VITE_ENABLE_EMBEDDED_WALLET);

const PolkadotProviderComponent = enableLunoKit ? AccountProviderLuno : AccountProvider;

const renderWithProviders = (content: ReactNode) => (
  <StrictMode>
    <ErrorBoundary>
      <PolkadotProviderComponent>
        <EvmAccountProvider enabled={enableEmbeddedWallet}>
          <DataProvider>
            {content}
          </DataProvider>
        </EvmAccountProvider>
      </PolkadotProviderComponent>
    </ErrorBoundary>
  </StrictMode>
);

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
      renderWithProviders(<ChainTestPage />),
    )
  })()
  } else {
  createRoot(rootEl).render(
    renderWithProviders(<App />),
)
}
