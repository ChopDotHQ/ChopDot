# ChopDot Research Index

Research artifacts in this directory separate four evidence levels:

1. complete source-universe snapshots;
2. commit-pinned source inspection;
3. bounded ChopDot architecture decisions;
4. runtime or graph verification executed against this exact worktree.

## Products Devnet catalog

- Human report: `RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`
- Machine catalog: `PARITY_PRODUCTS_DEVNET_CATALOG.json`
- Opportunity matrix: `CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md`
- Graph-readable decisions: `CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md`
- Live registry report: `LIVE_DEVNET_REGISTRY_REFRESH.md`
- Official GitHub census: `parity-repository-snapshots/2026-08-22T20-22-00Z.json`
- Content-addressed Devnet census: `devnet-registry-snapshots/2026-08-22T20-22-00Z.json`
- Commit-pinned source audit: `evidence/source-deep-audit.json`
- Architecture decision inputs: `evidence/chopdot-catalog-decisions.json`
- Package freshness observation: `evidence/npm-package-version-observation.json`
- Reproducible refresh scripts: `../../scripts/research/refresh-products-devnet-catalog.mjs`,
  `../../scripts/research/audit-products-devnet-sources.mjs`, and
  `../../scripts/research/build-products-devnet-catalog.mjs`

The machine catalog contains every repository and every observed registry row.
The human report intentionally summarizes those universes; it does not replace
them.

## ChopDot feature inheritance and external analog coverage

- Human matrix: `CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md`
- Machine matrix: `CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json`
- KG-readable decisions: `CHOPDOT_FEATURE_INHERITANCE_DECISIONS.md`
- Curated family/path mapping input:
  `evidence/chopdot-feature-family-mapping-input.json`
- Hashed, read-only canonical cockpit snapshot:
  `evidence/chopdot-product-cockpit-source-snapshot.json`
- Reproducible builder:
  `../../scripts/research/build-chopdot-feature-inheritance-matrix.mjs`
- Independent verifier:
  `../../scripts/research/verify-chopdot-feature-inheritance-matrix.mjs`
- Verification result:
  `../../artifacts/agentops/feature-inheritance-matrix-verification.json`
- Exact-worktree Repo Graph packet:
  `../../artifacts/agentops/feature-inheritance-repo-graph-packet.json`
- Targeted KGv2 recall:
  `../../artifacts/agentops/feature-inheritance-kgv2-recall.json`
- AgentOps verification summary:
  `../../artifacts/agentops/feature-inheritance-agentops-verification.json`

This matrix maps all 35 current cockpit cards and all 42 current generated
behavior paths. It intentionally records that Spend Card, savings circle,
emergency pot, and community fund are present as future journey families but
have zero generated paths. A registry-only analog such as CircleCredit remains
a discovery lead until its source, license, protocol, and runtime are audited.

## Full-product `.dot` Devnet execution plan

- Human plan:
  `../superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md`
- Machine manifest:
  `../superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json`
- Coverage validator:
  `../../scripts/research/verify-chopdot-full-product-deployment-plan.mjs`
- Coverage result:
  `../../artifacts/agentops/full-product-deployment-plan-verification.json`
- Targeted KGv2 verifier:
  `../../scripts/research/agentops-full-product-plan-kgv2.py`
- KGv2 recall and verification:
  `../../artifacts/agentops/full-product-plan-kgv2-recall.json` and
  `../../artifacts/agentops/full-product-plan-agentops-verification.json`

The plan rejects Supabase for v1 without pretending Devnet supplies a generic
database. It assigns canonical truth, local projection, active delivery,
recovery, blobs, naming, payments, notifications, export, publication, and
rollback to separate bounded responsibilities and proof gates.
