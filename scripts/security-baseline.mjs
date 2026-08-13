import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanTargets = ['src', 'server', 'index.html', 'vite.config.ts', '.env.example'];
const forbiddenPatterns = [
  { label: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/ },
  { label: 'innerHTML', regex: /\.innerHTML\b/ },
  { label: 'outerHTML', regex: /\.outerHTML\b/ },
  { label: 'insertAdjacentHTML', regex: /insertAdjacentHTML\s*\(/ },
  { label: 'document.write', regex: /document\.write(?:ln)?\s*\(/ },
  { label: 'eval', regex: /\beval\s*\(/ },
  { label: 'new Function', regex: /new\s+Function\b/ },
  { label: 'string setTimeout', regex: /setTimeout\s*\(\s*['"`]/ },
  { label: 'string setInterval', regex: /setInterval\s*\(\s*['"`]/ },
  { label: 'postMessage', regex: /postMessage\s*\(/ },
  { label: 'client secret env', regex: /\b(?:GEMINI_API_KEY|SECRET|PRIVATE_KEY|CLIENT_SECRET|BOT_TOKEN|PASSWORD)\s*=/ },
  { label: 'PEM private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'AWS access key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { label: 'GitHub access token', regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: 'Stripe secret key', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { label: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: 'production deterministic signer', regex: /\b(?:sr25519PairFromSeed|naclKeypairFromSeed|addFromSeed)\s*\(/, productionOnly: true },
];

const files = [];
for (const target of scanTargets) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) continue;
  collectFiles(absolute, files);
}

const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of forbiddenPatterns) {
      if (pattern.productionOnly && /(?:^|\.)test\.[cm]?[jt]sx?$/u.test(file)) continue;
      if (pattern.regex.test(line)) {
        findings.push(`${path.relative(root, file)}:${index + 1} ${pattern.label}`);
      }
    }
  });
}

if (findings.length) {
  console.error('Security baseline failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Security baseline passed (${files.length} files checked).`);

function collectFiles(target, output) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      collectFiles(path.join(target, entry), output);
    }
    return;
  }

  if (/\.(ts|tsx|js|jsx|mjs|html|env|example)$/.test(target)) {
    output.push(target);
  }
}
