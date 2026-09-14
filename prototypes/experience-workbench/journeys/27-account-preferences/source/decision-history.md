## Decision history

**Coverage:** Journey 27 Account & Preferences V1 candidate definition.

### J27-D01 — Start only after J26 exact transition verification

Journey 27 is authoritative only after Golden #26 and exact resulting-state verification. This is satisfied for the current candidate lineage.

### J27-D02 — Keep account UX separate from identity-provider authority

**Decision:** Journey 27 may edit ChopDot display/profile presentation, but it must not imply that display-name changes alter cryptographic identity, wallet addresses, platform personhood, or historical participant attribution.

**Why:** Account presentation and identity authority are different trust domains.

### J27-D03 — Separate app notification preference from OS permission

**Decision:** ChopDot can store a notification preference, while device/OS notification permission is a named adjacent-owner boundary.

**Why:** An app cannot truthfully grant a system permission by toggling its own control.

### J27-D04 — Appearance preview is non-authoritative until save

**Decision:** Theme preview is reversible and cannot be described as persisted until a verified save outcome exists.

**Why:** Prevent navigation/preview from manufacturing durable preference truth.

### J27-D05 — Scope V1 security to current-session sign-out

**Decision:** V1 models current-session inspection and sign-out only. It does not claim remote-device/session revocation, credential rotation, key management, or production reauthentication.

**Why:** Those require backend/provider authority not proven by this prototype. V1 still covers the essential signed-in → sign-out user job honestly.

### J27-D06 — Unknown writes reconcile before replacement retry

**Decision:** Profile, notifications, appearance, sign-out, and deletion all use the same operation-truth rule: once effect may have started, an unknown result blocks a new operation until the existing operation is reconciled. Only proven no-effect exposes fresh retry.

**Why:** Avoid duplicate writes and false success/failure created by timeout or navigation.

### J27-D07 — Account deletion requires adjacent-owner prerequisites

**Decision:** Deletion is blocked while the user owns an active group or has unresolved money obligations requiring resolution. Group ownership transfer belongs to Journey 26; money resolution belongs to the appropriate money/settlement journey. Journey 24 owns export/portability.

**Why:** Account deletion must not orphan group authority, silently discard obligations, or duplicate adjacent product responsibilities.

### J27-D08 — Deletion scope preserves shared/external history

**Decision:** Verified deletion removes only the ChopDot account working state represented by this fixture. It does not claim erasure of shared group/expense history, user-controlled exports/backups, provider records, payment/settlement evidence, or public/on-chain history.

**Why:** Those records have separate owners, retention requirements, or technical immutability.

### J27-D09 — Typed confirmation uses the current display name

**Decision:** Eligible deletion requires an exact typed match of the current display name before final destructive review.

**Why:** Adds deliberate confirmation without pretending to be a security credential.

### J27-D10 — Exhaustive mechanical evidence, risk-based visual review

**Decision:** The candidate must still render and mechanically validate every registered material state/boundary at both canonical viewports with caller-reachability evidence. Independent direct visual review follows the active risk-based doctrine: inspect high-risk/new/changed families and escalate only when anomalies or uncertainty justify broader inspection.

**Why:** Preserve exhaustive coverage while avoiding redundant manual inspection of visually equivalent states.

### J27-D11 — Preserve prototype/production honesty

**Decision:** All account/session/deletion outcomes remain deterministic fixture truth. The candidate does not claim real backend persistence, auth-provider mutation, OS permission changes, external erasure, payment/settlement, wallet signing, or chain effects.

**Why:** Review should evaluate the product contract without overstating implementation maturity.
