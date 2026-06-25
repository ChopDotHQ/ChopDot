#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

const nativeRoot = path.join(repoRoot, 'src/chopdot-dot');
const chapterHomePath = path.join(repoRoot, 'src/components/screens/ChapterHome.tsx');

const forbiddenImportFragments = [
  'services/closeout',
  'pvmCloseout',
  'services/data/sources/Supabase',
  'services/data/repositories/PotRepository',
  'services/supabase',
  'supabaseClient',
  'contexts/AuthContext',
];

const requiredHostBoundaryPhrases = [
  'ProductAccountDotSessionSignerAdapter',
  'ProductSdkStatementStoreSessionAdapter',
  'ProductSdkCloudStorageReceiptAdapter',
  'ProductSdkCloseoutProofAdapter',
  'ProductSdkAssetHubEvidenceAdapter',
  'host-required',
  'runDotNativeHostPreflight',
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function lineNumberAt(content, needle) {
  const index = content.indexOf(needle);
  if (index < 0) return -1;
  return content.slice(0, index).split('\n').length;
}

function validateLocalStorageBoundary(filePath, content, failures) {
  const localStorageLines = content
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.includes('localStorage'));

  if (localStorageLines.length === 0) return;

  if (path.resolve(filePath) !== path.resolve(path.join(nativeRoot, 'polkadotSession.ts'))) {
    failures.push(`${relative(filePath)} uses localStorage outside the local native-session adapter.`);
    return;
  }

  const localAdapterStart = lineNumberAt(content, 'function storageKey');
  const statementStoreStart = lineNumberAt(content, 'export class StatementStoreSessionAdapter');
  if (localAdapterStart < 0 || statementStoreStart < 0) {
    failures.push('src/chopdot-dot/polkadotSession.ts must keep localStorage helpers before StatementStoreSessionAdapter.');
    return;
  }

  for (const { number } of localStorageLines) {
    if (number < localAdapterStart || number >= statementStoreStart) {
      failures.push(
        `src/chopdot-dot/polkadotSession.ts:${number} uses localStorage outside the LocalSignedSessionAdapter boundary.`,
      );
    }
  }
}

function main() {
  const failures = [];
  const files = [...walk(nativeRoot), chapterHomePath];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      failures.push(`Missing expected native boundary file: ${relative(filePath)}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const rel = relative(filePath);
    const importLines = content
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => line.startsWith('import ') || line.startsWith('export '));

    for (const { line, number } of importLines) {
      for (const fragment of forbiddenImportFragments) {
        if (line.includes(fragment)) {
          failures.push(`${rel}:${number} imports forbidden hybrid/native-truth dependency "${fragment}".`);
        }
      }
    }

    if (/\bevmAddress\b/.test(content)) {
      failures.push(`${rel} references evmAddress in the native-critical path.`);
    }

    validateLocalStorageBoundary(filePath, content, failures);
  }

  const chapterHome = fs.existsSync(chapterHomePath) ? fs.readFileSync(chapterHomePath, 'utf8') : '';
  for (const phrase of requiredHostBoundaryPhrases) {
    if (!chapterHome.includes(phrase)) {
      failures.push(`ChapterHome host boundary is missing required phrase: ${phrase}`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Host native boundary validation FAILED\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('\nFix: keep native truth in signed events/host adapters, not Supabase, EVM/PVM, or classic closeout.\n');
    process.exit(1);
  }

  console.log('✅ Host native boundary OK — native-critical imports stay separate from Supabase/EVM/PVM truth');
}

main();
