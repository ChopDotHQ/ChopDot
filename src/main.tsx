import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadTelegramWebAppScript } from './telegramBootstrap.ts';
import {bootstrapPolkadotHostDeveloperChecks} from './environment/bootstrapPolkadotHost.ts';

loadTelegramWebAppScript();
void bootstrapPolkadotHostDeveloperChecks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
