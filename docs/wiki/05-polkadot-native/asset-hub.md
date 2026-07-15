---
title: Asset Hub
status: current
owner: Dev
last_reviewed: 2026-07-15
review_frequency: weekly
source_of_truth: false
related_code:
  - src/services/capture/AgentWalletPaymentSettlement.ts
related_docs:
  - product/journey-reviews/J-006-pas-test-wallet-payment.md
  - product/journey-reviews/J-007-wallet-payment-currency-checks.md
  - docs/wiki/03-state-models/payment-state.md
tags:
  - polkadot-native
  - asset-hub
  - payment
---

# Asset Hub

Asset Hub can provide payment references for DOT, USDC, or testnet payment paths.

## Boundary

A chain payment can update the matching payment item where the flow allows it. It must not close unrelated shares or replace receiver confirmation unless the product law explicitly allows that exact leg.

## Current Result

PAS now passes the connected-wallet product path in the portable shell. Mina,
Leo, Nina, Omar, and Casey used five separate browser profiles; four payer
actions created four real Polkadot Hub TestNet transfers. ChopDot checked each
transaction directly and cleared only its exact share. The packet is
`.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/`.

This is public-testnet PAS validation using an automated browser-wallet harness.
It is not production payment readiness, a manual extension-popup check, or a
live host PaymentManager result. DOT and real USDC remain separate incomplete
lanes under P-024.

The older main-app developer endpoint that loaded saved payment reports has
been removed. Current payment promotion requires direct observation of the
transaction; historical fixtures and mock-token packets remain research only.
The main app stays fail-closed until its signed payment link binds both wallet
addresses. The portable shell owns the currently proven connected-wallet path.

## Source Truth

- `product/journey-reviews/J-006-pas-test-wallet-payment.md`
- `product/journey-reviews/J-007-wallet-payment-currency-checks.md`
- `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/report.md`
