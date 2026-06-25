import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChopDotDotLab } from './lab/chopdot-dot/ChopDotDotLab';
import { modeFromQuery } from './lab/chopdot-dot/dotLabScenarios';
import './index.css';
import './styles/globals.css';

function resolveInitialMode(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = modeFromQuery(params.get('mode'));
  if (fromQuery) {
    return fromQuery;
  }
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.dot.li')) {
    return 'savings_circle';
  }
  if (import.meta.env.VITE_BUILD_PROFILE === 'dot-host') {
    return 'savings_circle';
  }
  return null;
}

const initialMode = resolveInitialMode();

if (initialMode && !new URLSearchParams(window.location.search).get('mode')) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', initialMode);
  window.history.replaceState({}, '', url.toString());
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

createRoot(rootEl).render(
  <StrictMode>
    <ChopDotDotLab modeParam={initialMode ?? 'savings_circle'} />
  </StrictMode>,
);
