## Decision history

This file mirrors the source-supported decision history in `spec.md` so later build tooling can restore it independently of generated specifications.

### J18-D01 — Keep Activity ChopDot-only
Meaningful ChopDot milestones only; no chain/provider/RPC polling spam in the user-facing feed.

### J18-D02 — Separate attention from unread
Reading notification delivery copies never resolves canonical tasks.

### J18-D03 — Activity routes; canonical journeys mutate
Inline financial/approval mutations are out of scope for V1.

### J18-D04 — Re-check notification state and access on open
Delivery snapshots can be stale and cannot restore revoked access.

### J18-D05 — Preserve exact asset separation
CHF/DOT/etc. remain exact and distinct; no converted instruction.

### J18-D06 — Omit search until functional and justified
V1 intentionally has no decorative or dead search control.
