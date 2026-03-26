import { StrictMode, Component, ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import { AccountProvider } from './contexts/AccountContext'
import { AccountProviderLuno } from './contexts/AccountContextLuno'
import { EvmAccountProvider } from './contexts/EvmAccountContext'
import { DataProvider } from './services/data/DataContext'
import { DataLayerErrorBoundary } from './components/DataLayerErrorBoundary'
import { requireValidEnvironment } from './utils/envValidation'
import { initErrorTracking, reportError } from './utils/errorTracking'

// Validate required environment variables before app starts
requireValidEnvironment();
initErrorTracking();

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
    reportError(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--background, #09090b)', color: 'var(--foreground, #fafafa)',
          padding: '24px', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'var(--accent, #e6007a)', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              ChopDot Crashed
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground, #a1a1aa)', marginBottom: '20px' }}>
              An unexpected error occurred. Your data is safe.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'var(--muted, #27272a)', borderRadius: '8px',
                padding: '12px', fontSize: '12px', textAlign: 'left',
                overflow: 'auto', marginBottom: '20px', color: 'var(--muted-foreground, #a1a1aa)',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: '12px', fontSize: '14px',
                fontWeight: 500, background: 'var(--accent, #e6007a)',
                color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
              }}
            >
              Reload App
            </button>
          </div>
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
          <DataLayerErrorBoundary>
            <DataProvider>
              {content}
            </DataProvider>
          </DataLayerErrorBoundary>
        </EvmAccountProvider>
      </PolkadotProviderComponent>
    </ErrorBoundary>
  </StrictMode>
);

async function ensureCryptoReady() {
  try {
    const { cryptoWaitReady } = await import('@polkadot/util-crypto');
    await cryptoWaitReady();
  } catch (error) {
    console.warn('[main] Failed to initialize Polkadot crypto utilities:', error);
  }
}

// Polyfill Buffer for deps that expect it in the browser
if (!(window as any).Buffer) {
  import('buffer').then(({ Buffer }) => {
    (window as any).Buffer = Buffer
  })
}

async function bootstrapApp() {
  await ensureCryptoReady();

  // Throwaway path-level page: /chain-test (dev only)
  if (import.meta.env.DEV && window.location.pathname === '/chain-test') {
    const { ChainTestPage } = await import('./chain/chain-test-page');
    createRoot(rootEl).render(
      renderWithProviders(<ChainTestPage />),
    );
    return;
  }

  if (window.location.pathname === '/reset-password') {
    const { default: ResetPasswordScreen } = await import('./components/screens/ResetPasswordScreen');
    createRoot(rootEl).render(
      renderWithProviders(<ResetPasswordScreen />),
    );
    return;
  }

  createRoot(rootEl).render(
    renderWithProviders(<App />),
  );
}

void bootstrapApp();
