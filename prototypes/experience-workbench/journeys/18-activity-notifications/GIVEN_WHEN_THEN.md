# Journey 18 — Given / When / Then

1. **Given** a payment still requires recipient confirmation, **when** Activity renders, **then** it appears under Needs attention and opens the payment-status owner journey.
2. **Given** the user reads that notification, **when** it becomes read, **then** the payment remains Waiting until canonical confirmation occurs.
3. **Given** three unresolved items and two unread notifications, **when** the bell renders, **then** unread remains 2 and attention remains 3.
4. **Given** all notifications are marked read, **when** Activity is revisited, **then** unresolved items still appear under Needs attention.
5. **Given** a notification snapshot says Waiting but the payment is now Complete, **when** opened, **then** the UI explains the state changed and routes to the current saved payment record.
6. **Given** access to a group was removed after notification delivery, **when** opened, **then** current private group details are not restored.
7. **Given** a personally relevant completed payment from a past group, **when** access is reduced, **then** only the already-approved minimal payment-record fields may remain.
8. **Given** repeated provider status polls for one payment, **when** Activity is projected, **then** no extra technical rows appear.
9. **Given** a confirmed savings contribution, **when** Activity renders it, **then** the row is informational and opens the savings overview; it cannot reconfirm the contribution.
10. **Given** a new expense needs review, **when** the row is opened, **then** Journey 07 owns agree/issue actions.
11. **Given** a request from Marc, **when** opened, **then** the request owner journey handles payment/response; Activity performs no settlement.
12. **Given** CHF and DOT items, **when** Activity renders them, **then** their exact amounts remain separate and no conversion is invented.
13. **Given** the feed is offline, **when** saved activity renders, **then** it is explicitly labeled stale/cached.
14. **Given** the feed is offline, **when** Try again is selected, **then** no new canonical event may be invented by the local projection.
15. **Given** a feed load error, **when** retry is selected, **then** the UI requests a read refresh only; it does not repeat any money action.
16. **Given** no Activity exists, **when** the Activity tab opens, **then** a calm empty state explains that meaningful changes will appear there.
17. **Given** no notifications exist, **when** the bell opens, **then** the empty state does not imply underlying balances are zero or settled.
18. **Given** the Payments filter is selected, **when** rendered, **then** it changes presentation only.
19. **Given** the Groups filter is selected, **when** rendered, **then** it changes presentation only.
20. **Given** Needs attention is selected, **when** rendered, **then** only unresolved viewer-relevant tasks are shown.
21. **Given** a member joins Zurich Weekend, **when** the event is accepted, **then** Activity can show the meaningful membership milestone without exposing unrelated account details.
22. **Given** an expense is updated, **when** Activity shows it, **then** the row links to the expense owner journey; it cannot accept the change by itself.
23. **Given** a notification is stale, **when** the user goes Back, **then** no old action is replayed.
24. **Given** an adjacent preview is opened in this prototype, **when** its CTA is pressed, **then** it returns to Activity and performs no product mutation.
