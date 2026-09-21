# ChopDot Product Schema V1 — Stage 2 Semantic Core

**Status: complete candidate**  
**Frozen authority:** `4ba456e6595330e4ca8e21366e0d827f17e10881`  
**Stage 1 baseline:** `e53edfd51d8ac4f31c618896518ddd66cb2dece3`

Stage 2 normalizes the product meaning already present in the frozen journeys and approved contracts. It does **not** redraw the UX, choose providers, repair runtime code, or create new product policy.

## Result

The frozen product now resolves into **42 canonical semantic objects**, **45 operation families**, **7 derived/read models**, and **34 cross-domain laws** across **10 product domains**.

The canonical machine-readable owner is `semantic-core.json`. This Markdown file is a checkpoint summary, not a second semantic source.

## Normalized domains

1. Identity & access
2. Exact money
3. Cross-cutting operation truth & recovery
4. Groups, expenses, review & position
5. Settlement, requests, destinations & wallet
6. Pre/during-purchase spend
7. Savings coordination
8. Activity, history & insights
9. Import, export, backup & restore
10. Account presentation & preferences

## Important separations preserved

The normalization explicitly refuses to collapse:

- Participant into AccountIdentity;
- PaymentIntent into SpendIntent;
- PaymentDestination into WalletSession;
- PaymentRequest into PaymentIntent;
- notification unread state into unresolved attention;
- ActivityItem into raw accepted history;
- savings control semantics into ordinary expense-group semantics;
- group archive into settlement/deletion;
- export data into executable guest authority.

These boundaries are already present in the approved product/contracts. Stage 2 gives them stable names so Gate B and later gates can compose them consistently.

## Cross-cutting laws captured once

Examples include:

- exact MoneyV1 partitioning;
- stable operation identity for possible-effect outcomes;
- reconcile-before-replacement-retry;
- navigation/reload is never execution evidence;
- stale truth refreshes before write;
- append-only replay-safe accepted history;
- split conservation;
- review/edit ownership separation;
- dependent-only issue blocking;
- currency-separated Position;
- exact settlement scope and typed payment lifecycle;
- confirmed-only savings money;
- Activity/read-state separation;
- import/export/storage authority boundaries;
- group lifecycle never rewriting ledger truth;
- account deletion respecting adjacent owners;
- SpendIntent exactly-once effect materialization.

## Source-status drift discovered

Several later journey specs still contain stale “candidate/definition stage” wording although the higher-authority registry and approval records freeze them as Goldens. Stage 2 records this as documentation drift and follows the existing authority order; it does not edit the frozen journey documents.

## Stage 2 boundary

Stage 2 answers **what the reusable product pieces mean and what operations/laws belong to them**.

Stage 3 will answer **how those pieces compose across journeys and gates**. That is where we wire the semantic core to J01–J28 and derive the Gate B construction graph.
