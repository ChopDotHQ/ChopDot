import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const defaultEvidenceRoot = path.join(repositoryRoot, 'test-results', 'release-evidence');

export function releaseEvidenceRoot(): string {
  const configured = process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT?.trim();
  return configured
    ? path.resolve(repositoryRoot, configured)
    : defaultEvidenceRoot;
}

export function releaseEvidencePath(...segments: string[]): string {
  const root = releaseEvidenceRoot();
  for (const segment of segments) {
    if (!segment || path.isAbsolute(segment) || segment.includes('\0')) {
      throw new Error('Release evidence path segments must be non-empty relative paths.');
    }
  }
  const candidate = path.resolve(root, ...segments);
  const relative = path.relative(root, candidate);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Release evidence path escapes CHOPDOT_RELEASE_EVIDENCE_ROOT.');
  }
  return candidate;
}
