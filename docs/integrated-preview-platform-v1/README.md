# ChopDot Integrated Preview & Platform Strategy V1

Status: **human-approved strategy / planning**  
Approved by Devinson on 2026-09-16.  
Base product authority: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`.

## Decision in one sentence

Build **one stateful J01–J28 ChopDot product core** and expose it through multiple hosts/surfaces, starting with a normal web browser, then Polkadot-hosted surfaces, then optional standalone native/PWA packaging.

## Product principle

ChopDot is not defined by Chrome, Polkadot Desktop, iOS, Android, or any one shell. The approved journeys and product state are the product. Platform-specific capabilities are adapters.

## Approved execution order

1. **Integrated Product Preview in Chrome/Safari** — fastest full-product iteration.
2. **Local Polkadot Host compatibility** — exercise host capabilities without changing product semantics.
3. **Polkadot Desktop / Web host** — same product build inside the Polkadot host model.
4. **Polkadot Android + iOS host/simulator/device** — verify mobile-host behavior and on-device capabilities.
5. **Standalone packaging when justified** — PWA, TestFlight/iOS, Android APK/Play Store.

## Architectural boundary

The product core owns:
- journeys and navigation;
- domain state;
- guest/account identity semantics;
- expense/settlement/spend semantics;
- recovery behavior;
- product rules and invariants.

Platform adapters own capabilities such as:
- account discovery;
- signing requests;
- camera/QR access;
- notifications;
- local storage;
- sharing/deep links;
- host-specific navigation or widget surfaces.

A platform API may disappear or change without requiring a redesign of ChopDot product semantics.

## Non-authorizations

This strategy approval does **not** authorize:
- production deployment;
- app-store publication;
- mainnet/funds/signing;
- a concrete payment/provider/issuer/BaaS choice;
- Journey 29;
- enabling Product Integrator;
- protected-branch merge;
- secrets handling.

## Relationship to Product Model V1

Product Model V1 runs in parallel and must not block the integrated preview. It may help generate impact/context/traceability, but the preview remains a product-experience task, not a graph-platform task.
