# ChopDot.dot — Recommended MCP Servers

Status: `active` · 2026-06-17  
**Purpose:** which MCPs to enable in Cursor (or Codex) by programme phase — avoid token bloat from unused servers.

**Install location:** merge snippets into `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project). Reload Cursor after changes (`Cmd+Shift+P` → Reload Window).

**Templates:** [`mcp/`](./mcp/) — copy-paste JSON per phase.

---

## Phase matrix

| MCP | Programme A | Capture P1 | Programme B | What it does |
| --- | --- | --- | --- | --- |
| **polkadot-docs** | **Required** | Helpful | **Required** | Official [Polkadot dev docs](https://docs.polkadot.com/ai-resources/#connect-via-mcp) — `pad`, Product SDK, Playground, `.dot` |
| **playwright-extension** | **Required** | **Required** | Helpful | Demo URLs, `chopdot-dot-lab.spec.ts`, 60s QA |
| **supabase** | Skip | **Add at C6** | Skip | Migrations, `capture_link_tokens`, hybrid data (Track 1) |
| **polkadot-mcp** (on-chain) | Optional | Skip | Optional | Paseo tx/balance/governance queries — **not** docs |
| **vercel** | **Skip** | Skip | Skip | `.dot` / Bulletin is deploy surface |
| **Second browser MCP** | **Skip** | Skip | Skip | Redundant with playwright-extension |

---

## Currently enabled (operator baseline — 2026-06-17)

| Server | Status | Tools |
| --- | --- | --- |
| `polkadot-docs` | ✅ Enabled | `search`, `read_document`, `list_documents`, `get_document_outline`, `get_project_info` |
| `playwright-extension` | ✅ Enabled | Browser automation for e2e / demo verification |

This is sufficient for **Phase 1 — Programme A**.

---

## 1. polkadot-docs (required)

**Source:** [Polkadot AI Resources — Connect via MCP](https://docs.polkadot.com/ai-resources/#connect-via-mcp)

```json
"polkadot-docs": {
  "url": "https://docs-mcp.polkadot.com"
}
```

**One-click:** use **Install via IDE → Cursor** on the AI Resources page.

**Use when:** `pad` flags, DotNS, Playground listing, `@parity/product-sdk-*`, host API questions.

**Not for:** live chain state — use on-chain MCP or `pad` + explorer.

**Template:** [`mcp/polkadot-docs.json`](./mcp/polkadot-docs.json)

---

## 2. playwright-extension (required)

Browser MCP for Playwright extension workflow (project already uses `npx playwright test`).

```json
"playwright-extension": {
  "command": "/opt/homebrew/bin/npx",
  "args": ["-y", "@playwright/mcp@latest", "--extension"],
  "env": {
    "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    "PLAYWRIGHT_MCP_EXTENSION_TOKEN": "<from Playwright MCP extension settings>"
  }
}
```

**Use when:** Programme A demo QA, capture E2E, gate UX checks.

**Template:** [`mcp/playwright-extension.example.json`](./mcp/playwright-extension.example.json) — replace token placeholder.

---

## 3. supabase (add for Capture P1 — task C6)

**When:** Starting `capture_link_tokens` migration and `CaptureLinkService`.

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "<sbp_... from https://supabase.com/dashboard/account/tokens>"
  }
}
```

**Use when:** Capture P1a/b, hybrid chapter store, link token RPC.

**Skip when:** Programme A only or Programme B native-only spikes.

**Template:** [`mcp/supabase.example.json`](./mcp/supabase.example.json)

---

## 4. polkadot-mcp (optional — on-chain)

**When:** Verifying Paseo deploys, balances, governance, or gate proof artefacts without leaving the agent.

Community server: [shawntabrizi/polkadot-mcp](https://github.com/shawntabrizi/polkadot-mcp) — supports **Paseo**, Polkadot, Kusama, Westend.

```json
"polkadot-onchain": {
  "command": "npx",
  "args": ["-y", "polkadot-mcp"]
}
```

Read-only by default. Transaction tools need explicit signer env (see upstream README) — **human approval** before enabling write tools.

**Use when:** Confirming `chopdotxx00.dot` register tx, Talis ownership, PAS fees post-deploy.

**Not a substitute for:** `polkadot-docs` (documentation).

**Template:** [`mcp/polkadot-onchain.example.json`](./mcp/polkadot-onchain.example.json)

**Alternative:** [substrate-mcp-rs](https://github.com/ThomasMarches/substrate-mcp-rs) — local binary, more Substrate-generic.

---

## Merged example (all phases)

[`mcp/chopdot-dot-full.example.json`](./mcp/chopdot-dot-full.example.json) — merge into `~/.cursor/mcp.json`; remove servers you are not using.

**Minimal Phase A only:** [`mcp/chopdot-dot-phase-a.json`](./mcp/chopdot-dot-phase-a.json)

---

## Agent routing

| Question type | MCP first |
| --- | --- |
| “How do I `pad deploy` / `--publish`?” | `polkadot-docs` |
| “Does the live demo pass?” | `playwright-extension` |
| “Create capture_link_tokens migration” | `supabase` (after enabled) |
| “Did our Paseo register tx land?” | `polkadot-onchain` (optional) or shell + explorer |

Documented in [native-execution-playbook.md](./native-execution-playbook.md) §4–6 and [master plan § CROSS-TOOL RESUME](../superpowers/plans/2026-06-17-chopdot-dot-master-execution.md#cross-tool-resume-codex--any-agent).

---

## Codex

Codex does not inherit Cursor MCP config. Options:

1. Configure the same servers in Codex MCP settings (if supported).
2. Use static bundles from [AI Resources](https://docs.polkadot.com/ai-resources/) (`apps-light.md`, `llms.txt`).
3. Paste master plan § CROSS-TOOL RESUME hydration prompt.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-17 | Initial phase matrix + templates for polkadot-docs, playwright, supabase, polkadot-onchain |
