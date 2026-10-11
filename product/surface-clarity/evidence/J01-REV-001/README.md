# J01-REV-001 — disposable fixture favicon

Owner verification, not independent review of this tooling change. J01/user
acceptance and the prior independent de9ced5 verdict remain unchanged.

The packager copies nested preview/journey directories, not an origin-root
favicon. Chromium probes `/favicon.ico` on the localhost fixture origin. The
only implementation change is five lines in `gate-b/test-server.mjs`: that exact
path returns an empty, uncached HTTP 204. No production server, app control,
authentication behavior, frozen source, tag or deployment changes. Other absent
resources still return 404, traversal returns 403, and cleanIndex retains 302.

Tooling commit tested: `2cb499e5fa196de87c26d8d72ce2e5162af4b0d6`, tree
`b67bc010c39b352ec054d9124bc94df8f47d902a`, parent
`de9ced5d281ec906f8cd3056164f864528ca7573`. This evidence-only successor records
that test run; final publication SHA verification is reported separately by the
owner. The test server and runner bytes are identical between the tested tooling
commit and this evidence successor. No evidence hashes are reset in live records.

## Portable evidence

- `old-independent-de9ced5/REVIEW-RECEIPT.md`: exact prior independent receipt,
  SHA-256 `7caa04c6f8eac398a0df4f4a20885a999f97d5f5facead2335d69f1386d33142`.
  The entire prior evidence set is copied without reclassification: 372 browser
  passes and one failed health assertion, models 213 and framework18 passed.
- `new-owner-2cb499e5/`: full committed runner commands/exits, version, raw logs,
  results and actual screenshots. Browser counts53+118+84+60+31+16+11 =373,
  models50+163 =213, framework18. Overall runner exit0; checker exit1 is the
  explicitly expected stale-evidence result, not readiness or clearance.
- `packaging-authority/`: two complete relative-path SHA-256 package manifests
  (264 files each, identical), generation logs, exact authority trees and proof
  that health script, packager, runner and historical live records are unchanged.
- `j01-favicon-http-1.json`: ten HTTP checks across ordinary and cleanIndex
  fixtures, including real missing-resource failures (no console-error filtering).
- `receipt.json`, `artifact-manifest.json`: machine-readable scope/results and
  relative-path artifact hashes. Original logs retain original temporary paths;
  their files are accessible here by the equivalent suffix after `/evidence/`.
  Copied files in the old review set retain its own relative directory layout.

No denominators, browser-health assertions, frozen authority or finding
dispositions were altered. Historical Surface Clarity records remain stale and
INCOMPLETE. The inherited standalone browser-hash limitation, full accessibility,
human comprehension, hosted/CI and account-link-specific Back limits remain as
documented in the original review. No J02 or remaining-family audit was started.

## Reproduce

Run from a **clean committed checkout of the successor**, with Git authority
history, installed Node24/Python3/Playwright and Chromium:

```bash
CHOPDOT_TEST_NODE_MODULES=/absolute/path/to/node_modules \
CHOPDOT_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
KEEP_J01_WORK=1 \
bash product/surface-clarity/evidence/J01-repair-2026-10-10/run.sh
```

This is the unchanged committed runner. Its printed evidence directory retains
the exact checked HEAD/tree, commands, exit codes, results and screenshots.

For independent package/authority verification, choose a nonexistent output
directory outside source:

```bash
python3 product/surface-clarity/evidence/J01-REV-001/verify-j01-favicon.py \
  "$PWD" /absolute/path/to/new-validation-directory
node product/surface-clarity/evidence/J01-REV-001/probe-j01-favicon.mjs \
  "$PWD" /absolute/path/to/runner-preview /absolute/path/to/http-results.json
```

These checks fail on authority drift, health-script changes, non-evidence changes
outside the sole fixture file, nondeterministic bytes or unexpected HTTP status.
The original independent review is historical; this owner test is not a new
independent reviewer verdict or user acceptance.
