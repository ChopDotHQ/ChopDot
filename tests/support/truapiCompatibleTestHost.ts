import {
  DEFAULT_CHAIN,
  DEV_ACCOUNTS,
  type Account,
  type CreateTestHostOptions,
  type TestHostServer,
} from '@parity/host-api-test-sdk';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createServer, type Server} from 'node:http';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';

export const EXPECTED_TEST_HOST_VERSION = '0.10.0';
export const EXPECTED_HOST_BUNDLE_SHA256 = 'b349b6eae89549ea7c03b322b0c99754d02e775030da5afbb4296b624cf680ff';
export const EXPECTED_TRUAPI_VERSION = '0.5.1';
export const CURRENT_TRUAPI_CHAT_ADAPTER_SHA256 = '9098bae521dc5aa31300a5b04843ca832eeb29834b16c34d9bcf21714a8ce845';

let officialHostBundleCache: string | undefined;
let currentChatAdapterCache: string | undefined;

export async function createTruApiCompatibleTestHostServer(options: CreateTestHostOptions): Promise<TestHostServer> {
  const {
    productUrl,
    accounts = ['alice'],
    networks = [DEFAULT_CHAIN],
    port = 0,
  } = options;
  const html = generateCompatibleHostPage({
    productUrl,
    accounts,
    networks,
    productAccounts: options.productAccounts,
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Permissions-Policy': 'clipboard-read=*, clipboard-write=*',
    });
    response.end(html);
  });
  const url = await new Promise<string>((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get test host server address.'));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
  return {url, close: () => closeServer(server)};
}

type HostPageConfig = Required<Pick<CreateTestHostOptions, 'productUrl' | 'accounts' | 'networks'>> &
  Pick<CreateTestHostOptions, 'productAccounts'>;

function generateCompatibleHostPage(config: HostPageConfig): string {
  const productAccounts = config.productAccounts
    ? Object.fromEntries(Object.entries(config.productAccounts).map(([key, account]) => [key, resolveAccount(account)]))
    : undefined;
  const configJson = JSON.stringify({
    productUrl: config.productUrl,
    accounts: config.accounts.map(resolveAccount),
    networks: config.networks.map(network => ({
      genesisHash: network.genesisHash,
      rpcUrl: network.rpcUrl,
      name: network.name,
    })),
    ...(productAccounts && {productAccounts}),
  }).replace(/<\//gu, '<\\/');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Host</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe id="product-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allow="clipboard-read; clipboard-write"></iframe>
  <script>window.__TEST_HOST_CONFIG__ = ${configJson};</script>
  <script>${loadCurrentChatAdapter()}</script>
  <script>${loadOfficialHostBundle()}</script>
</body>
</html>`;
}

function loadOfficialHostBundle(): string {
  if (officialHostBundleCache) return officialHostBundleCache;

  const require = createRequire(import.meta.url);
  const entryPath = require.resolve('@parity/host-api-test-sdk');
  const packageRoot = path.dirname(path.dirname(entryPath));
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const bundlePath = path.join(packageRoot, 'dist', 'host-bundle.js');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {name?: string; version?: string};
  if (packageJson.name !== '@parity/host-api-test-sdk' || packageJson.version !== EXPECTED_TEST_HOST_VERSION) {
    throw new Error(
      `Refusing host-api-test-sdk ${packageJson.name ?? 'unknown'}@${packageJson.version ?? 'unknown'}; expected @parity/host-api-test-sdk@${EXPECTED_TEST_HOST_VERSION}.`,
    );
  }

  const originalBundle = readFileSync(bundlePath, 'utf8');
  assertSha256(originalBundle, EXPECTED_HOST_BUNDLE_SHA256, 'installed host bundle');
  officialHostBundleCache = originalBundle;
  return originalBundle;
}

function loadCurrentChatAdapter(): string {
  if (currentChatAdapterCache) return currentChatAdapterCache;

  const truApiEntryPath = fileURLToPath(import.meta.resolve('@parity/truapi'));
  const truApiPackageRoot = path.dirname(path.dirname(truApiEntryPath));
  const truApiPackage = JSON.parse(readFileSync(path.join(truApiPackageRoot, 'package.json'), 'utf8')) as {name?: string; version?: string};
  if (truApiPackage.name !== '@parity/truapi' || truApiPackage.version !== EXPECTED_TRUAPI_VERSION) {
    throw new Error(
      `Refusing current chat adapter with ${truApiPackage.name ?? 'unknown'}@${truApiPackage.version ?? 'unknown'}; expected @parity/truapi@${EXPECTED_TRUAPI_VERSION}.`,
    );
  }

  const supportRoot = path.dirname(fileURLToPath(import.meta.url));
  const output = buildSync({
    entryPoints: [path.join(supportRoot, 'currentTruApiChatHostBrowser.ts')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    write: false,
    sourcemap: false,
  }).outputFiles[0]?.text;
  if (!output) throw new Error('Current TruAPI chat adapter did not produce a browser bundle.');
  assertSha256(output, CURRENT_TRUAPI_CHAT_ADAPTER_SHA256, 'current TruAPI chat adapter');
  currentChatAdapterCache = output;
  return output;
}

function resolveAccount(account: Account): {name: string; uri: string} {
  if (typeof account !== 'string') return {name: account.name, uri: account.uri};
  const resolved = DEV_ACCOUNTS[account];
  return {name: resolved.name, uri: resolved.uri};
}

function assertSha256(value: string, expected: string, label: string): void {
  const actual = createHash('sha256').update(value).digest('hex');
  if (actual !== expected) throw new Error(`Refusing ${label}: expected SHA-256 ${expected}, received ${actual}.`);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}
