# Gitleaks full-history baseline

**Kind:** security provenance
**Status:** current
**Last reviewed:** 2026-08-30
**Applies to:** repository history through `f727cf8143279d555bec175754d26b99c3f48263`
**Authority:** fingerprint classification only; this record cannot approve a release or weaken future-secret detection

## Provenance

- Scanner: Gitleaks `8.30.1`, downloaded from the official GitHub release.
- Local verification archive: `gitleaks_8.30.1_darwin_arm64.tar.gz`, SHA-256
  `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`,
  matched the official `gitleaks_8.30.1_checksums.txt` entry before execution.
- Full-history command shape: `gitleaks git . --redact --exit-code=1
  --report-format=json`.
- Full-history result before the baseline: exactly 14 findings.
- Current-tree command shape: `gitleaks dir . --redact --exit-code=1
  --report-format=json`.
- Current-tree result before the baseline: exactly four findings.
- Secret values were not copied into this record. Classification used the
  finding rule, source role, commit/path provenance, current-tree presence, and
  whether the value was a synthetic fixture, public testnet credential, or
  non-credential hash/example.

## Exact classifications

| Redacted fingerprint | Rule | Path | Commit | At `HEAD` | Category | Reason |
|---|---|---|---|---|---|---|
| `6cd0e092e662e5b421c28914cb4bfef5f7ea6390:scripts/release-evidence.test.mjs:generic-api-key:113` | `generic-api-key` | `scripts/release-evidence.test.mjs` | `6cd0e092e662e5b421c28914cb4bfef5f7ea6390` | yes | test-only | Synthetic hostile secret-scan fixture. |
| `1a44c4ceced4ed75168d86d28a5b924925a0c5e6:tests/support/truapiCompatibleTestHost.ts:generic-api-key:19` | `generic-api-key` | `tests/support/truapiCompatibleTestHost.ts` | `1a44c4ceced4ed75168d86d28a5b924925a0c5e6` | yes | false-positive hash | Pinned test-adapter SHA-256, not a credential. |
| `e0cb95f32f962864f0bcce3ff3439a71b2d93c34:docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md:generic-api-key:783` | `generic-api-key` | `docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md` | `e0cb95f32f962864f0bcce3ff3439a71b2d93c34` | no | test-only | Explicit placeholder in a historical plan example. |
| `a5676d95ec40696a34d5d083d5856437b8145a67:proof/polkadot-host-sim/report.json:generic-api-key:21` | `generic-api-key` | `proof/polkadot-host-sim/report.json` | `a5676d95ec40696a34d5d083d5856437b8145a67` | yes | test-only | Deterministic host-simulator test key recorded in test proof. |
| `a5676d95ec40696a34d5d083d5856437b8145a67:proof/polkadot-host-stress/report.json:generic-api-key:65` | `generic-api-key` | `proof/polkadot-host-stress/report.json` | `a5676d95ec40696a34d5d083d5856437b8145a67` | yes | test-only | Deterministic host-stress test key recorded in test proof. |
| `7d688ea48aa253922324d98fd656f009ab8eb790:scripts/run-agent-wallet-token-scenarios.mjs:generic-api-key:19` | `generic-api-key` | `scripts/run-agent-wallet-token-scenarios.mjs` | `7d688ea48aa253922324d98fd656f009ab8eb790` | no | public/testnet-only | Deliberately public testnet minter key; never production authority. |
| `079c5a025b4a22da2143e1b4482724dcdcd71fd8:scripts/run-agent-wallet-token-scenarios.mjs:generic-api-key:19` | `generic-api-key` | `scripts/run-agent-wallet-token-scenarios.mjs` | `079c5a025b4a22da2143e1b4482724dcdcd71fd8` | no | public/testnet-only | Same deliberately public testnet-only scenario in a later commit. |
| `fe9e6ae88e339ca928c11911f78ce66480be52ca:docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md:generic-api-key:768` | `generic-api-key` | `docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md` | `fe9e6ae88e339ca928c11911f78ce66480be52ca` | no | test-only | Explicit placeholder in a historical plan example. |
| `37539a7f9945067965449e8e3a1562a8c4bed8e5:SIGNUP_DEBUG.md:generic-api-key:13` | `generic-api-key` | `SIGNUP_DEBUG.md` | `37539a7f9945067965449e8e3a1562a8c4bed8e5` | no | public/testnet-only | Historical public client-side anonymous-service credential reference. |
| `37539a7f9945067965449e8e3a1562a8c4bed8e5:test-signup.html:jwt:18` | `jwt` | `test-signup.html` | `37539a7f9945067965449e8e3a1562a8c4bed8e5` | no | public/testnet-only | Historical demo anonymous client token in an obsolete signup fixture. |
| `37539a7f9945067965449e8e3a1562a8c4bed8e5:test-supabase-auth.ts:jwt:5` | `jwt` | `test-supabase-auth.ts` | `37539a7f9945067965449e8e3a1562a8c4bed8e5` | no | public/testnet-only | Same historical demo anonymous client token in an obsolete test script. |
| `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/AUTH_SYSTEM.md:generic-api-key:295` | `generic-api-key` | `src/docs/AUTH_SYSTEM.md` | `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0` | no | false-positive hash | Truncated documentation example, not a usable token. |
| `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/BACKEND_API.md:generic-api-key:85` | `generic-api-key` | `src/docs/BACKEND_API.md` | `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0` | no | false-positive hash | Truncated documentation example, not a usable token. |
| `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0:src/docs/BACKEND_API.md:generic-api-key:112` | `generic-api-key` | `src/docs/BACKEND_API.md` | `ba492a5b74bec36ffaac8ddf0c06bed63e581ed0` | no | false-positive hash | Truncated documentation example, not a usable token. |

## Baseline decision

The exact fingerprint allowlist is safe for this reviewed history because it
contains no rule-wide, path-wide, regex, or value-based exclusions. A changed
line, new commit, new path, different rule, or newly introduced credential has a
different fingerprint and still fails the scan. No classified item carries
production authority, so this review found no human rotation blocker. Public
testnet keys remain disposable and must never receive production funds or
authority; that boundary is not evidence that a remote test service is active.

The baseline must be regenerated and independently classified if repository
history is rewritten, the scanner version changes, or any fingerprint changes.
