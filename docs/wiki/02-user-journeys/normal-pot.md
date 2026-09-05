# Normal pot, trip, and couple journey

**Kind:** reference
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped journey reference derived from Product Truth, current Cockpit decisions and contracts, ADRs, and exact production-entrypoint evidence; it cannot impose one universal product action
**Sources:** P-012, P-022, DC-001, DC-007

GIVEN a participant paid for a group, WHEN they scan or import the receipt and
review the draft, THEN only their signed action creates the expense and exact
splits.
Supported browsers may extract text on-device to prefill that draft. The image
is not uploaded by the extraction path, extracted fields are never accepted as
truth without review, and an unavailable or failed detector leaves the original
image-first draft open for manual correction.
Payment requests, payer claims, cleared evidence, receiver confirmation, and
group close remain separate events. Trip and couple presets change labels and
defaults, not authority.

GIVEN the first participant began locally as a guest, WHEN they choose **New
group**, enter a name, and press **Create my group**, THEN ChopDot completes account binding
before proposing canonical `CREATE_GROUP`, preserves the exact draft and
candidate across rejection/retry/reload, and adds only that participant as organizer. A
tab-local owner keeps the unfinished private name from crossing an app-data
reset, and neither an append response nor local completed marker can replace
exact canonical readback. An invited recipient is not a member until a later recipient-bound
invitation, acceptance, and organizer grant. Normal, trip, couple, Spend Card,
savings circle, emergency pot, and community fund choices live inside New
group rather than competing on Home.
