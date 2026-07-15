#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const requiredFiles = [
  'product/ai-manager/README.md',
  'product/ai-manager/operating-loops.md',
  'product/ai-manager/ai-product-management-adoption.md',
  'product/ai-manager/post-mortems/smart-scan-text-trap.md',
  'product/cards.md',
  'product/decision-contracts.md',
  'scripts/chopdot-product-cockpit.mjs',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(repoRoot, file))) {
    errors.push(`missing required AI PM process file: ${file}`);
  }
}

const packageJson = readJson('package.json');
if (packageJson) {
  const scripts = packageJson.scripts ?? {};
  const requiredScripts = [
    'product:refresh',
    'product:validate',
    'product:query',
    'product:resume',
    'product:checkpoint',
    'product:ai-pm:validate',
  ];
  for (const script of requiredScripts) {
    if (!scripts[script]) errors.push(`missing package script: ${script}`);
  }
}

const adoption = readText('product/ai-manager/ai-product-management-adoption.md');
if (adoption) {
  requireTerms(adoption, 'product/ai-manager/ai-product-management-adoption.md', [
    'False positive cost',
    'False negative cost',
    'Human review point',
    'Correction path',
    'Drift/monitoring signal',
    'Photo/link/import first',
  ]);
}

const cards = readText('product/cards.md');
if (cards) {
  const receiptCard = sectionFor(cards, 'P-012');
  if (!receiptCard) {
    errors.push('product/cards.md is missing P-012 Receipt capture without manual-first entry');
  } else {
    requireTerms(receiptCard, 'product/cards.md P-012', [
      'photo',
      'import',
      'item editing is secondary',
      'manual',
    ]);
  }
}

const decisionContracts = readText('product/decision-contracts.md');
if (decisionContracts) {
  const dc12 = sectionFor(decisionContracts, 'DC-012');
  if (!dc12) {
    errors.push('product/decision-contracts.md is missing DC-012');
  } else {
    requireTerms(dc12, 'product/decision-contracts.md DC-012', [
      'photo',
      'item editing only after capture',
      'screenshot proof',
    ]);
  }
}

const sourceFiles = walk(resolve(repoRoot, 'src'))
  .filter((file) => /\.(tsx?|jsx?)$/.test(file))
  .map((file) => ({
    file,
    relative: relative(repoRoot, file),
    text: readFileSync(file, 'utf8'),
  }));

const aiCaptureCandidates = sourceFiles.filter(({ relative: rel, text }) => {
  const nameLooksAi = /smart|scan|ai|receipt/i.test(rel);
  const textLooksAiCapture = /Smart Scan|AI will|parse-receipt|chatLog|receipt text|messy chat log/i.test(text);
  return nameLooksAi && textLooksAiCapture;
});

for (const candidate of aiCaptureCandidates) {
  const hasTextarea = /<textarea\b/i.test(candidate.text);
  const asksForPaste = /paste (a |what|messy|chat|receipt)|receipt text|chat log/i.test(candidate.text);
  if (!hasTextarea || !asksForPaste) continue;

  const wired = sourceFiles.some(({ relative: rel, text }) => {
    if (rel === candidate.relative) return false;
    const importName = candidate.relative.split('/').at(-1)?.replace(/\.(tsx?|jsx?)$/, '');
    return importName ? text.includes(importName) : false;
  });

  const message = `${candidate.relative} contains a paste/textarea-first AI capture path`;
  if (wired) {
    errors.push(`${message} and is imported by normal source code`);
  } else {
    warnings.push(`${message}; keep quarantined or replace with photo/link/import-first capture`);
  }
}

if (errors.length || warnings.length) {
  console.log('AI PM process validation');
  for (const warning of warnings) console.log(`WARNING ${warning}`);
  for (const error of errors) console.log(`ERROR ${error}`);
} else {
  console.log('AI PM process validation OK');
}

if (errors.length) process.exit(1);

function readText(file) {
  const path = resolve(repoRoot, file);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function readJson(file) {
  const text = readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function requireTerms(text, label, terms) {
  const lower = text.toLowerCase();
  for (const term of terms) {
    if (!lower.includes(term.toLowerCase())) {
      errors.push(`${label} missing required AI PM term: ${term}`);
    }
  }
}

function sectionFor(markdown, id) {
  const start = markdown.search(new RegExp(`^##\\s+${escapeRegExp(id)}\\b`, 'm'));
  if (start < 0) return null;
  const rest = markdown.slice(start);
  const next = rest.slice(1).search(/^##\s+/m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) return walk(full);
    return [full];
  });
  return entries;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

