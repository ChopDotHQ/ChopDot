# ADR 0001: Participant-held signed events are authority

**Kind:** decision
**Status:** active
**Owner:** architecture
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** dated architecture decision subordinate to product law and explicit supersession

Canonical shared truth is a participant-held append-only `ChopEventV1` log.
Encrypted IndexedDB/host storage is a replayable projection. Carriers, chains,
contracts, wallets, URLs, and indexes cannot create membership or money truth.
This preserves offline use and avoids a ChopDot-operated authority backend.
