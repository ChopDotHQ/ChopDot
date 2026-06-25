# Summit / Playground operator reference (2026-06-18)

**Purpose:** Archive what the Polkadot host shell and Playground quest UI actually show, plus ChopDot’s observed deploy state on the same day. Use this as a lookup — not a plan or recommendation doc. **Start at §0** for summit public narrative vs operator facts.

**Operator constraint (stated by operator, 2026-06-18):** Polkadot Mobile / full Polkadot app access is **not available outside the summit floor**. During Web3 Summit Berlin, only users/builders **on site** are given the ability to play with it. Remote operators cannot complete flows that require `pg login` / phone signing / competition join on Polkadot Mobile.

**Screenshot assets (workspace):**

| # | File | Captured (filename) |
| --- | --- | --- |
| 1 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.34.47-25621754-3cf4-4ca5-9469-3b4670fda9a6.png` | 2026-06-18 15:34:47 |
| 2 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.35.10-5df3679f-90c6-4305-872a-6190fde3a6ef.png` | 2026-06-18 15:35:10 |
| 3 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.36.46-21e67fa2-e8d8-455d-b784-14d061d96a2c.png` | 2026-06-18 15:36:46 |
| 4 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.38.11-d998b04d-46dd-4a0f-bb6d-62358d7e0460.png` | 2026-06-18 15:38:11 |
| 5 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.38.26-42fd934d-55b0-4e5d-8995-931d32ade94a.png` | 2026-06-18 15:38:26 |
| 6 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.39.01-9e96743e-db37-4e7d-a61a-65370dfc1c48.png` | 2026-06-18 15:39:01 |
| 7 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.39.25-c284e544-5cb7-44ea-aed2-5e147aa231ea.png` | 2026-06-18 15:39:25 |
| 8 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.39.35-64ce78bb-2221-45de-a28c-55e7c65a9c13.png` | 2026-06-18 15:39:35 |
| 9 | `/.cursor/projects/Users-devinsonpena-ChopDot/assets/Screenshot_2026-06-18_at_15.39.43-069763ac-85c7-4cc8-af14-a239bc400d2d.png` | 2026-06-18 15:39:43 |

---

## 0. Summit narrative vs operator facts (2026-06-18 — 2026-06-19)

**Purpose:** Archive public summit narrative (talks, social coverage, stage story) alongside **observed operator constraints** in this repo (§A–H). Agents must not treat keynote vision or positive social sentiment as proof that ChopDot’s deploy or native gates are green.

**Event identity (do not conflate):**

| Event | When / where | Relation to Polkadot |
| --- | --- | --- |
| **Web3 Summit 2026** | June 18–19, Funkhaus Berlin | W3F / Polkadot builder festival — **this doc** |
| **Web Summit** | November, Lisbon | Mainstream tech conference — **different event** |

**Stated theme:** privacy, self-sovereignty, usable decentralization — “festival for digital freedom” (art + workshops + tech).

### 0.1 Public narrative (Day 1 — June 18)

| Signal | Reported content | ChopDot lane |
| --- | --- | --- |
| Opening vibe | Installations, workshops, music, Matrix screening | Context only — not product input |
| **Conference app** | Blockchain-powered attendee app: check-ins, badges, participation | Same category as [`paritytech/festival`](https://github.com/paritytech/festival) — Host-native reference |
| **Proof of Personhood** | Demo via Polkadot app on floor | Identity layer — adjacent to native G2, not Capture P1 |
| Talks (sample) | Varoufakis (Web2 vs Web3); Taaki (privacy / DarkFi) | Narrative — not ChopDot scope |

**Reported sentiment:** Largely positive on the conference app and hands-on demos ([@D0tSama](https://x.com/D0tSama) and similar).

### 0.2 Public narrative (Day 2 — June 19)

| Signal | Reported content | ChopDot lane |
| --- | --- | --- |
| **Gavin Wood — Polkadot 2030** | “Polkadot Trinity” in development; no logins/installs; familiar UI; cross-device; no crypto identifiers; privacy/security guarantees; Web3 ≠ Web2 evolution | Aligns with native UX targets in [path-to-fully-native.md](./path-to-fully-native.md) §7 — Product Account implicit, jargon hidden |
| **JAM session** | Join-Accumulate Machine — platform deep-dive | Long-horizon optionality — **not** Programme A or Capture blocker |
| **Polkadot Platform — Under the Hood** | Torsten Stüber & Adrian-Costin Catangiu | Platform context |
| **Product-sdk session** | Building products on Polkadot | Native adapter stack target (`@novasamatech/*`, `@polkadot-apps/*`) |
| **Playground.dot demo** | “Build & deploy your first next-gen Web3 product in 10 minutes” | **Programme A** — same bar as [master plan §18](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md) |
| Closing | Playground awards, fireside chats, afterparty | Community — not ship criteria |
| **CASH token** | Closed-loop event utility/credit on Polkadot testnet (hospitality) | W3SPay / event-rail ecosystem — **not** ChopDot custody model |

**Reported sentiment:** Enthusiastic about direction and execution ([@Blockchain_Stew](https://x.com/Blockchain_Stew) and similar); isolated negative comments; **no dominant breaking-announcement narrative** (no mega-partnership / listing / live mainnet shock in coverage reviewed 2026-06-19).

### 0.3 Market vs product read (not financial advice)

| Lens | Summary |
| --- | --- |
| **Short-term DOT price catalyst from summit** | **Low** in available coverage — vision/tech/community event, not typical “pump” news |
| **Longer-term ecosystem narrative** | **Constructive** — usability, Playground, Product SDK, JAM story; matters if it converts to apps listed, dev retention, Host reach |
| **Dominant price drivers (mid-June 2026 reports)** | Macro / BTC / broad alt sentiment cited more than Berlin specifically |
| **ChopDot operator takeaway** | Do **not** tie Capture or native gate priority to summit-week price action |

### 0.4 Narrative vs operator facts (tension table)

| Stage / social story | Operator fact in this repo (same week) | Agent rule |
| --- | --- | --- |
| “Deploy in 10 minutes on Playground.dot” | Remote `playground deploy` blocked until competition join + Mobile QR (§D) | Programme A ship ≠ quest XP completion |
| Conference app works on floor | `chopdotws01.dot.li` → **This app can't be reached** (§A); Kubo gateway **504** on root CID (§D) | Verify gateway + host fetch before claiming “live on `.dot`” |
| Polkadot Mobile / `pg login` everywhere | **Floor-only** for summit operators (header constraint) | Remote agents use A5 local preview (§G.1) |
| Polkadot Trinity / no logins | Capture + hybrid pots still use wallet/guest/Supabase today | Dual-track: [capture-native-lane-map.md](./capture-native-lane-map.md) |
| Positive app feedback | ChopDot slim `dot-lab` bundle deployed; full savings-circle demo bar not yet proven on live URL | Anti-bait-and-switch: savings circle demo local/A5 until live URL loads |
| No breaking announcements | Native runtime gates currently **1/7**; only UXGate is lab-passing; host Identity/Transport/Archive/Proof/Payout/HybridRemoval remain unproven | Programme B not accelerated by keynote alone |

### 0.5 Actionable post-summit routing (ChopDot)

1. **Programme A** — honest `.dot` listing: savings circle runnable; Spend Cards labelled **next** (path §18.4).
2. **Track 1 Capture** — keep hybrid ship; summit did not change Capture acceptance bars.
3. **Host-native reference** — [`paritytech/festival`](https://github.com/paritytech/festival) `wallet.ts` / `write.ts` before Host tx code ([capture-native-lane-map.md](./capture-native-lane-map.md)).
4. **Ignore for near-term scope** — JAM implementation depth, CASH integration, PoP as product requirement unless pivoting to event-ticketing.
5. **Leading indicators to watch** — `.dot` gateway resolution, Host/Mobile availability off-floor, Playground Apps listing, on-chain/listing metrics — **not** summit-week DOT price.

**Official sources for recordings/agenda:** [web3summit.com](https://web3summit.com) · [@Web3summit](https://x.com/Web3summit) · [@Polkadot](https://x.com/Polkadot)

### 0.6 Product SDK / Host field notes (2026-06-19)

**Sources:** operator-provided Web3 Summit photos from the Product SDK session; official agenda confirms `Product-sdk: Building Products on Polkadot` by Valentin Fernandez on Thu 18 at 15:30–16:15; indexed Parity/Web3 Summit posts and the open `paritytech/playground-tutorial` repo confirm the same component direction.

**What the photos add beyond earlier notes:**

| Signal | Field note | ChopDot implication |
| --- | --- | --- |
| Product SDK component maturity | Slides showed **Chain Connection**, **Account**, **Signing**, **Device Permissions**, and **Local and Cloud Storage** as checked; **Transactions**, **Statement Store**, and **Smart Contracts** were not checked on that component slide. | Keep B1 signer/account and storage preflights first. Treat Statement Store and contracts as next-gate work, not already proven in ChopDot. |
| Host architecture | Product runs in a sandboxed iframe/webview inside a Desktop/Mobile/Web host. Host/product communicate by `postMessage`; host owns keys and secure surfaces. | This validates our adapter boundary: product UI should stay ChopDot-native while host services supply identity, signing, storage, and transport. |
| Host-managed services | High-level slides mapped the product to **Chain State**, **Bulletin**, **Statement Store**, **Device Storage**, and later **Key Handling**. | Programme B should make strict host-required modes for signer, transport, archive, and key handling. Normal local/demo fallback remains separate. |
| Product-user invisibility | Slide copy: infrastructure should be invisible to both product and user. | Strongly aligned with our UX rule: no chain jargon in the app; users see group state, next actor, claims, confirmations, and receipts. |
| Playground tutorial stack | Public tutorial repo maps levels to Product SDK host-managed account, `.dot` deploy through Bulletin/DotNS, Bulletin content-addressed storage, `cdm`/PVM smart contract on Asset Hub, and Statement Store multiplayer. | This gives us a useful sequencing model: B1 account/signing -> B5 archive -> B6 evidence/contracts -> B2 transport. |

**Additional external notes found in public/indexed sources:**

| Source signal | Meaning | ChopDot action |
| --- | --- | --- |
| Parity forum pre-summit post | Parity expected to open-source proof-of-concepts around ticketing, point-of-sale, and AI-assisted dev tooling; it also named Capacity, Levity, and Nominality as new infrastructure labels. | Add these to the watch list, but do not treat them as ChopDot blockers until docs/repos are stable and mapped to a pillar. |
| Web3 Summit CASH token terms | CASH was an event-only closed-loop utility token on an experimental testnet, with explicit no-investment/no-e-money language, expiry, cash-out limits, and abuse controls. | Useful legal/product reference for any future event-credit or community-fund mode; not a reason to add custody to ChopDot. |
| Playground.dot page | Playground was positioned as a prototype collaborative build environment: modify, remix, deploy, and learn by doing, with a prize pool. | Good distribution narrative, but not production infrastructure proof. Keep A4/A8 parked until Polkadot app/host release enables live verification. |

**Updated operator read:** We did not miss a new production-green signal. We did miss a clearer product architecture signal: Parity is explicitly converging on a host-managed product model where the app looks normal and infrastructure disappears behind Product SDK components. That strengthens ChopDot's native direction, but it also confirms our current gate discipline: signer, storage/archive, Statement Store, and contract/evidence must each pass strict host-required checks before native claims.

---

## A. Polkadot host shell — `chopdotws01.dot` (Screenshots 1–2)

**URL bar / address shown:** `chopdotws01.dot`

**Header chrome:**
- Brand: `Polkadot` + badge `BETA`
- Icons (left to right in header): profile, lock, sun (theme), gear (settings)

**Main body copy (Screenshot 1):**
- Heading: **This app can't be reached**
- Subtext: **Check if there is a typo in** `chopdotws01.dot`

**Main body copy (Screenshot 2 — same error, additional UI):**
- Same heading and subtext as above
- Address pill shows shield icon (not checkmark) before `chopdotws01.dot`
- Bottom-right toast:
  - Title: **Get Polkadot Desktop**
  - Body: **Full experience with native performance**

**Screenshot 1 vs 2:** Screenshot 1 shows a checkmark icon in the address pill; Screenshot 2 shows a shield icon. Both show the same unreachable error.

---

## B. Polkadot host shell — Settings / Diagnostics (Screenshot 3)

**Panel title context:** Settings overlay while browsing `chopdotws01.dot` (address visible in background header).

### NETWORK (radio)

| Option | Subtitle |
| --- | --- |
| **Summit** *(selected)* | Web3 Summit network |
| Paseo Next V2 | Upgraded Paseo Next system chains |
| Previewnet | Product Preview Network |

### BACKEND (radio)

| Option | Subtitle |
| --- | --- |
| **Light Client Shared** *(selected)* | Verified in your browser, shared across tabs (recommended) |
| Light Client Per-Tab | Verified in your browser, separate per tab |
| Trusted Providers | Fetched from trusted servers, fastest but less private |

### CACHE (toggles — all ON in screenshot)

- dotNS cache
- Archive cache
- Worker cache
- Button: **Clear all caches**

### DIAGNOSTICS (read-only fields)

| Field | Value |
| --- | --- |
| Site | `chopdotws01.dot.li` |
| Build | `0.6.0 (dev)` |
| Network | Summit |
| Backend | Light Client Shared |
| Worker | dev |
| Browser | Chrome 149 (macOS) |
| smoldot | `3.2.0 (81c5543)` |
| Relay Chain | `#215,319` |
| Asset Hub | `#640,136` |
| People Chain | `#640,362` |
| polkadot-api | `2.1.6` |
| @polkadot-api/json-rpc-provider | `0.2.0` |
| @polkadot-api/json-rpc-provider-proxy | `0.4.0` |
| @polkadot-api/signer | `0.3.3` |
| @polkadot-api/substrate-bindings | `0.20.3` |
| @polkadot-api/substrate-client | `0.7.0` |
| @polkadot-api/utils | `0.4.0` |
| @novasamatech/host-api | `0.8.9` |
| @novasamatech/sdk-statement | `0.6.0` |

**Footer buttons:** Share diagnostic · Open in debug mode · **Save & Apply**

---

## C. Playground quest UI — verbatim copy (Screenshots 4–9)

Dark-theme quest cards from the Playground / summit builder flow. CLI commands in UI use the **`pg`** prefix (not `playground`).

---

### C.1 Launch a .dot site — Desktop tab (Screenshot 4)

**Title:** Launch a .dot site

**XP badge:** `+100 XP` — **FOR EACH OF YOUR FIRST THREE DEPLOYS, ONCE IT'S LISTED IN APPS**

**Intro:**
> Create your first site on a .dot domain. Start from a static page, publish it to our decentralised network, and make it part of the Playground.

**Tabs:** Desktop · Web · Mobile *(Desktop selected)*

**Section: Set up the Playground CLI** *(expanded)*

1. Install the Playground CLI.
   ```bash
   curl -fsSL https://raw.githubusercontent.com/paritytech/playground-cli/main/install.sh | bash
   ```
2. Set up your toolchain, phone signing, and account.
   ```bash
   pg login
   ```
3. Checkbox (unchecked in screenshot): **I've set up the CLI**

**Option — Build a new site:**
> In the Site Builder, pick a starting point, customise the page, then hit deploy to publish it to a .dot domain. No local setup needed.

**Option — Decentralise an existing site:**
> Already have a static website? Put it on a .dot domain with the CLI.
   ```bash
   pg decentralize
   ```

---

### C.2 Launch a .dot site — Web tab (Screenshot 5)

**Title / XP / intro:** Same as C.1

**Tabs:** Desktop · Web · Mobile *(Web selected)*

**Steps:**
1. Pick a starting point in the Site Builder and customize the page.
2. Hit deploy to publish your site to a .dot domain. No local setup needed.

**Button:** **Open Site Builder**

---

### C.3 Build a game with our tutorial (Screenshot 6)

**Title:** Build a game with our tutorial

**XP badge:** `+100 XP` — **FOR EACH OF YOUR FIRST THREE DEPLOYS**

**Subtitle:** Build a game app one level at a time, in about thirty minutes.

**Level checklist:**
- Level 1 – Local Challenger
- Level 2 – On-chain Record
- Level 3 – The Leaderboard
- Level 4 – Multiplayer

**Body copy:**
> Learn how decentralised storage, unstoppable logic, and player-owned assets change what apps are made of. Or skip the tutorial and **Explore, mod, and deploy any app** — you still earn XP for your first three deploys. For deeper technical info, see the **developer docs**.

**Tabs:** Desktop · Web · Mobile *(Desktop selected)*

**Status line:** `✓ Playground CLI ready`

**Steps:**
1. Open a new, empty project directory.
2. Pull the tutorial source code.
   ```bash
   pg mod playground-tutorial
   ```
3. Confirm cloning the source code when prompted.
4. Once cloning is done, start your coding agent in that project directory.
5. Give the coding agent this prompt:
   > Walk me through the tutorial in this repo.
6. Follow the agent's instructions.
7. Get your XP on deploying the results.

---

### C.4 Mod an app (Screenshot 7)

**Title:** Mod an app

**XP badge:** `+100 XP` — **FOR EACH OF YOUR FIRST THREE DEPLOYS**

**Intro:**
> Found an app you like? Make it your own. Playground apps are designed to be modded, so you can launch your vision without starting from scratch.

**Tabs:** Desktop · Web · Mobile *(Desktop selected)*

**Status line:** `✓ Playground CLI ready`

**Preamble:**
> Hit **Explore apps** below and open one you'd like to build from. Its detail page shows whether it's moddable.

**Steps:**
1. Copy the mod command from the app's detail page:
   ```bash
   pg mod [url]
   ```
2. Run it locally, then make your changes.
3. Deploy your version.
   ```bash
   pg deploy
   ```
4. When publishing, select:
   - publish to Playground
   - make it moddable
   - link the source

   > This gives others a starting point and helps you maximise XP.

**Button:** **Explore apps**

---

### C.5 Get your app modded (Screenshot 8)

**Title:** Get your app modded

**XP badge:** `+50 XP` — **EACH TIME SOMEONE MODS YOUR APP**

**Intro:**
> Your app can be someone else's starting point. Get it out there, make sure it's moddable, then invite people to build on it. You earn XP every time someone does.

**Steps:**
1. Check your app shows up in the **Apps** list so people can find it.
2. Open its detail page and confirm it carries the **Moddable** badge. No badge? **Re-deploy with a public GitHub repo linked.** That's what makes an app moddable.
3. Grab the share link from the app's detail page and send it to friends, your group chat, or socials.
4. Invite people to mod it. Every builder who starts from your app earns you XP.

**Closing:**
> The more useful your app is as a starting point, the more it gets modded. A friendly README and a few quest ideas go a long way.

**Button:** **My Apps →**

---

### C.6 Give and receive stars / Keep climbing (Screenshot 9)

**Card 1 — Title:** Give and receive stars

**XP badge:** `+10 XP` — **EACH TIME SOMEONE STARS YOUR APP**

**Body:**
> Star apps you like to save them to your favourites and help surface the projects worth celebrating.

> Your stars help choose what gets noticed. Starring is one-way and free, and the XP goes to the app's builder.

**Button:** **Explore apps**

---

**Card 2 — Title:** Keep climbing

**Body:**
> Every app you launch, mod, and star earns XP. See how you stack up against other builders, then keep shipping to climb.

> Want more? Go deeper in the **developer docs**, or join the community.

**Button:** **Go to leaderboard**

---

## D. ChopDot deploy record — same day (for cross-reference with A–B)

**On-chain deploy (2026-06-18, remote operator, no Polkadot Mobile):**

| Field | Value |
| --- | --- |
| Command used | `npx @parity/polkadot-app-deploy@0.11.0 ./dist-dot-host chopdotws01.dot` *(Kubo on PATH; no `--js-merkle`)* |
| Domain | `chopdotws01.dot` |
| Gateway URL | `https://chopdotws01.dot.li` |
| Root CID | `bafybeicmvehgl4j2fgidl4e3nrcbs7zdjnstjjmyei5cae4gn736tes64q` |
| Register tx | `0xd55a4a59a2cdcc18790894bde319a18b48df3d7504457b790eb8f5bb9e10c11a` |
| Contenthash tx | `0x20962ed4dba56cb813bd408238ef504e2b69d565030415d3ec135bb11000081e` |
| pad P2P at deploy | ✓ (30ms) |

**`playground deploy` attempt (same day, v0.44.0) — exact CLI message:**

```
╭────────────────────────────────────────────────────────────────────────────╮
│ Join the competition first                                                 │
│ Playground commands are for builders who've joined the competition, so you │
│  need to be signed in first.                                               │
│                                                                            │
│ Run `playground login` and scan the QR code with your Polkadot mobile app, │
│  then become a builder and join the competition at playground.dot in your  │
│ desktop app.                                                               │
╰────────────────────────────────────────────────────────────────────────────╯
```

**Remote verify (same day, after deploy):**
- `https://chopdotws01.dot.li` → Polkadot host shell; **This app can't be reached** (matches Screenshots 1–2)
- `https://paseo-ipfs.polkadot.io/ipfs/bafybeicmvehgl4j2fgidl4e3nrcbs7zdjnstjjmyei5cae4gn736tes64q` → HTTP 504 (multiple retries)
- Playwright on live URL: title `Polkadot - The decentralized web, in your browser`; `summit-banner` test id count `0`

**Settings panel (Screenshot 3) vs deploy RPC:** Host UI shows **Network: Summit** while `pad` deploy log shows **Environment: Paseo Next v2**. Both names appear in host NETWORK list (Summit · Paseo Next V2 · Previewnet).

---

## E. CLI name note (UI vs local install)

| Source | CLI binary / prefix |
| --- | --- |
| Playground quest UI (Screenshots 4–7) | `pg` (`pg login`, `pg decentralize`, `pg mod`, `pg deploy`) |
| Parity install script (local, 2026-06-18) | `playground` v0.44.0 in `$HOME/.local/bin` |
| Legacy deploy path (ChopDot Wave 1) | `npx @parity/polkadot-app-deploy@0.11.0` (`pad` behaviour) |

---

## F. Related repo docs

- **Capture vs native lanes:** [capture-native-lane-map.md](./capture-native-lane-map.md)
- Deploy economics + tx log: [path-to-fully-native.md](./path-to-fully-native.md) §13.2
- Programme A status board: [2026-06-17-chopdot-dot-master-execution.md](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md)
- Deploy log file: `.local-private/wave1-deploy.log`

---

## G. Operator checklist — host network mismatch (2026-06-18)

**When:** After `pad` deploy to Paseo Next v2, before blaming bundle or gateway.

**Symptom:** Polkadot host shows **This app can't be reached** or **Reaching out** while on-chain contenthash is set.

### G.1 Do NOT switch to Paseo Next V2 (operator report 2026-06-18)

**Observed:** Selecting **Paseo Next V2** → Clear caches → **Save & Apply** causes the host shell to **reload in a loop** (loading → reset → loading). Page never stabilises.

**Action:** **Stop.** Leave **Network: Summit** (default on `*.dot.li`). Do not apply Paseo Next V2 on the web host unless Parity docs say otherwise.

**Likely cause:** Light Client Shared re-initialises smoldot for Paseo Next system chains on Save & Apply; host `0.6.0 (dev)` may not handle that transition cleanly in-browser.

**Workarounds to try instead (Summit network stays selected):**

| Step | Try |
| --- | --- |
| 1 | BACKEND → **Trusted Providers** (instead of Light Client Shared) → Save & Apply → reload |
| 2 | CACHE → Clear all caches (once, on Summit) → Save & Apply |
| 3 | **Polkadot Desktop** (toast on `.dot.li`) — may resolve content the web shell cannot |
| 4 | Wait / retry — `paseo-ipfs.polkadot.io` still **504** on root CID from remote checks; host cannot fetch Bulletin content until gateway serves |
| 5 | **Local demo (Wave 1 A5):** `npm run preview:dot-host` → `http://127.0.0.1:4174/?mode=savings_circle` |

### G.2 Original mismatch hypothesis (superseded by G.1 for web host)

`pad` deploy uses **Environment: Paseo Next v2** while host UI defaults to **Summit**. We hypothesised toggling to Paseo Next V2 would fix resolution; **operator testing showed the toggle breaks the shell**. Treat **gateway propagation** and **host fetch path** as the live blockers, not network radio selection on web.

**Record outcome after workarounds:** unchanged / Reaching out / React app loads / Desktop works

**Why:** Screenshot 3 showed **Network: Summit** while Wave 1 `pad` deploy used **Environment: Paseo Next v2** (see §D). Web-host network toggle is **not** a safe fix.

---

## H. Summit delegate runbook (Mobile-only — not executable remotely)

**Audience:** Builder on summit floor with Polkadot Mobile + competition access.

**Prerequisites from repo:**
- `npm run build:dot-host` → `dist-dot-host/` (or zip of that folder)
- Kubo (`ipfs`) on PATH for `pg decentralize` / Kubo merkle path
- Latest root CID and domain recorded in §D (update after each redeploy)

| Step | Action |
| --- | --- |
| 1 | `pg login` — scan QR with summit Polkadot Mobile |
| 2 | Join competition at `playground.dot` in desktop Polkadot app |
| 3 | Receive `dist-dot-host/` from operator |
| 4 | `pg decentralize` or `pg deploy` — when publishing select: publish to Playground, make it moddable, link public GitHub source (§C.4) |
| 5 | Optional: update `chopdotxx00.dot` if Talis owner mnemonic available |
| 6 | Verify on floor: try both **Summit** and **Paseo Next V2** network in host Settings; record which resolves |

**XP quests (awareness only):** §C.1 Launch (+100 XP first three listed deploys), §C.4 Mod an app, §C.5 Get your app modded (+50 XP per mod), §C.6 Stars (+10 XP).

**Current deploy artefact (slim dot-lab entry — 2026-06-18):**
- Domain: `chopdotws01.dot`
- URL: `https://chopdotws01.dot.li`
- Root CID: `bafybeibxwkaks6s2g7eeew4pozjky46etjrcqczuajzz7zt3yjxyqxmjqq`
- Contenthash tx: `0xd9ca1b578fc2cc0b4ea836018e34ca46d23012bac38bfc134935a3a9057e18bc`
- Bundle: `dot-lab.html` → `index.html` (~230 KB JS + shared CSS assets; incremental deploy saved ~9.5 MB vs prior full SPA)
- Remote Kubo path: `npm run build:dot-host && npx @parity/polkadot-app-deploy@0.11.0 ./dist-dot-host chopdotws01.dot` (no `--js-merkle`)
- Verify: `DOT_DEPLOY_CID=<cid> npm run verify:dot-host`

*Prior full-SPA CID (superseded): `bafybeicmvehgl4j2fgidl4e3nrcbs7zdjnstjjmyei5cae4gn736tes64q`*

---

*Captured 2026-06-18 during Web3 Summit Berlin week; §0 updated 2026-06-19 with Day 1–2 public narrative. Update this file when new official UI copy or operator constraints change — append dated sections rather than rewriting history.*
