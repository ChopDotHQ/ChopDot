# Journey 27 — Account & Preferences V1

Status: **candidate definition owned by Builder**. Journey 26 is Golden #26 and the J26→J27 resulting state is exact-head verified.

## Goal

Give one signed-in person a clear place to understand and change ChopDot account identity, notification preferences, appearance, session/security state, sign-out, and account deletion without allowing cached state, navigation, or UI preferences to manufacture authority.

## Entry

`You` tab / account menu → Account & preferences.

## Exit

Return to `You`, a system-owned settings/reauth boundary, or a verified signed-out/deleted terminal state.

## V1 ownership model

Journey 27 owns the **customer-facing account/preferences workflow and prototype operation truth** only. It does not claim a production identity database, authentication provider, notification delivery system, device permission controller, account erasure service, settlement engine, wallet signer, or chain mutation.

V1 separates five domains:

1. **Profile identity** — ChopDot display name and avatar/profile presentation. A display-name change does not change cryptographic/account identity, wallet address, group history, or settlement attribution.
2. **Notifications** — the user's ChopDot notification preference. OS/device push permission is a separate system boundary; an app preference cannot grant system permission.
3. **Appearance** — System / Light / Dark app preference. Preview is reversible and is not persisted until Save succeeds.
4. **Security / session** — current-session inspection and sign-out. Sign-out revokes the local/session fixture only; it does not delete the account, alter group/money history, or claim remote-session revocation.
5. **Account deletion** — guarded deletion of the user's ChopDot account working state. Deletion is blocked while the user still owns a group or has unresolved money obligations that require an adjacent owner journey. Shared group/expense history, exports/backups, provider records, and public/on-chain history are explicitly not claimed erased.

## Required invariants

### J27-I01 — Fresh session truth before mutation

Cached profile/session facts can be displayed as last-known information, but writes require refreshed account/session truth. Offline mode is read-only.

### J27-I02 — UI preference ≠ authority

Display name, notifications, and appearance never create payment, wallet, group-owner, signing, or identity-provider authority.

### J27-I03 — Draft / preview ≠ persisted preference

Editing or previewing is reversible. Only a verified save result becomes the current preference in this prototype.

### J27-I04 — OS permission stays system-owned

Turning on ChopDot push preference cannot grant device/OS permission. If permission is absent, Journey 27 hands off to the system-owned notification-settings boundary and then refreshes current effective truth.

### J27-I05 — Conflict is not success

If the account/preference version changed since review, preserve the newer known truth and require refresh/re-review. Never overwrite silently.

### J27-I06 — Unknown result blocks replacement retry

After an effect may have started, timeout/unknown outcome must reconcile the same operation identity before offering a new write. A new retry is allowed only after reconciliation proves no effect.

### J27-I07 — Sign-out is not deletion

Verified sign-out ends the current session fixture only. Account identity, shared history, preferences stored elsewhere, group data, balances, and external/provider state are not described as deleted.

### J27-I08 — Deletion prerequisites are explicit

Account deletion cannot proceed while this person is still the owner of an active group or while unresolved money obligations require resolution. Those are adjacent-owner boundaries, not effects Journey 27 may fake.

### J27-I09 — Deletion scope is narrow and honest

A verified deleted state means the ChopDot account working state represented by this prototype is removed. Shared group/expense history remains attributable through durable participant/history records as required by their owning journeys. Exports/backups, provider records, and chain/public history are not claimed erased.

### J27-I10 — Navigation cannot create outcome truth

Back, tabs, reloads, and direct URLs are location only. They cannot convert pending/unknown/failed operations into saved, signed-out, or deleted outcomes.

## Primary user flows

### A. Enter and inspect

`account-entry → account-loading → account-overview`

Offline or load failure remains read-only and never exposes mutation as verified current truth.

### B. Edit display identity

`profile-overview → profile-edit → profile-review → profile-saving → profile-saved`

Material alternates: invalid input; cancel before save; stale-version conflict; known failure; unknown result → reconcile → proven no-effect retry or discovered saved result.

### C. Notification preference

`notifications-overview → notifications-edit → notifications-review → notifications-saving → notifications-saved`

If push preference is on but system permission is absent, show `notifications-permission-needed` and hand off to the system notification boundary. Denial leaves effective push unavailable without falsifying the saved app preference.

### D. Appearance

`appearance-overview → appearance-preview → appearance-saving → appearance-saved`

Preview never mutates persisted truth. Failure restores the previously saved preference. Unknown result reconciles before another save.

### E. Security / sign out

`security-overview → signout-review → signing-out → signed-out`

Known failure preserves the session. Unknown result reconciles the same sign-out operation before any retry.

### F. Delete account

`deletion-entry → deletion-review`

If group ownership or unresolved money blocks deletion, hand off to the owning journey and return with refreshed prerequisites. When eligible:

`deletion-review → deletion-type-confirm → deletion-final-review → deletion-requesting → deleted`

Typed confirmation must match the current display name. Cancellation is available only before execution begins. Unknown result reconciles the same deletion request; no duplicate deletion request is created while outcome is uncertain.

## Adjacent-owner boundaries

- `you-home-boundary` — returns to the owning `You` surface.
- `notification-system-boundary` — device/OS notification permission/settings; Journey 27 cannot grant it.
- `ownership-transfer-boundary` — Journey 26 group lifecycle ownership transfer / leave prerequisites.
- `money-resolution-boundary` — settlement/money resolution in the owning money journeys; Journey 27 cannot settle or zero balances.
- `export-boundary` — Journey 24 Export / Portability for a user-controlled copy before deletion.

## Prototype / production boundary

This candidate is a deterministic fixture for UX contract review. It does **not** claim production persistence, real authentication/session invalidation, OS permission mutation, notification delivery, backend deletion, provider erasure, wallet/chain effects, payment/settlement, or external recovery finality.

## Factory evidence requirements

- Factory generation `v1.1`.
- Every registered material state must have truthful caller reachability from `account-entry` or be a named adjacent-owner boundary.
- Deterministic browser QA at 393×852 and 430×890.
- No horizontal overflow or clipped required action.
- No page/console errors or external runtime requests.
- Exact candidate SHA/head/tree and evidence artifact binding.
- Independent five-lens review. Direct visual review follows the active risk-based visual doctrine; exhaustive screenshot generation/mechanical checks remain required.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 27 Account & Preferences V1 candidate definition and independently reviewed product contract. This normalization adds the required decision-history metadata without changing the reviewed J27 HTML or product meaning.

### J27-D01 — Start only after J26 exact transition verification

**Decision:** Journey 27 is authoritative only after Golden #26 and exact resulting-state verification. This condition was satisfied for the reviewed candidate lineage before J27 candidate construction.

**Why:** Preserve sequential product authority and prevent account/preferences work from outrunning the validated Golden chain.

**Alternatives:** Starting J27 before J26 exact-head verification was rejected by the canonical transition contract.

**Tradeoffs:** Sequential gating adds transition latency but keeps the journey chain auditable and prevents stale authority from becoming product truth.

**Revisit when:** Only if the canonical journey-transition authority model is explicitly revised.

**Approval / version:** Process prerequisite for J27 V1; it does not itself approve J27 product behavior.

**Sources:** [Current work packet](current-work-packet.md), [Journey 27 spec](../spec.md), and [Journey registry](../../../registry/journeys.json).

### J27-D02 — Keep account UX separate from identity-provider authority

**Decision:** Journey 27 may edit ChopDot display/profile presentation, but it must not imply that display-name changes alter cryptographic identity, wallet addresses, platform personhood, or historical participant attribution.

**Why:** Account presentation and identity authority are different trust domains.

**Alternatives:** Treating a display-name edit as an identity-provider or cryptographic identity mutation was rejected.

**Tradeoffs:** The UI must expose a narrower account-editing promise, but avoids false authority and identity-history rewriting.

**Revisit when:** A production identity provider or platform-personhood contract is explicitly integrated and independently reviewed.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D03 — Separate app notification preference from OS permission

**Decision:** ChopDot can store a notification preference, while device/OS notification permission is a named adjacent-owner boundary.

**Why:** An app cannot truthfully grant a system permission by toggling its own control.

**Alternatives:** Modeling the in-app preference toggle as direct OS permission authority was rejected.

**Tradeoffs:** The flow has an explicit handoff boundary, adding one more state while preserving platform truth.

**Revisit when:** A production platform-permission integration can prove the external permission result and reconciliation path.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D04 — Appearance preview is non-authoritative until save

**Decision:** Theme preview is reversible and cannot be described as persisted until a verified save outcome exists.

**Why:** Prevent navigation or preview from manufacturing durable preference truth.

**Alternatives:** Treating preview state as a persisted preference was rejected.

**Tradeoffs:** Preview and saved state require distinct UI/state handling, but recovery and navigation remain honest.

**Revisit when:** The persistence contract changes or a production preference store provides stronger verified-write semantics.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D05 — Scope V1 security to current-session sign-out

**Decision:** V1 models current-session inspection and sign-out only. It does not claim remote-device/session revocation, credential rotation, key management, or production reauthentication.

**Why:** Those capabilities require backend/provider authority not proven by this prototype. V1 still covers the essential signed-in to sign-out user job honestly.

**Alternatives:** Expanding V1 to remote session control, credential rotation, or key management without proven authority was rejected.

**Tradeoffs:** Security scope is intentionally narrower, but the candidate avoids overclaiming capabilities that belong to production authentication infrastructure.

**Revisit when:** A reviewed authentication/session-management implementation provides remote-session or credential-management authority.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D06 — Unknown writes reconcile before replacement retry

**Decision:** Profile, notifications, appearance, sign-out, and deletion all use the same operation-truth rule: once an effect may have started, an unknown result blocks a new operation until the existing operation is reconciled. Only proven no-effect exposes fresh retry.

**Why:** Avoid duplicate writes and false success/failure created by timeout or navigation.

**Alternatives:** Immediate replacement retry from an unknown outcome was rejected.

**Tradeoffs:** Recovery can require an extra reconciliation step, but duplicate mutation risk and contradictory state are reduced.

**Revisit when:** The underlying production mutation APIs provide stronger idempotency/result guarantees that can simplify recovery without weakening truth.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D07 — Account deletion requires adjacent-owner prerequisites

**Decision:** Deletion is blocked while the user owns an active group or has unresolved money obligations requiring resolution. Group ownership transfer belongs to Journey 26; money resolution belongs to the appropriate money/settlement journey. Journey 24 owns export/portability.

**Why:** Account deletion must not orphan group authority, silently discard obligations, or duplicate adjacent product responsibilities.

**Alternatives:** Allowing deletion to bypass group ownership, money obligations, or export ownership boundaries was rejected.

**Tradeoffs:** Deletion may require detours through adjacent journeys, but preserves financial and group-authority integrity.

**Revisit when:** Adjacent Golden contracts for group ownership, settlement, or export are explicitly revised.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), [edge cases](../EDGE_CASES.md), and [Journey registry](../../../registry/journeys.json).

### J27-D08 — Deletion scope preserves shared/external history

**Decision:** Verified deletion removes only the ChopDot account working state represented by this fixture. It does not claim erasure of shared group/expense history, user-controlled exports/backups, provider records, payment/settlement evidence, or public/on-chain history.

**Why:** Those records have separate owners, retention requirements, or technical immutability.

**Alternatives:** A blanket “delete everything everywhere” promise was rejected because the prototype cannot prove that authority.

**Tradeoffs:** Deletion copy must explain retained/external records, but avoids misleading privacy claims.

**Revisit when:** Production retention, erasure, export, and external-provider contracts are implemented and independently reviewed.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D09 — Typed confirmation uses the current display name

**Decision:** Eligible deletion requires an exact typed match of the current display name before final destructive review.

**Why:** Adds deliberate confirmation without pretending to be a security credential.

**Alternatives:** No confirmation and treating the typed phrase as authentication were both rejected.

**Tradeoffs:** The step adds friction to deletion but creates a clear deliberate-action boundary while keeping authentication authority separate.

**Revisit when:** The destructive-action confirmation model or production reauthentication contract is explicitly revised.

**Approval / version:** J27 V1 reviewed product decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), and [edge cases](../EDGE_CASES.md).

### J27-D10 — Exhaustive mechanical evidence, risk-based visual review

**Decision:** The candidate must render and mechanically validate every registered material state/boundary at both canonical viewports with caller-reachability evidence. Independent direct visual review follows the active risk-based doctrine: inspect high-risk, new, or changed families and escalate only when anomalies or uncertainty justify broader inspection.

**Why:** Preserve exhaustive coverage while avoiding redundant manual inspection of visually equivalent states.

**Alternatives:** Manual inspection of every generated screenshot by default and reduced mechanical coverage were both rejected.

**Tradeoffs:** The reviewer must document sample sufficiency and escalation logic, while automation retains full-state evidence coverage.

**Revisit when:** Visual-diff automation, viewport policy, or review-risk doctrine materially changes.

**Approval / version:** J27 V1 reviewed evidence/review-process decision.

**Sources:** [Current work packet](current-work-packet.md), [Journey 27 spec](../spec.md), and [review QA source](review-qa-v1.mjs).

### J27-D11 — Preserve prototype/production honesty

**Decision:** All account/session/deletion outcomes remain deterministic fixture truth. The candidate does not claim real backend persistence, auth-provider mutation, OS permission changes, external erasure, payment/settlement, wallet signing, or chain effects.

**Why:** Review should evaluate the product contract without overstating implementation maturity.

**Alternatives:** Presenting deterministic prototype outcomes as production/live effects was rejected.

**Tradeoffs:** Prototype copy must carry explicit limitations, but trust and later implementation mapping remain accurate.

**Revisit when:** Production interfaces are integrated and exact live behavior has independent evidence.

**Approval / version:** J27 V1 reviewed product/trust decision.

**Sources:** [Journey 27 spec](../spec.md), [state inventory](../STATE_INVENTORY.md), [edge cases](../EDGE_CASES.md), and [review QA source](review-qa-v1.mjs).
<!-- JOURNEY_DECISION_HISTORY:END -->
