import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(here, 'verify-operation-conservation.mjs');
const generatedPath = path.join(here, '.generated-operation-conservation.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');

// Preserve the previously-cleared operation-conservation suite byte-for-byte. The
// revision-9 repair adds durable external execution ownership/namespace/restore-fence
// semantics above this already-cleared conservation core. Adapt only the revision
// assertion in the generated regression; all conservation tests remain unchanged.
const revisionMarker = "eq(spend.security_revision, 7, 'integrated parent-conservation security revision is active');";
const revisionReplacement = "eq(spend.security_revision, 9, 'integrated parent-conservation remains active under security revision 9');";
if (!source.includes(revisionMarker)) throw new Error('operation-conservation revision-7 regression marker missing');
const transformed = source.replace(revisionMarker, revisionReplacement);
if (transformed === source || transformed.includes(revisionMarker)) throw new Error('operation-conservation revision transform was incomplete');

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
