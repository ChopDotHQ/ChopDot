# ADR 0001: Participant-held signed events are authority

Status: accepted for public beta, 2026-08-23.

Canonical shared truth is a participant-held append-only `ChopEventV1` log.
Encrypted IndexedDB/host storage is a replayable projection. Carriers, chains,
contracts, wallets, URLs, and indexes cannot create membership or money truth.
This preserves offline use and avoids a ChopDot-operated authority backend.
