# Direct browser interaction log

Method: originating owner conversation using the documented cloud-browser UI APIs. Manual agent walkthrough, not shell/Playwright test-runner execution. No process exit code is applicable; every result below comes from the resulting DOM/AX state. Errors and missing steps are retained in results.json.

1. Existing preview tab was unavailable through URL lookup; opened a second tab. It reported the existing prototype writer lock. Closed only that new tab and reused the owner's original preview tab. No store lock was bypassed.
2. Clicked enabled **Continue as guest**. Home DOM: Guest / Start your first split. / No groups yet. / Start locally. Share when you're ready.
3. Read actual enabled attributes for Start a group and eight secondary buttons: all disabled=false, no aria-disabled. Captured an internal visual screenshot: secondary controls are pale/dashed; primary is solid.
4. Clicked **Start a group**. Creation DOM: Group name textbox / Currency Group balance CHF / Create group. Did not fill or submit.
5. Called native browser Back. Home displayed DP, 2 things need you, Zurich Weekend/Apartment/Ski Trip, +CHF 132.20 and Connected 14.82 DOT. These are the Golden sample facts, distinct from starting Guest / No groups yet.
6. Reloaded. After Home became visible, verified Guest / No groups yet restored.
7. Clicked **Insights**. Waited for its resulting surface. DOM: Sign in through Entry before opening private records. / Return to Group Home.
8. Clicked **Return to Group Home**. First AX snapshot lagged; did not repeat the click. Fresh DOM showed missing-group fallback: Create a local group in the accepted Gate A preview first. / Open Gate A.
9. Followed **Open Gate A**. Reached enabled front-door controls, then Continue as guest -> empty Home.
10. Clicked **People**. Same empty Home remained; the child URL gained #. No People surface or unavailable explanation.
11. Clicked **Activity**. After loading, DOM: Activity / Needs attention · 0 / No activity yet. Changes to your expenses and payments will appear here.
12. Clicked Activity **Pots**. Child URL gate-b/#page=group; missing-group fallback / Open Gate A, rather than root Home.
13. Followed fallback exit, entered as guest, and repeated **Start a group -> native Back** from a fresh visible creation entry. The same raw Golden sample facts appeared a second time.
14. Reloaded and waited for **Start a group** to become visible. Final state Guest / No groups yet. No business record submission/deletion or account verification.
15. Read Sites metadata and frozen/source files through their connectors. Sites version 13 source commit is hosting metadata and did not resolve from the GitHub file API. No fallback pretending to execute that GitHub commit was attempted.
16. Source inspected at bd464571: renderLocalHomeState explicitly uses canonical group data and adds the eight secondary destinations; J02 load dispatch covers Activity/You/Account/Notifications, not People. This corroborates a source omission but does not independently run the current candidate.
17. Browser logs included extension-metadata errors predating/within the session. They were not attributed to product code or suppressed to claim a clean browser-health run. No full browser-health test was executed.

Unexecuted: current-candidate UI runtime; canonical 393×852 / 430×890; populated/returning account attention; offline/stale; full keyboard/accessibility; cold human comprehension; UX-006 expense save; independent review; full local schema chain/CI.

No screenshot attachment is claimed. Internal screenshots were not persisted as public/user-facing evidence. Portable reproduction and observed text are recorded here.
