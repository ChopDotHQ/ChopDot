# Product Schema V1 — Codex-led completion

**Effective:** 2026-09-26. **Coordination:** issue #50 and `docs/PRODUCT_SCHEMA_V1_ASSEMBLY.json` on `ops/chatgpt-work-factory-v1`.

The user's latest instruction is: “Can we just have codex keep working and just once and for all just finish the Job”. This supersedes the scheduled four-role handoff topology. The existing Codex session is the designated end-to-end engineering owner; it has not been remotely started by this configuration change.

The previous registry and assembly state remain available at `7a4a21e8de72a8ff0ef6a49511e89625aa154417`. Preserve prior evidence. Old REVIEW_PENDING/TEST-SUPPORT waits must not block the newly authorized owner.

## Execution ownership

All four scheduled schema roles are paused and carry hold-only prompts. Do not reactivate them without another user instruction. Unrelated tasks are unchanged. Pausing a schedule is not proof that an already-running invocation was terminated: Codex must re-read refs and `docs/BUILDER_LEASE.json` before writing. The lease last inspected was completed with no holder.

Codex may integrate its existing SEC-SCHEMA-001 patch, add/repair bounded schema tests and deterministic outputs, perform a separate read-only final review, execute local and hosted checks, and publish one verified completion/approval packet. It need not wait for an hourly Supervisor authorization or ask the user to shuttle its own archive back through ChatGPT.

Authorized candidate: `research/product-schema-v1`, initially `bc7473c8eebd1511b9a92fe3c1e25e2670c29b46` / tree `a5d02c43d8665097269e556e38ae09016c60f887`. Fast-forward schema-only successor commits are permitted. Use the existing CAS lease for active writes; respect a live competing claim and unexpected head movement. Preserve existing local worktrees/uncommitted work.

Allowed work is `product-schema/**`, directly necessary schema test tooling and evidence, and this lane's ops coordination/issue #50 records. Narrow workflow changes necessary to execute the schema tests may be made only without broadening permissions, accessing secrets or disabling checks. No production/runtime repair or new product semantics is implied.

## Reuse the existing Codex work

The user pasted a Codex summary reporting 21 attacks, 4 valid controls, full local schema checks for 25 cases per phase, zero full-chain baseline escapes, a local repair detecting all 21 attacks semantically, 26 regression assertions, and a clean repaired local chain without seal-constant changes. Treat this as a reported result until the existing Codex workspace's actual scripts/logs/patch are inspected. This operator has not reviewed that archive. Do not relabel it Claude work, rerun the entire discovery from scratch, or independently approve the patch based on this summary.

Codex should integrate the tested semantic fix, retain the adversarial and valid controls, audit the actual diff and run the current shipped verifier chain. Semantic versus seal-only detection stays explicit. Existing green CI and finite attack counts do not prove universal reconstruction correctness.

## Finish definition

Stay with the existing V1 product contract and disclosed limitations. Do not introduce another schema stage, demand exhaustive proof of every hypothetical mutation, or reopen broad architecture merely because the mandate says finish. Conversely, do not relabel an actual unresolved safety defect as a future improvement.

Resolve the demonstrated finding family and any concrete in-scope failure encountered while finishing. Obtain a separate read-only review of the final repair and the existing unresolved reconstruction/security acceptance items, using genuinely independent reviewers in the Codex workflow when available. Scheduling is not required; the substantive acceptance criteria remain. Do not call self-review independent or claim reviews that were not run. Review findings should have exact reproducible evidence and be grouped by cause.

Run local schema verification, deterministic regeneration and existing mutation/regression controls. Publish the candidate and collect successful Product Schema V1, CI, Coverage, Smoke (Targeted) and E2E Cypress for the same final SHA. Diagnose failures; fix in-scope causes, and report concrete out-of-scope blockers rather than silently widening work or repeatedly retrying unchanged failures.

Deliver exact base/final SHA/tree, patch/evidence locations, actual review results, exact run IDs, remaining disclosed limitations, and a concise usable V1 guide: where to inspect a screen/field/action, trace a task, locate governing semantics, analyze affected consumers and make a controlled schema change. Do not hide the authority-only states, unmapped draft fields, duplicate evidence or construction-required-state scope.

One final exact-head approval handoff remains before an irreversible/public freeze tag or final acceptance. No further per-edit permission loop is required. Prepare the frozen-baseline record, but do not tag/claim acceptance before the user's exact final approval. If review/execution capability is genuinely absent, finish all work that can be completed and report the one concrete blocker with portable artifacts—never invent green.

## Excluded work

No Golden/C1 or other frozen product-authority changes; no Gate A/B implementation, new journeys, provider/rail selection, Product Integrator activation, production/runtime changes, protected merges, force push, deployments, secrets, spending/signing or new paid services. No automatic resumption of the scheduled assembly line. Preserve the frozen product source `ux/experience-workbench@4ba456e6595330e4ca8e21366e0d827f17e10881` and its approved overlays/decisions.

This handoff is execution authority and a coordination change—not evidence that Codex has already applied the patch, passed hosted CI, completed independent review or frozen V1.
