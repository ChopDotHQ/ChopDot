import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

// Explicit preview mode: do not inherit a hosted database from shell/.env
// or start Supabase. Integration development keeps using npm run dev.
Object.assign(process.env, {
  VITE_DATA_SOURCE: 'local',
  VITE_SUPABASE_STRICT: 'false',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'replace_me',
  VITE_WALLETCONNECT_PROJECT_ID: '',
  VITE_ENABLE_PVM_CLOSEOUT: '0',
  VITE_SIMULATE_CHAIN: '0',
});

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: {host: '127.0.0.1', port: 5173, strictPort: true, open: false},
});
await server.listen();
server.printUrls();
console.log('Frontend preview only: auth, shared sync, uploads and payments are not configured.');
