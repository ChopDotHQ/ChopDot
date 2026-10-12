# J04 actual-screen review — proposal only, 2026-10-12

Runtime ae19153b73661750852875fdda979f7f0828d529 (user-accepted J03).
No J04 repair code changed. Isolated origin 4192 preserves J02/J03 review data.

## What was actually reviewed at 393x852

Guest create success → Add people → local name → Done; Home Invite → account
boundary → Not now retains work; disclosed example email/code sign-in → Home.
Sign-in returns Home rather than auto-resuming Invite; observed, not classified
as a defect without reconciling accepted Entry decisions.
Group Home header Invite → old unsupported boundary; empty-state Invite people
→ implemented J04 choices. Local group-link record → labelled recipient fixture
→ group context → Not now → View invite → explicit guest consent → joined
→ Group Home. Membership reopening retains the displayed participant ID.
Explicit inviter-session fixture → Add someone → named local pending invite
→ Done → Open group returns to the same group. No external message transmitted.
Pre-join shows group name, Group owner, count and currency. No expense data was
created in this sample, so private-expense isolation is not qualified.

## Confirmed issues

SC-J04-001: header Invite opens the outside-Gate-B boundary, whereas the empty-
state Invite people action opens the implemented owner. Source gate-b/app.js
wires the empty-state action to create-join, leaving #invite-handoff unhandled.
See header-invite-boundary.jpg.

SC-J04-002: a name added locally without invitation/consent is labelled Member /
Joined. Local pending invitations show Invite sent / Invites sent despite no
message transmission. See invite-local-name-joined.jpg and
named-local-invite-pending.jpg. Invitation rendering labels every scoped person
Joined. Treat this as a separate presentation repair; preserve membership rules.

Historical UX-010 was not reproduced with you plus one added local name: input,
Add and Done remained visible and Done closed the panel. Larger lists were not
checked; leave the historical finding open rather than claiming it fixed.

## First bounded proposal: consistent Invite entry

User journey: I am the organizer, I need to open invitations from Group Home,
so I can bring people into the same group.
One next action: Invite → Share group link or Add someone.
Friction 3/3, Trust 3/3, Clarity 2/3, Language 1/1 = 9/10 (design prediction).

Both Invite controls SHALL route to the same existing invitation owner, retaining
the selected group. Existing account/owner, guest, archive and membership guards
SHALL remain. Navigation SHALL create no invitation, membership or payment.
Back/Done SHALL return to the initiating group.
In: wire header to existing route; verify context/guards/returns.
Out: status labels (separate next loop), auth-intent redesign, J05, new service,
domain/permission changes, frozen edits, broad testing or evidence tooling.
If authorized: compare both entries in empty/populated groups, allowed owner and
blocked guest/archived contexts; Back/Done/reload and record preservation; inspect
both approved mobile sizes; reuse only relevant route checks; show result/stop.

Self-review and local fixtures only. No independent, remote, device or hosted/CI
qualification. Expired/offline/account-backed join/linking and full recovery not
reviewed. J04 remains in progress. Documentation impact: J04/finding and brief
receipt; no wiki/ADR needed for proposed route correction unless scope changes.
