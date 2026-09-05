# Release checklist

**Kind:** guardrail
**Status:** active
**Owner:** release assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped release-assurance guardrail subordinate to Product Truth, current Cockpit decisions and contracts, ADRs, and exact candidate and live evidence
**Sources:** DC-005, DC-006, current-release-state.json

The candidate must independently prove: implemented, tested, committed, pushed,
candidate built, staged, promoted, reachable, user owned, user proven, and
knowledge known through exact cited recall. Fixture-only tests cannot prove the release: Playwright must exercise
`src/main.tsx` across separate contexts, responsive sizes, offline/restart,
wrong actors, recovery, accessibility, privacy, and every named mode.

The protected release job additionally requires an applicable
`AgentLoopContractV1`, exact-candidate `OutcomePacketV1`, exact-digest Knowledge
Context verify-recall receipt, replayable `RunnerProvenanceV1`, its persisted
run directory, and a consumed single-use approval bound to the same
candidate/outcome/effect. The current protected-environment job mints a GitHub
OIDC execution attestation and reads back the project authority profile,
reviewer policy, branch policy, and disabled admin bypass before it runs the
shared adoption guard. It must emit a `governed`
release acceptance receipt. Missing release evidence is a failing job, never a
skipped green path.

The release caller supplies the canonical Git changed-path manifest derived
from the accepted contract/outcome range; a synthetic release-state path cannot
stand in for the candidate. The independent evaluation must be an indexed,
hashed `EvaluationV1`, and the knowledge receipt must cite the exact outcome
through a durable exact-source record outside the caller-supplied outcome
artifact. Repository source proves only the intended gate. The protected GitHub
environment, delegated owner identity, identity mode, branch ruleset, and exact workflow run must be
read back separately before remote release enforcement is claimed.
The environment uses an explicit two-branch deployment allowlist:
`main` and `codex/chopdot-v1-launch`. A generic “protected branches” setting is
insufficient because it can allow every branch when no matching classic branch
protection exists. The release verifier reads back the exact allowlist.

GitHub administrators are an explicit external authority boundary. If the
environment setting **Allow administrators to bypass configured protection
rules** is enabled, the release loop is protected for ordinary execution but is
not literally unavoidable to repository administrators; the wake-up verdict
must say so until that setting is disabled and read back.

ChopDot currently uses `delegated-owner-principal` mode: authorized agents and
the human owner both act through `Devpen787`. The release environment therefore
must not require an unrelated collaborator or claim an independent human
review. Release approval evidence remains explicit and candidate-bound; the
hosted release verifier and readbacks remain mandatory.

The machine-readable current release verdict is
`docs/release/current-release-state.json`. The earlier
`docs/release/2026-08-24-local-release-assurance.md` remains a historical
exact-commit measurement; it must not be treated as current after later source,
candidate, live-user, or KG evidence.

The embedded `release.json` binds the commit, tree, dependency and compiler
inputs, build ID, chain geneses, recovery-contract source/ABI/artifacts, and the
two deployed recovery-contract addresses. Deployment also requires a fresh
script-disabled `npm ci` outside the ChopDot ancestry and an exact aggregate of
every installed runtime dependency byte; the release and deploy log bind that
closure before a write. It cannot contain its own enclosing
CAR hash or CID without creating a circular build. A separately generated,
independently read-back promotion attestation binds those exact embedded bytes
to the CAR SHA-256, root/app CID, finalized update transactions, live owners,
and gateway byte hashes. Stage and public bytes must match. A maintenance CID
is the rollback target.

When an independently attested testnet worker is required, ownership proof is
triple rather than inferred: the registrar's base token owner, the registry's
base-node owner, and every executable-subname owner must all equal the explicit
user address. Subname reassignment must also restore and re-read the anchored
resolver without changing contenthash or manifest text before the base token
moves. The worker must retain no mutable node authority afterward.

A shared public testnet worker may be used only within one uninterrupted
publish-to-handoff command. The command must start from an externally pinned,
clean tooling commit and ordered source aggregate, install the lockfile into a
fresh isolated runtime, and use an environment allowlist. Distinguish finalized
DotNS transaction proof from Bulletin's narrower finalized-CID plus immutable
gateway-byte proof; do not call the latter transaction attribution.
When a retry observes an already-landed write, record exact finalized state as
the retry boundary and do not imply a historical transaction receipt.
