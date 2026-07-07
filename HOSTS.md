# ChopDot Portable Host Registry

## Purpose

ChopDot has one portable product shell. Web, Telegram, and future mini-app
environments are host profiles, not separate products.

This file defines what must stay common across every host and what is allowed
to vary per host.

## Core Experience Contract

Every host SHALL preserve the same normal group-money journey:

```text
first run
-> guest/profile setup
-> create group
-> add spend
-> review split
-> settle up
-> send request
-> payer marks paid
-> receiver confirms received
-> finish group
-> group summary/history
```

Every host SHALL preserve these product truths:

- `open`, `request_sent`, `marked_paid`, and `confirmed` are distinct states.
- Sending a request does not reduce the receiver's net position.
- A payer saying they paid does not reduce the receiver's net position.
- Only receiver confirmation reduces the receiver's net position.
- Finishing a group saves a readable summary without rewriting money truth.
- Normal UI must not show adapter, protocol, host, native, proof, or state
  machine language.

## Host Adapter Boundary

Host-specific code may handle:

- identity hints, such as Telegram first name;
- launch parameters;
- host back button;
- safe-area and viewport behavior;
- host theme colors;
- clipboard/share availability;
- local persistence mirrors such as Telegram CloudStorage;
- platform setup docs and proof shims.

Host-specific code must not:

- change payment semantics;
- fork the core journey;
- expose internal host/protocol language to normal users;
- add a host-only dashboard or mode;
- silently confirm payments or close groups;
- make one host the source of product truth.

## Change Classification

Every portable-shell patch should be classified as one of:

- `core`: affects the product journey or shared state behavior across all hosts;
- `host-adapter`: affects one host's integration, launch, storage, viewport, or
  identity seam;
- `proof`: changes validation harnesses, screenshots, or reports;
- `docs`: updates tracking, setup, or operator instructions.

If a patch mixes `core` and `host-adapter`, the PR/commit must state why that
coupling is unavoidable.

## Current Host Profiles

The machine-readable source lives in `proof/host-matrix.json`.

### Web

Role: baseline portable web shell.

Allowed differences:

- no Telegram APIs;
- localStorage persistence only;
- no host back button;
- browser clipboard/share behavior depends on the browser.

Required proof:

- `npm run proof:web`
- live proof with `PROOF_URL=https://portable-shell-trial.vercel.app`

### Telegram Mini App

Role: first real mini-app sandbox.

Allowed differences:

- Telegram user name can prefill first-run guest setup;
- Telegram BackButton can mirror in-app back behavior;
- Telegram theme params can influence host chrome;
- local state can mirror to Telegram CloudStorage when available;
- safe-area padding must account for Telegram mobile chrome.

Required proof:

- `npm run proof:telegram`
- live proof with `PROOF_URL=https://portable-shell-trial.vercel.app?tgWebAppStartParam=portable-proof`
- manual Telegram client check;
- real phone Telegram check before launch-ready status.

## Adding A New Mini-App Host

Before adding code for a new host:

1. Add an entry to `proof/host-matrix.json`.
2. Name the host's identity, back navigation, storage, clipboard/share,
   safe-area, and payment capabilities.
3. State which existing proof profile it extends.
4. Add a proof command or shim before adding host-specific UI behavior.
5. Run the same core journey proof.

Do not add product features solely because a host supports them. A host feature
must reduce friction, increase trust, or preserve the same journey more cleanly.

## Current Open Items

- Real Telegram mobile device proof passed by user-reported manual validation on
  2026-07-07. See `proof/mobile-telegram-step-count.md`.
- Server-side Telegram `initData` validation is not implemented.
- BotFather Main Mini App registration is still manual.
- Real payments and cross-device sync are outside this portable-shell trial.
