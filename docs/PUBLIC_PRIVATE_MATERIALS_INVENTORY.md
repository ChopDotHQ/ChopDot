# Public Private Materials Inventory

<discovery_plan>
- Inventory the current ChopDot repo surface through a public/private lens
- Recommend what should stay public, move private, or stay local-only
- Reduce ambiguity so openness does not accidentally expose company-operational material
</discovery_plan>

## FACTS

- The current docs worktree contains a mix of:
  - public product doctrine
  - engineering/reference docs
  - investor and finance materials
  - strategy and GTM materials
  - pilot and pricing-adjacent materials
  - experimental and historical implementation docs
- ChopDot wants:
  - a genuinely open product/core posture
  - some privacy around company-operational work
  - protection from low-effort cloning through structure, not secrecy theater
- The repo already distinguishes:
  - current
  - supporting
  - historical
  - experimental

## INFERENCES

- The next needed distinction is not just status.
- The next needed distinction is:
  - public
  - private
  - local-only
- Some of the currently tracked docs are fine for internal clarity, but should not remain in a permanently public company surface.

## ASSUMPTIONS

- This inventory is about recommended exposure, not immediate deletion.
- "Private" means move to a private repo/workspace or keep out of the public repo.
- "Local-only" means personal or rough working material that should not become shared truth by default.

## Classification Rules

### Public

Keep public if the material:

- helps users, contributors, reviewers, or ecosystem partners understand the product
- improves the public technical or product surface
- can be safely read by competitors without materially exposing company operations

### Private

Move private if the material:

- reveals sensitive commercial thinking
- exposes fundraising, pricing, partner, or pilot detail
- reveals internal legal/compliance strategy or operational sensitivity
- helps a competitor more than it helps a contributor or user

### Local-only

Keep local-only if the material:

- is incomplete or exploratory
- is personally contextual
- is not yet good enough to standardize internally
- contains sensitive prep not needed even by the internal team

## Keep Public

These should remain public because they define the product, core architecture, or safe contributor-facing direction.

### Product and kernel doctrine

- `docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md`
- `docs/SHARED_COMMITMENT_KERNEL_SPEC.md`
- `docs/REFERENCE_FLOWS.md`
- `docs/MOAT_COMPETITION_ALTERNATIVES.md`
- `docs/USE_CASES_MATRIX.md`
- `docs/EDGE_CASES_MATRIX.md`
- `docs/CHAT_SHARE_69D95681_SYNTHESIS.md`
- `docs/ANTIFRAGILITY_AND_FAILURE_LEARNING.md`
- `docs/RESEARCH_AGENDA_TRUST_AND_FAILURE.md`

### Architecture and implementation posture

- `docs/TECH_ARCHITECTURE_MAP.md`
- `docs/API_READINESS_PLAN.md`
- `docs/FUTURE_TECH_REPLACEMENT_MAP.md`
- `docs/BUILD_MATRIX_V1.md`
- `docs/KERNEL_VERIFICATION.md`
- `docs/APP_ROUTER_ACTION_CONTRACT.md`
- `docs/API_REFERENCE.md`

### Contributor / execution docs

- `docs/TEDDY_READ_FIRST.md`
- `docs/TEDDY_START_HERE.md`
- `docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md`
- `docs/TEDDY_IMPLEMENTATION_ORDER.md`
- `docs/TEDDY_UX_MAPPING.md`
- `docs/CROSS_IDE_COLLABORATION.md`
- `docs/DOC_STATUS_MAP.md`
- `docs/OPEN_AREAS_PRIORITY_MAP.md`
- `docs/OPEN_SOURCE_STRATEGY_MEMO.md`

### Public-safe research and future framing

- `docs/LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md`
- `docs/CROPS_PHASED_ROADMAP_REVIEW.md`
- `docs/RESEARCH_RECOVERY_CONFIDENCE_MEMO.md`
- `docs/RESEARCH_REPORT_DELTA_AND_MERGE_PLAN.md`
- `docs/RESEARCH_REPORTS_4_5_DELTA_AND_MERGE_PLAN.md`
- `docs/WEB3_REPO_BEST_PRACTICES_MAP.md`
- `docs/ECOSYSTEM_FUNDING_AND_MEASUREMENT_MAP.md`
- `docs/SYSTEM_METRICS_AND_FORMULAS.md`

Why these stay public:

- they strengthen the public technical thesis
- they are part of the product doctrine
- they help contributors and reviewers understand what ChopDot is actually building

## Move Private

These should move into a private repo or workspace because they expose company-operational thinking more than public product value.

### Investor and fundraising materials

- `docs/INVESTOR_MEMO.md`
- `docs/WHY_NOW_AND_CATEGORY_CREATION.md`
- `docs/USE_OF_FUNDS_AND_RAISE_PLAN.md`
- `docs/TRACTION_AND_PROOF_REQUIREMENTS.md`
- `docs/VC_READINESS_GAPS_AND_PLAN.md`
- `docs/BIG_DOG_READINESS_MATRIX.md`

Reason:

- these are not contributor docs
- they are company positioning and raise preparation materials

### Finance and pricing materials

- `docs/finance/CHOPDOT_FINANCIAL_MODEL_2026.xlsx`
- `docs/finance/CHOPDOT_FINANCIAL_OVERVIEW_2026.md`
- `docs/finance/MONETIZATION_MODEL_TODAY_VS_TOMORROW.md`
- `docs/finance/PROTOCOL_AND_LAYER_MONETIZATION_MAP.md`
- `docs/PRODUCT_EVALUATION_SCORECARD_2026.md`

Reason:

- these reveal internal planning, pricing posture, burn assumptions, runway assumptions, and valuation thinking

### Internal company execution and business-learning materials

- `docs/PARALLEL_EXECUTION_PRIORITY_LIST.md`
- `docs/FOUNDER_PARALLEL_WORKSTREAM.md`
- `docs/BUSINESS_FLYWHEEL_AND_GTM_MAP.md`
- `docs/LAUNCH_PERIMETER_AND_SURVIVABILITY_PLAN.md`
- `docs/SECURITY_PRIVACY_REVIEW.md`

Reason:

- these are useful internally, but expose operating priorities, launch boundaries, and trust/legal thinking in more detail than the public needs

### Partner / pilot / commercial strategy-adjacent materials

- any future pilot candidate lists
- any future pricing interview notes
- any future customer interview notes
- any future partner or ecosystem negotiation materials

Reason:

- this is company-operational intelligence

## Keep Public For Now, But Review Later

These are currently acceptable in public, but may later be better as private or summarized-public versions.

- `docs/TEDDY_FOUNDER_HANDOFF.md`
- `docs/TEDDY_FULL_CONTEXT_BRIEF.md`
- `docs/FOUNDER_VALIDATION_PLAN.md`
- `docs/OPEN_AREAS_PRIORITY_MAP.md`
- `docs/LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md`
- `docs/CROPS_PHASED_ROADMAP_REVIEW.md`

Reason:

- they are useful right now
- but some contain more company sequencing and sensitivity than you may want permanently public

Recommended treatment:

- keep public during the current reset
- later replace with trimmed public versions if needed

## Historical / Experimental Docs

These should not drive product decisions, but they can usually remain public as implementation history unless they contain sensitive operator detail.

### Fine to remain public as history

- `docs/archive/*`
- `docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md`
- `docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md`
- `docs/WALLETCONNECT_ANALYSIS.md`
- `docs/WALLET_AUTH_ROLLOUT.md`
- `docs/USDC_IMPLEMENTATION_*`
- `docs/IPFS_CRUST_GUIDE.md`

Why:

- they mostly expose technical history, not current company-operational intelligence

### Review for sensitivity

- `docs/AUDIT_FINDINGS.md`
- `docs/CONSOLE_WARNING_AUDIT.md`
- `docs/SCHEMA_VERIFICATION_RESULTS.md`
- `docs/TROUBLESHOOTING_BALANCE_AND_MIGRATION.md`

Why:

- these may reveal more operational weakness or internal debugging posture than you want public long-term

## Private Repo Recommendation

Create a private companion surface, for example:

- `chopdot-ops`

Suggested structure:

- `finance/`
- `fundraising/`
- `pricing/`
- `pilots/`
- `partners/`
- `legal/`
- `security/`
- `ops/`
- `dashboards/`

## Local-Only Recommendation

Keep these local-only:

- `.agents/`
- `.memory/`
- rough meeting notes
- rough investor notes
- rough pricing drafts
- incomplete threat models
- exploratory drafts not yet ready for internal standardization

## Immediate Moves

### Move first

These are the highest-priority candidates to move private:

1. `docs/INVESTOR_MEMO.md`
2. `docs/WHY_NOW_AND_CATEGORY_CREATION.md`
3. `docs/USE_OF_FUNDS_AND_RAISE_PLAN.md`
4. `docs/VC_READINESS_GAPS_AND_PLAN.md`
5. `docs/BIG_DOG_READINESS_MATRIX.md`
6. `docs/finance/CHOPDOT_FINANCIAL_MODEL_2026.xlsx`
7. `docs/finance/CHOPDOT_FINANCIAL_OVERVIEW_2026.md`
8. `docs/finance/MONETIZATION_MODEL_TODAY_VS_TOMORROW.md`
9. `docs/finance/PROTOCOL_AND_LAYER_MONETIZATION_MAP.md`
10. `docs/SECURITY_PRIVACY_REVIEW.md`

### Keep public and stable

These are the public core you should be comfortable defending:

- kernel roadmap/spec
- architecture map
- API readiness
- reference flows
- research agenda
- system metrics/formulas
- open source strategy

## Decision Rule

Before keeping a file public, ask:

1. Does this help contributors or users understand/build ChopDot?
2. Does this expose pricing, fundraising, partner, pilot, or internal operating leverage?
3. Does this reveal security/legal/compliance detail better kept private?
4. Would a competitor gain more from this than a contributor would?

If `2`, `3`, or `4` is strongly yes, move it private or publish a trimmed version instead.

## One-Line Rule

**Keep the product and architecture public; keep financing, fundraising, partner strategy, and sensitive operating detail private.**
