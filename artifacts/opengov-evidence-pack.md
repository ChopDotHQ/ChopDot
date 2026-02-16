# OpenGov Evidence Pack

Generated: 2026-02-16T16:12:08.107881+00:00
Repo: /Users/devinsonpena/ChopDot
Branch: 12-23-feat_add_usdc_implementation

## Delivery History

- Commits (90d): 169
- Commits (365d): 247
- Top contributors:
  - 281	Devpen787
  -     20	Gizmotronn
  -      3	Liam Arbuckle

## Codebase Shape

- TS/TSX files: 259
- Approx TS/TSX LOC: 48178

## Verification

- `npm run type-check` => **SKIPPED**
- `npm run lint` => **SKIPPED**
- `npm run build` => **SKIPPED**
- `npx vitest run` => **SKIPPED**

## Documentation Anchors

Present:
- README.md
- spec.md
- docs/RELEASE_NOTES.md
- docs/supabase/INTEGRATION_WRAPUP.md
- docs/USER_ONBOARDING_READINESS.md

## Known Gap Markers (sample)

- README.md:155:- **Set to `1`:** Enables the placeholder `EvmAccountProvider` so MetaMask Embedded can drop in later without touching App wiring.
- spec.md:108:- ✅ Insights dashboard (spending analytics)
- spec.md:113:- ❌ PostgreSQL database (schema ready, not connected)
- spec.md:114:- ❌ REST API (documented, not implemented)
- spec.md:115:- ❌ Real-time sync (mock SyncBanner exists)
- spec.md:116:- ❌ Push notifications (mock NotificationCenter exists)
- spec.md:124:- ⚠️ Multi-user sync not implemented (see Known Issues)
- spec.md:130:- ❌ DeFi yield (Acala integration placeholder)
- spec.md:135:- ⚠️ Password reset UI (Supabase recovery link) — pending
- spec.md:136:- ⚠️ Rich email verification status + resend flow — pending
- spec.md:137:- ⚠️ Multi-factor / passkey support — future roadmap
- spec.md:225:- **Savings Pots:** Save together with DeFi yield (mock)
- spec.md:234:- **Insights:** Spending analytics, confirmation rates
- spec.md:306:- ⚠️ Multi-user sync not implemented (IPFS snapshots only - see Known Issues)
- spec.md:309:- ❌ Removed checkpoint system (pre-settlement verification, on-chain anchoring)
- spec.md:310:- ❌ Removed confirmation/attestation workflow (expense confirmations)
- spec.md:311:- ❌ Removed batch confirmation features (BatchConfirmSheet, batch attestations)
- spec.md:312:- ❌ Removed pot modes (casual vs auditable)
- spec.md:313:- ❌ Removed checkpoint-related UI (checkpoint buttons, status screens, alerts)
- spec.md:444:- [ ] Real Polkadot transactions not implemented (UI only)
- spec.md:445:- [ ] **Multi-user sync not implemented** - When users share a pot via IPFS link, each person gets a snapshot copy. Changes made by one user don't sync to others automatically. See `TECHNICAL_SYNC_ANALYSIS.md` for detailed analysis and potential solutions.
- spec.md:483:   - Use ✅ for completed, 🚧 for in-progress, ❌ for removed
- docs/USDC_IMPLEMENTATION_READY.md:27:- [x] `sim.ts` mock pattern matches plan
- docs/USDC_IMPLEMENTATION_READY.md:45:- Add mock implementations to `sim.ts`
- docs/USDC_IMPLEMENTATION_READY.md:60:### ⚠️ Important Implementation Details:
- docs/PROMPT_GUIDE_REFERENCE.md:13:❌ **Bad:** "Fix the expense bug"  
- docs/PROMPT_GUIDE_REFERENCE.md:459:### ❌ **Too Vague**
- docs/PROMPT_GUIDE_REFERENCE.md:466:### ❌ **Missing Context**
- docs/PROMPT_GUIDE_REFERENCE.md:472:### ❌ **Ignoring Constraints**
- docs/PROMPT_GUIDE_REFERENCE.md:478:### ❌ **No Acceptance Criteria**

## Recent Commits (sample)

- bcde61c fix(security): harden token handling and API endpoints
- 9510bd4 fix(security): remove credentials and add secret scanning
- ce5cb8b docs: add MVP action inventory checklist for Cypress
- 1e5a081 fix: make verify-edge-functions macos-compatible
- c454cc6 chore(build): prefer npm and drop yarn lock
- 3547c49 docs(remediation): close remaining phase items
- 67cc115 feat(app): add ipfs proxy and modular overlays
- 98c34d2 perf(build): split walletconnect evm chunk
- 90d625e perf(walletconnect): lazy-load sign client and modal
- 69be4f9 chore(vercel): add tailwindcss oxide optional dep
- 5edecbc chore(vercel): add lightningcss optional dep
- 8dbbd1e chore(vercel): fix rollup native install
- a938e60 chore(vercel): use npm ci for installs
- 6b48a84 perf(build): split supabase and ipfs vendors
- e98e28d perf(app): lazy-load secondary screens
