const SECRET_KEY = /(?:secret|password|passwd|private[_-]?key|seed|mnemonic|token|authorization|cookie|credential)/i;
const SECRET_VALUE_PATTERNS = [
  /["']?(?:secret|password|passwd|private[_-]?key|seed|mnemonic|token|authorization|cookie|credential)["']?\s*[:=]\s*["'][^"']{4,}["']/gi,
  /(?:^|\n)\s*[A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|PRIVATE_KEY|SEED|MNEMONIC|TOKEN|AUTHORIZATION|COOKIE|CREDENTIAL)[A-Z0-9_]*\s*=\s*[^\s#]{4,}/g,
  /\b(?:sk|pk)_[A-Za-z0-9_-]{16,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:abandon|ability|able|about|above)(?:\s+[a-z]{3,12}){11,23}\b/gi,
];

export function redactString(value) {
  let redacted = value;
  for (const pattern of SECRET_VALUE_PATTERNS) redacted = redacted.replace(pattern, '[REDACTED]');
  return redacted;
}

export function redactValue(value, options = {}, seen = new WeakSet()) {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) {
    const output = value.map((entry) => redactValue(entry, options, seen));
    seen.delete(value);
    return output;
  }
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SECRET_KEY.test(key) ? '[REDACTED]' : redactValue(entry, options, seen);
  }
  seen.delete(value);
  return output;
}

export function scanForSensitiveContent(value, pathName = '$', findings = []) {
  if (typeof value === 'string') {
    for (const pattern of SECRET_VALUE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(value)) findings.push({ path: pathName, type: 'secret_value_pattern' });
    }
    return findings;
  }
  if (value === null || typeof value !== 'object') return findings;
  for (const [key, entry] of Object.entries(value)) {
    const child = `${pathName}.${key}`;
    if (SECRET_KEY.test(key) && entry !== null && entry !== '' && entry !== '[REDACTED]') findings.push({ path: child, type: 'secret_key' });
    scanForSensitiveContent(entry, child, findings);
  }
  return findings;
}

export function assertRedacted(value) {
  const findings = scanForSensitiveContent(value);
  if (findings.length) throw new Error(`Sensitive content found at ${findings.map((entry) => entry.path).join(', ')}`);
  return true;
}
