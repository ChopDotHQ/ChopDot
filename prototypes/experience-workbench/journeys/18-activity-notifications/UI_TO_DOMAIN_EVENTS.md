# Journey 18 — UI to domain/event mapping

Journey 18 intentionally emits almost no domain mutation events. Most controls are navigation or projection-view changes.

| UI action | Prototype event | Authority effect |
|---|---|---|
| Open Activity item | `ActivityItemOpened` | Read current canonical item and navigate; no mutation |
| Open notification | `NotificationOpened` | Re-check current canonical state + current access |
| Mark all read | `NotificationReadAllRequested` | Changes per-user notification read metadata only |
| Choose All / Needs attention / Payments / Groups | `ActivityFilterChanged` | Projection only |
| Refresh / Try again | `ActivityRefreshRequested` | Read-only refresh; never repeats underlying action |
| Open adjacent destination | `NavigationRequested` | Handoff only |
| Open Demo state | `DemoStateRequested` | Prototype-only; no product permission |

Canonical owner journeys retain all mutation events for expense approval/correction, requests, settlement, payment recovery, membership and savings.
