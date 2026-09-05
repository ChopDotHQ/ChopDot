# Gitleaks full-history baseline

**Kind:** security provenance
**Status:** current
**Last reviewed:** 2026-09-05
**Applies to:** reviewed repository findings through `facafaef6f2bbc1d15f7e189d9f293ea14cb1402`
**Authority:** fingerprint classification only; this record cannot approve a release or weaken future-secret detection

## Provenance

- Scanner: Gitleaks `8.30.1`, downloaded from the official GitHub release.
- Local verification archive: `gitleaks_8.30.1_darwin_arm64.tar.gz`, SHA-256
  `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`,
  matched the official `gitleaks_8.30.1_checksums.txt` entry before execution.
- Full-history command shape: `gitleaks git . --redact --exit-code=1
  --report-format=json`.
- The 2026-08-30 baseline classified exactly 14 full-history findings; its
  current-tree companion scan found exactly four findings.
- The 2026-09-04 hosted recheck loaded those 14 exact fingerprints and found
  exactly 12 additional findings, all in commit
  `a0e85fbc8eab57f55af0ed25e24720cac5da7295` on the unprotected
  `ux/experience-workbench` branch.
- Hosted source: workflow run `33872309852`, exact governance candidate
  `bdcedb414e768212375afb0e3e1c787284f94685`, redacted artifact
  `secrets-scan-33872309852`, artifact ID `9936400061`, artifact SHA-256
  `3cb6c144b6e073fde9b2aa31805cb59998b856f53cb418f61e9564665e9e9236`.
- The 2026-09-04 hosted run `33915628567`, reviewed on 2026-09-05, checked exact candidate
  `3e508250ab86f3b23fa9676f85d67c948f166ecf` and reported exactly 18
  additional `generic-api-key` findings from the fetched
  `ux/experience-workbench` history: one in commit
  `69177e1df70fc62753d15baf86e0fb9c284a6a60` and 17 in commit
  `facafaef6f2bbc1d15f7e189d9f293ea14cb1402`.
- The redacted source artifact was `secrets-scan-33915628567`, artifact ID
  `9953032178`, API digest
  `sha256:b1874b0b00942419fc2051fa8b3bfc7e974e072064f017d91675d45bc6842c98`;
  the extracted `gitleaks.json` SHA-256 was
  `a47cc0b1c523029a583cc48c3ddc59092d5e3f6a26967924ce55561995ecfd31`.
- Bare `gitleaks git .` scans history reachable from the fetched ref universe,
  not only the checked-out candidate's ancestry. The two new commits were not
  in candidate `3e508250ab86f3b23fa9676f85d67c948f166ecf`; they were retained on
  `origin/ux/experience-workbench` and therefore entered the scan universe.
- Follow-up classification:
  [`2026-09-05-gitleaks-journey-11-fingerprint-follow-up.md`](../investigations/2026-09-05-gitleaks-journey-11-fingerprint-follow-up.md).
- After remote-ref refresh advanced `origin/ux/experience-workbench` to
  `9858822e4ae063ae578036751cc9b8b91b962fb5`, the verified Gitleaks `8.30.1`
  binary scanned 938 fetched commits with the 44-entry baseline and reported
  zero findings. The redacted zero-finding report SHA-256 was
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`.
- Current-tree command shape: `gitleaks dir . --redact --exit-code=1
  --report-format=json`.
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
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:54` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:109` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:153` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:285` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:296` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:340` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | Deterministic human-readable idempotency scope in a generated internal prototype mapping; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:227` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:250` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:261` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:308` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:316` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `a0e85fbc8eab57f55af0ed25e24720cac5da7295:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:337` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `a0e85fbc8eab57f55af0ed25e24720cac5da7295` | no | prototype-only | The same deterministic prototype idempotency scope rendered as a data attribute; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:956` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated event mapping; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:308` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata rendered as a static HTML data attribute; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:316` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata rendered as a static HTML data attribute; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:1429` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated event mapping; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json:generic-api-key:1473` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_EVENT_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated event mapping; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:53` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:108` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:152` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:284` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:295` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:339` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic partial-payment idempotency metadata in the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:955` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:1428` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json:generic-api-key:1472` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/UI_COMPATIBILITY_MAPPING.json` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata copied into the generated compatibility map; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:606` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata rendered as a static HTML data attribute; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:754` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata rendered as a static HTML data attribute; not a credential. |
| `facafaef6f2bbc1d15f7e189d9f293ea14cb1402:prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html:generic-api-key:766` | `generic-api-key` | `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html` | `facafaef6f2bbc1d15f7e189d9f293ea14cb1402` | no | prototype-only | Deterministic idempotency metadata rendered as a static HTML data attribute; not a credential. |
| `69177e1df70fc62753d15baf86e0fb9c284a6a60:prototypes/experience-workbench/tools/apply-j11-compatibility-closeout.mjs:generic-api-key:90` | `generic-api-key` | `prototypes/experience-workbench/tools/apply-j11-compatibility-closeout.mjs` | `69177e1df70fc62753d15baf86e0fb9c284a6a60` | no | prototype-only | Hard-coded, human-readable generator fixture for replay-safe prototype idempotency; not a credential. |

## Baseline decision

The exact fingerprint allowlist is safe for this reviewed history because it
contains no rule-wide, path-wide, regex, or value-based exclusions. A changed
line, new commit, new path, different rule, or newly introduced credential has a
different fingerprint and still fails the scan. No classified item carries
production authority, so this review found no human rotation blocker. Public
testnet keys remain disposable and must never receive production funds or
authority; that boundary is not evidence that a remote test service is active.

The 12 fingerprints added on 2026-09-04 are bound to one exact commit and two
exact prototype artifacts. They do not suppress other idempotency labels in
those files, later revisions of the same labels, or findings produced by a
different rule. A scanner-version change still requires the full re-review
described below because the version is not encoded in a fingerprint.

The 18 fingerprints added on 2026-09-05 are bound to two exact commits, one
generator fixture, and three generated prototype representations. They do not
suppress another value, another line, a later revision, a different path, or a
different rule. The change preserves the current fetched-ref scan behavior and
does not alter the prototype's retry, recovery, approval, or settlement logic.

The baseline must be regenerated and independently classified if repository
history is rewritten, the scanner version changes, or any fingerprint changes.
