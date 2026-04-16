# Doc Status Map

<discovery_plan>
- Make it clear which documents are current source of truth
- Mark historical and experimental material so it does not compete with current direction
- Give founders and builders a safe reading order
</discovery_plan>

## FACTS

- The repository contains multiple eras of ChopDot:
  - shared expenses / wallet / chain-heavy exploration
  - API/data-layer stabilization work
  - hackathon / PVM closeout experimentation
  - current shared commitment kernel direction
- Older documents still exist in `docs/` and can be useful.
- Older documents can also mislead readers if they are treated as current product doctrine.

## INFERENCES

- The repo needs a clear document status map.
- The right move is not to delete historical material immediately.
- The right move is to classify it clearly first.

## ASSUMPTIONS

- This status map will be updated as decisions change.
- A later cleanup may move some historical documents into archive folders or add frontmatter/status labels per file.

## Status Definitions

### Current

Use these to make active product, architecture, finance, and execution decisions now.

### Supporting

Useful for current work, but not the main source of truth by themselves.

### Historical

Useful to understand how the repo evolved.
Do not let these override current direction without an explicit decision.

### Experimental

Useful as prototypes, explorations, or future reference.
Not current product scope.

## Current Source Of Truth

### Strategy / product

- `docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md`
- `docs/SHARED_COMMITMENT_KERNEL_SPEC.md`
- `docs/REFERENCE_FLOWS.md`
- `docs/CHAT_SHARE_69D95681_SYNTHESIS.md`
- `docs/RESEARCH_RECOVERY_CONFIDENCE_MEMO.md`
- `docs/USE_CASES_MATRIX.md`
- `docs/EDGE_CASES_MATRIX.md`
- `docs/FOUNDER_VALIDATION_PLAN.md`
- `docs/PARALLEL_EXECUTION_PRIORITY_LIST.md`
- `docs/FOUNDER_PARALLEL_WORKSTREAM.md`
- `docs/OPERATOR_PARALLEL_EXECUTION_CHECKLIST.md`
- `docs/OPEN_AREAS_PRIORITY_MAP.md`
- `docs/OPEN_SOURCE_STRATEGY_MEMO.md`
- `docs/PUBLIC_PRIVATE_MATERIALS_INVENTORY.md`
- `docs/CELL_SYSTEM_POLKADOT_FUTURE_LESSONS.md`
- `docs/MOAT_COMPETITION_ALTERNATIVES.md`
- `docs/RESEARCH_AGENDA_TRUST_AND_FAILURE.md`
- `docs/RESEARCH_REPORT_DELTA_AND_MERGE_PLAN.md`
- `docs/RESEARCH_REPORTS_4_5_DELTA_AND_MERGE_PLAN.md`
- `docs/ANTIFRAGILITY_AND_FAILURE_LEARNING.md`

### Architecture / implementation posture

- `docs/TECH_ARCHITECTURE_MAP.md`
- `docs/API_READINESS_PLAN.md`
- `docs/FUTURE_TECH_REPLACEMENT_MAP.md`
- `docs/BUILD_MATRIX_V1.md`
- `docs/SYSTEM_METRICS_AND_FORMULAS.md`
- `docs/LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md`
- `docs/SECURITY_PRIVACY_REVIEW.md`
- `docs/LAUNCH_PERIMETER_AND_SURVIVABILITY_PLAN.md`
- `docs/WEB3_REPO_BEST_PRACTICES_MAP.md`

### Teddy handoff / execution

- `docs/TEDDY_READ_FIRST.md`
- `docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md`
- `docs/TEDDY_IMPLEMENTATION_ORDER.md`
- `docs/TEDDY_UX_MAPPING.md`
- `docs/TEDDY_FOUNDER_HANDOFF.md`

### Finance

- `docs/finance/CHOPDOT_FINANCIAL_OVERVIEW_2026.md`
- `docs/finance/CHOPDOT_FINANCIAL_MODEL_2026.xlsx`
- `docs/finance/MONETIZATION_MODEL_TODAY_VS_TOMORROW.md`
- `docs/finance/PROTOCOL_AND_LAYER_MONETIZATION_MAP.md`

## Supporting Current Work

These can support current execution but should be interpreted through the current shared-commitment lens.

- `docs/KERNEL_VERIFICATION.md`
- `docs/BUILDER_QUICKSTART.md`
- `docs/FEATURE_FLAGS.md`
- `docs/CHAT_SHARE_69D95681_TECH_REPLACEMENT_EXTRACT.md`
- `docs/CROPS_PHASED_ROADMAP_REVIEW.md`
- `docs/API_REFERENCE.md`
- `docs/ENGINEERING_REMEDIATION_PLAN.md`
- `docs/APP_ROUTER_ACTION_CONTRACT.md`
- `docs/APP_MODULARIZATION_*`
- `docs/SUPABASE_INTEGRATION_PLAN.md`
- `docs/SUPABASE_INTEGRATION_PLAN_REVIEW.md`
- `docs/USER_ONBOARDING_READINESS.md`

## Historical

These documents reflect earlier eras of the product or earlier technical framing.

- most of `docs/archive/`
- older Supabase troubleshooting / integration wrapups
- older release/checklist docs that predate the current commitment-kernel reset
- older QA and automation audits that are still useful as process references, but not as strategy

Examples:

- `docs/archive/spec.md`
- `docs/archive/TECHNICAL_SYNC_ANALYSIS.md`
- `docs/archive/SECURITY_REVIEW.md`
- `docs/RELEASE_NOTES.md`
- `docs/SMOKE_TEST_CHECKLIST.md`
- `docs/MIGRATION_VERIFICATION.md`

## Experimental

These are important experiments or future options, but they are not the current product center.

- chain / PVM / closeout-contract experiments
- local-chain work
- wallet-heavy exploratory docs
- token-optimization exploration

Examples:

- `docs/HACKATHON_PVM_CLOSEOUT_DEVELOPER_BRIEF.md`
- `docs/POLKADOT_HUB_CONTRACT_EXPERIMENTS.md`
- `docs/WALLET_AUTH_ROLLOUT.md`
- `docs/WALLETCONNECT_ANALYSIS.md`
- `docs/USDC_IMPLEMENTATION_*`
- `docs/plans/token-optimization-plan.md`
- `docs/IPFS_CRUST_GUIDE.md`

## Safe Reading Order

If someone is new to the repo, they should read in this order:

1. `obsidian/00_HOME.md`
2. `docs/TEDDY_READ_FIRST.md` or `docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md`
3. `docs/SHARED_COMMITMENT_KERNEL_SPEC.md`
4. `docs/TECH_ARCHITECTURE_MAP.md`
5. `docs/FOUNDER_VALIDATION_PLAN.md`
6. `docs/PARALLEL_EXECUTION_PRIORITY_LIST.md`
6. finance docs if business planning is needed

## Practical Rule

If a document conflicts with the current shared commitment kernel direction, default to:

- roadmap
- kernel spec
- architecture map
- founder validation plan
- launch perimeter

and treat the conflicting document as historical or experimental unless explicitly promoted back into current scope.

## Next Hygiene Step

A later pass should add explicit status frontmatter to older docs, for example:

- `status: current`
- `status: supporting`
- `status: historical`
- `status: experimental`

That will make the repo even harder to misread.
