import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import {
  DOT_SESSION_GENESIS_HASH,
  dotInviteAccessEventHash,
  dotSessionEventHash,
  type DotInviteAccessEvent,
  type DotSessionEvent,
} from './src/chopdot-dot/polkadotSession'

function statementStoreKey(chapterId: string, sessionId = 'default'): string {
  return `${sessionId}:${chapterId}`;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function chopdotDotStatementStorePlugin() {
  const eventsByChapter = new Map<string, DotSessionEvent[]>();
  const accessEventsByChapter = new Map<string, DotInviteAccessEvent[]>();

  return {
    name: 'chopdot-dot-statement-store-lab',
    configureServer(server: any) {
      server.middlewares.use('/__chopdot_dot_statement_store', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (req.method === 'GET' && url.pathname === '/events') {
          const chapterId = url.searchParams.get('chapterId');
          const sessionId = url.searchParams.get('sessionId') ?? 'default';
          if (!chapterId) {
            sendJson(res, 400, { error: 'chapterId is required' });
            return;
          }
          sendJson(res, 200, { events: eventsByChapter.get(statementStoreKey(chapterId, sessionId)) ?? [] });
          return;
        }

        if (req.method === 'GET' && url.pathname === '/access-events') {
          const chapterId = url.searchParams.get('chapterId');
          const sessionId = url.searchParams.get('sessionId') ?? 'default';
          if (!chapterId) {
            sendJson(res, 400, { error: 'chapterId is required' });
            return;
          }
          sendJson(res, 200, { events: accessEventsByChapter.get(statementStoreKey(chapterId, sessionId)) ?? [] });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/append') {
          const body = (await readBody(req)) as { chapterId?: string; sessionId?: string; event?: DotSessionEvent };
          if (!body.chapterId || !body.event) {
            sendJson(res, 400, { error: 'chapterId and event are required' });
            return;
          }
          const key = statementStoreKey(body.chapterId, body.sessionId);
          const events = eventsByChapter.get(key) ?? [];
          const duplicateEvent = events.find((event) => event.id === body.event?.id);
          if (duplicateEvent) {
            if (dotSessionEventHash(duplicateEvent) === dotSessionEventHash(body.event)) {
              sendJson(res, 200, { events });
              return;
            }
            sendJson(res, 409, { error: 'duplicate event' });
            return;
          }
          const previousEvent = events.at(-1);
          const expectedPreviousHash = previousEvent ? dotSessionEventHash(previousEvent) : DOT_SESSION_GENESIS_HASH;
          if (body.event.previousEventHash !== expectedPreviousHash) {
            sendJson(res, 409, { error: 'event chain is out of order' });
            return;
          }
          const nextEvents = [...events, body.event];
          eventsByChapter.set(key, nextEvents);
          sendJson(res, 200, { events: nextEvents });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/append-access') {
          const body = (await readBody(req)) as { chapterId?: string; sessionId?: string; event?: DotInviteAccessEvent };
          if (!body.chapterId || !body.event) {
            sendJson(res, 400, { error: 'chapterId and event are required' });
            return;
          }
          const key = statementStoreKey(body.chapterId, body.sessionId);
          const events = accessEventsByChapter.get(key) ?? [];
          const duplicateEvent = events.find((event) => event.id === body.event?.id);
          if (duplicateEvent) {
            if (dotInviteAccessEventHash(duplicateEvent) === dotInviteAccessEventHash(body.event)) {
              sendJson(res, 200, { events });
              return;
            }
            sendJson(res, 409, { error: 'duplicate access event' });
            return;
          }
          const previousEvent = events.at(-1);
          const expectedPreviousHash = previousEvent ? dotInviteAccessEventHash(previousEvent) : DOT_SESSION_GENESIS_HASH;
          if (body.event.previousEventHash !== expectedPreviousHash) {
            sendJson(res, 409, { error: 'access event chain is out of order' });
            return;
          }
          const nextEvents = [...events, body.event];
          accessEventsByChapter.set(key, nextEvents);
          sendJson(res, 200, { events: nextEvents });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/reset') {
          const body = (await readBody(req)) as { chapterId?: string; sessionId?: string };
          if (body.chapterId) {
            eventsByChapter.delete(statementStoreKey(body.chapterId, body.sessionId));
            accessEventsByChapter.delete(statementStoreKey(body.chapterId, body.sessionId));
          } else {
            eventsByChapter.clear();
            accessEventsByChapter.clear();
          }
          sendJson(res, 200, { ok: true });
          return;
        }

        sendJson(res, 404, { error: 'not found' });
      });
    },
  };
}

// Validate required environment variables at build time
function validateEnvPlugin() {
  return {
    name: 'validate-env',
    configResolved(config: any) {
      const env = config.env;

      // Critical vars that must be present for build
      const criticalVarGroups = [
        {
          keys: ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
          description: 'Supabase project URL',
        },
        {
          keys: ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'],
          description: 'Supabase anonymous/public API key',
        },
      ];

      // Runtime-only vars (warn but don't fail build)
      const runtimeVars = {
        VITE_WALLETCONNECT_PROJECT_ID: 'WalletConnect Cloud project ID',
      };

      const missingCritical = criticalVarGroups
        .filter(({ keys }) => keys.every((key) => !env[key] || env[key].trim() === ''))
        .map(({ keys, description }) => `  ❌ ${keys.join(' or ')} - ${description}`);

      const missingRuntime = Object.entries(runtimeVars)
        .filter(([key]) => !env[key] || env[key].trim() === '')
        .map(([key, desc]) => `  ⚠️  ${key} - ${desc} (runtime only)`);

      if (env.VITE_BUILD_PROFILE === 'dot-host') {
        console.warn('dot-host profile: skipping critical env validation at build');
        return;
      }

      if (missingCritical.length > 0) {
        console.error('\n🚨 BUILD ERROR: Missing required environment variables:\n');
        console.error(missingCritical.join('\n'));
        console.error('\n📝 How to fix:');
        console.error('1. Copy .env.example to .env');
        console.error('2. Fill in the missing values');
        console.error('3. Restart the build\n');
        throw new Error(`Missing required environment variables: ${missingCritical.length} variable(s)`);
      }

      if (missingRuntime.length > 0) {
        console.warn('\n⚠️  WARNING: Missing runtime environment variables:\n');
        console.warn(missingRuntime.join('\n'));
        console.warn('\nThese are only needed at runtime. WalletConnect features may not work until set.\n');
      }

      if (config.command === 'build' && env.VITE_SIMULATE_CHAIN === '1') {
        throw new Error(
          '🚨 VITE_SIMULATE_CHAIN=1 is not allowed in production builds. ' +
          'Remove or set to "0" before deploying.'
        );
      }

      console.log('✅ All critical environment variables validated');
    },
  };
}

// https://vite.dev/config/
const isDotHostBuild = process.env.VITE_BUILD_PROFILE === 'dot-host';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    validateEnvPlugin(),
    chopdotDotStatementStorePlugin(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      buffer: 'buffer',
      // Map version-suffixed imports (from generated UI files) to actual packages
      'vaul@1.1.2': 'vaul',
      'sonner@2.0.3': 'sonner',
      'recharts@2.15.2': 'recharts',
      'react-resizable-panels@2.1.7': 'react-resizable-panels',
      'react-hook-form@7.55.0': 'react-hook-form',
      'react-day-picker@8.10.1': 'react-day-picker',
      'next-themes@0.4.6': 'next-themes',
      'lucide-react@0.487.0': 'lucide-react',
      'input-otp@1.4.2': 'input-otp',
      'embla-carousel-react@8.6.0': 'embla-carousel-react',
      'cmdk@1.1.1': 'cmdk',
      'class-variance-authority@0.7.1': 'class-variance-authority',
      '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
      '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
      '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
      '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
      '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
      '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
      '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
      '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
      '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
      '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
      '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
      '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
      '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
      '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
      '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
      '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
      '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
      '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
      '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
      '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
      '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
      '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
      '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
    },
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: isDotHostBuild
        ? {
            index: path.resolve(__dirname, 'dot-lab.html'),
          }
        : {
            main: path.resolve(__dirname, 'index.html'),
            sandbox: path.resolve(__dirname, 'public/dev/sandbox.html'),
          },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'buffer', 'eventemitter3'],
    exclude: ['@polkadot/api', '@polkadot/types'], // Exclude from pre-bundling to avoid initialization errors
    // Fix dev-only ESM/CJS interop issue where browser ESM can't default-import CJS `eventemitter3`.
    // This shows up as: "does not provide an export named 'default'" when fetching balances.
    needsInterop: ['eventemitter3'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
})
