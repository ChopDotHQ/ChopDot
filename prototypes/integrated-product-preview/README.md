# ChopDot Integrated Product Preview V1

A deterministic, browser-first integration harness for the approved J01–J28 ChopDot product experience.

This preview exists to answer a product question that isolated Golden artifacts cannot answer: **does ChopDot still feel coherent when the journeys share one state and are used as one product?**

## Authority boundary

The approved Golden journey artifacts and Phase C1 contracts remain read-only product authority. This directory is an integration projection/harness, not a new approval source and not production implementation.

It does not use real money, production backends, real signing, mainnet, provider/issuer/BaaS execution, or secrets.

## Run locally

From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/prototypes/integrated-product-preview/index.html
```

The normal product flow hides journey numbers. On desktop, the reviewer panel is shown beside the device. On mobile, use the round reviewer button to open the panel.

## Shared scenario state

The preview persists one deterministic scenario in `localStorage` under:

```text
chopdot.integrated-preview.v1
```

The same records are used across group, expense, review, position, settlement, activity, account, export and recovery views.

Key integration proofs include:

- guest participation creates a stable Participant ID;
- linking a demo account preserves that Participant ID and history;
- adding an expense feeds review and overall position;
- settlement initiation creates one operation lineage;
- an unknown payment outcome routes through J28 rather than becoming a fresh retry authority;
- recovery reconciles the original operation before returning to the settlement result;
- export/backups never manufacture signing/payment authority.

## Platform adapter

`platform.js` is intentionally narrow. The product asks for capabilities such as signing, QR, share and notification without owning a specific host.

Browser mode is simulated. Later host qualification can replace adapter behavior for Polkadot Desktop/Web/Mobile without changing journey contracts.

## Validation

Structural/syntax validation:

```bash
node prototypes/integrated-product-preview/validate.mjs
```

Browser continuity QA (requires the static server and Playwright Chromium):

```bash
node prototypes/integrated-product-preview/browser-qa.mjs
```

GitHub Actions workflow `.github/workflows/integrated-preview.yml` runs both validation and browser QA and uploads screenshots plus `qa-summary.json`.

## Reviewer mode

Reviewer mode can jump directly to J01–J28 and inject four representative J28 families:

- payment outcome unknown;
- offline;
- stale restore;
- identity-link uncertainty.

Direct journey jumps are reviewer tooling only; they are not normal-product navigation or evidence that URLs create product authority.
