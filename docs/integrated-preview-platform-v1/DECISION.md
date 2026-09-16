# Decision — One ChopDot Product, Multiple Hosts

## Context

ChopDot now has 28/28 approved journeys plus the Phase C1 guest/spend contract layer. Until now, journeys were reviewed independently. The next product gap is to experience them as one coherent stateful product.

At the same time, ChopDot should not be trapped in one distribution surface. Long-term targets include ordinary browsers, Polkadot-hosted desktop/mobile/web surfaces, and potentially standalone iOS/Android/PWA packaging.

## Decision

Adopt a **host-adapter architecture**:

```text
ChopDot product core
  ├─ journeys / router
  ├─ domain state
  ├─ product contracts / invariants
  └─ recovery semantics
          │
          ▼
Platform capability interface
  ├─ WebBrowserAdapter
  ├─ PolkadotHostAdapter
  └─ NativeShellAdapter (later)
```

The same product journeys and state model must remain valid across hosts. Host-specific capabilities are requested through a narrow capability interface rather than embedded directly into journey logic.

## Initial capability vocabulary

Keep V1 small and user-meaningful:

- `getParticipantIdentity()`
- `requestSignature()`
- `openCamera()` / QR scan
- `storeLocally()`
- `sendNotification()`
- `share()`
- `openDeepLink()`

This is a conceptual boundary, not permission to finalize production APIs before implementation research.

## Preview behavior

The first integrated preview may simulate or fixture capabilities that are not available in a plain browser. The simulation must be explicit and must not claim real signing, payment finality, production account access, or network execution.

## Portability acceptance

A product transition should be considered host-portable when:

1. its core state transition does not branch on host brand;
2. missing host capability fails honestly and recoverably;
3. the capability adapter can be replaced without changing the journey contract;
4. the same scenario can be replayed in browser and at least one Polkadot host with equivalent product meaning;
5. J28 recovery rules remain valid in every host.

## Why browser first

Browser-first minimizes packaging and device friction while we find cross-journey product defects. It is not the final distribution decision.

## Why Polkadot second

Polkadot-host execution is strategically valuable because it can provide account/signing/permission/deep-link surfaces while letting ChopDot remain an independently owned product. It should validate the adapter boundary rather than become a hard architectural dependency.

## Native packaging rule

Standalone iOS/Android/PWA packaging should be added only when it provides user or distribution value beyond the hosted/web surfaces. Native packaging is not required merely to claim multi-platform support.

## Supersession rule

Any future platform decision that makes ChopDot core depend directly on one host must explicitly supersede this decision and explain why the loss of portability is worth it.
