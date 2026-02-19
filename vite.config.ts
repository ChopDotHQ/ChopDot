import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

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

      console.log('✅ All critical environment variables validated');
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    validateEnvPlugin(),
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
