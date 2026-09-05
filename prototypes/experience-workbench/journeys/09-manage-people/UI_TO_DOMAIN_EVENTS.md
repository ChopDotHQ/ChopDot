# Journey 09 UI to domain events

Navigation never writes a balance. Handoffs preserve exact scope without authorizing payment.

| Action | Event / intent | Guard |
|---|---|---|
| `back` | `NavigationReturned` | Preserve context; never undo an accepted removal |
| `demo` | `PrototypeControlsOpened` | Not a product-domain event |
| `members` | `GroupMembersViewed` | Authorized saved/active group context |
| `directory` | `RelatedPeopleViewed` | Existing shared relationships only |
| `safe-directory` | `AuthorizedRelationshipsRequested` | Exclude revoked group; do not grant access |
| `person` | `PersonDetailViewed` | Canonical person ID and original group scope |
| `person-return` | `PersonDetailViewed` | Keep same dependent group and person |
| `groups` | `SharedGroupsViewed` | Keep person; show each currency separately |
| `open-group` | `PersonScopeSelected` | Choose exact group, retaining return context |
| `preferences` | `SharedPaymentPreferenceViewed` | No editing another person or revealing destinations |
| `roles` | `GroupCapabilitiesViewed` | No payment authorization implied |
| `manage` | `MemberManagementOpened` | Current owner only; not self |
| `payment` | `SettlementScopeResolvedOrRequestScopeResolved` | One person/currency/source set; no payment authorized or request sent |
| `review-issue` | `ExpenseReviewHandoffOpened` | Dependent issue only; no payment event |
| `invite` | `InviteHandoffOpened` | Online; no invitation sent yet |
| `invite-detail` | `InviteStatusViewed` | Pending invite is not active membership |
| `own-methods` | `OwnPaymentMethodsHandoffOpened` | Only own preferences; J20 owns editing |
| `remove` | `MemberRemovalReviewed` | Fresh role, scope and group-item checks |
| `confirm-remove` | `MemberRemovalRequested` | Exact actor, person, group, version and stable command ID |
| `recover` | `MemberRemovalStatusRequested` | Unknown/recovering same command; cannot imply acceptance |
| `retry` | `MemberRemovalRetryRequested` | Verified non-acceptance; same command and rechecked authority |
| `noop` | `None` | No event emitted |

`MemberRemoved` is created only by an accepted service result after deterministic rechecks, not by the review screen or status refresh. Demo result controls are separate from payer/owner actions. Acceptance persists the precise member change; it neither deletes financial records nor confirms any payment.
