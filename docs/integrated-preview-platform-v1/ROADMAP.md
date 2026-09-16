# Roadmap — Integrated Product Preview & Multi-Surface Validation

## Goal

Let Devinson use ChopDot as one coherent product before production implementation, then prove that the same product can move across browser and Polkadot hosts without changing product truth.

## Phase 1 — Integrated Product Preview (browser)

Build one continuous stateful preview spanning J01–J28.

Required properties:
- one app shell;
- one shared scenario state;
- cross-journey navigation from approved registry relationships;
- state persistence across journey transitions;
- guest → account continuity;
- expense → review → position → settlement → activity continuity;
- explicit failure/recovery injection for J28;
- reviewer mode can identify underlying journey/state without exposing journey numbers in normal product mode.

Acceptance scenario examples:
- create `Ski Weekend`;
- invite/join as guest;
- add expense;
- review/agree;
- inspect balances;
- settle;
- inspect settlement history/activity;
- connect/link account without rewriting participant history;
- trigger unknown/failure/recovery states;
- export/recovery flows preserve product truth.

The preview may use deterministic fixture/local state. It must not claim production backend, real payment execution, signing, or finality.

## Phase 2 — Platform capability seam

Introduce the smallest adapter interface required by the real preview flows.

Rules:
- no host-specific logic inside journey contracts;
- browser adapter may simulate unavailable capabilities honestly;
- errors/denials route into approved J28 semantics;
- keep capability surface smaller than the product surface.

## Phase 3 — Local Polkadot host validation

Run the same product build in a local/reference Polkadot host environment where feasible.

Validate:
- host detection;
- permission boundary;
- account/identity handoff;
- signing request boundary without redefining product state;
- QR/deep-link entry where supported;
- host denial/offline/reconnect behavior.

## Phase 4 — Polkadot Desktop / Web

Target the same integrated build inside supported Polkadot desktop/web host surfaces.

Success means:
- no forked journey definitions;
- same product scenario semantics;
- adapter-specific capability implementation only;
- recovery remains coherent when host capability is absent/denied/unknown.

## Phase 5 — Polkadot Mobile

Validate Android first if toolchain/access is simpler, then iOS simulator/device as available.

Focus on:
- mobile layout parity;
- on-device permission flows;
- QR/camera;
- deep links;
- notifications/share surfaces;
- account/signing boundaries;
- background/foreground/restart recovery.

## Phase 6 — Standalone packaging decision

Only after host portability is proven, decide whether to ship:
- PWA;
- TestFlight / App Store iOS;
- Android APK / Play Store;
- all or a subset.

Decision criteria:
- acquisition/distribution value;
- push/OS integration value;
- offline/local capability needs;
- app-store friction;
- maintenance cost;
- whether Polkadot-host distribution already covers the use case.

## Cross-cutting gates

For every surface:
- product semantics remain host-neutral;
- fixture vs live capability is explicit;
- no host callback alone becomes money/identity authority;
- J28 recovery remains valid;
- platform-specific failures cannot mint fresh execution authority;
- visual/mobile differences do not silently alter product meaning.

## Relationship to Product Model V1

Product Model V1 may generate context/impact/traceability for this work, but it is not on the critical path. The integrated preview should proceed even if Product Model V1 is delayed or removed.

## First user-visible milestone

**One URL that lets Devinson use the full J01–J28 ChopDot experience in Chrome/Safari as a continuous product.**

## Second user-visible milestone

**The same product build running inside a Polkadot host with equivalent user journeys and host-adapted capabilities.**
