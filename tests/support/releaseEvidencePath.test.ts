import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {releaseEvidencePath, releaseEvidenceRoot} from './releaseEvidencePath.ts';

const originalRoot = process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT;

test.afterEach(() => {
  if (originalRoot === undefined) delete process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT;
  else process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT = originalRoot;
});

test('release evidence defaults to the ignored test-results root', () => {
  delete process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT;
  assert.match(releaseEvidenceRoot(), /[/\\]test-results[/\\]release-evidence$/u);
  assert.equal(
    releaseEvidencePath('ui-assurance-release', 'report.json'),
    path.join(releaseEvidenceRoot(), 'ui-assurance-release', 'report.json'),
  );
});

test('an explicit evidence root is propagated without writing tracked proof', () => {
  process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT = path.join(path.parse(process.cwd()).root, 'tmp', 'chopdot-hosted-evidence');
  assert.equal(
    releaseEvidencePath('browser', 'screen.png'),
    path.join(process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT, 'browser', 'screen.png'),
  );
});

test('absolute, empty, nul, and traversal segments fail closed', () => {
  process.env.CHOPDOT_RELEASE_EVIDENCE_ROOT = path.join(path.parse(process.cwd()).root, 'tmp', 'chopdot-hosted-evidence');
  for (const segments of [
    [''],
    [path.resolve('/outside')],
    ['..'],
    ['browser', '../..', 'outside'],
    ['browser\0escape'],
  ]) assert.throws(() => releaseEvidencePath(...segments), /Release evidence path/u);
});
