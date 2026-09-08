# J18 V1.1 native standalone checklist — for Codex / local browser

This environment returned `ERR_BLOCKED_BY_ADMINISTRATOR` on the single native `file://` navigation attempt. Do not treat the injected-document Playwright checks as native-open/reload evidence.

Run these checks against the exact standalone HTML SHA-256 `d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e`:

1. Open the HTML directly with no fragment at 393×852. Confirm exactly one screen: Activity. People must not appear simultaneously.
2. Repeat at 430×890.
3. Reload the bare file at both sizes. Confirm Activity remains the single entry screen and no console/page error appears.
4. Open or edit the URL to `#not-a-real-screen`. Confirm it normalizes to `#activity`, with one visible screen.
5. Notifications → Mark all read → Activity → Notifications. Confirm `All read` and no unread badge/rows.
6. Trigger the prototype's `Demo: new notification arrives`. Confirm unread becomes 1 while `Needs attention · 2` remains unchanged.
7. Notifications → Earlier → `Payment was waiting`. Confirm the changed-state screen says the notification captured Waiting and the current payment is Complete; Open current payment must reach the Complete payment detail.
8. Scroll Activity on both sizes. Confirm both attention rows and all recent-activity rows are reachable without an inner clipped card or scroll trap.

Record browser, loading mode (`file://` and/or localhost), viewport, observed hash after invalid-fragment test, and pass/fail for each step.
