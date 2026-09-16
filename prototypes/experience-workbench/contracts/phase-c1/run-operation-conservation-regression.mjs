import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(here, 'verify-operation-conservation.mjs');
const generatedPath = path.join(here, '.generated-operation-conservation.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');

// Preserve the previously-cleared operation-conservation suite byte-for-byte. The
// authorized Phase C1 repair advances the contract security revision from 7 to 8 only
// because authoritative external-effect identity is now part of the contract. Adapt
// that single revision assertion in the generated regression; all conservation tests
// and product semantics remain unchanged.
const revisionMarker = "eq(spend.security_revision, 7, 'integrated parent-conservation security revision is active');";
const revisionReplacement = "eq(spend.security_revision, 8, 'integrated parent-conservation remains active under security revision 8');";
if (!source.includes(revisionMarker)) {
  throw new Error('operation-conservation revision-7 regression marker missing');
}
const transformed = source.replace(revisionMarker, revisionReplacement);
if (transformed === source || transformed.includes(revisionMarker)) {
  throw new Error('operation-conservation revision transform was incomplete');
}

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
