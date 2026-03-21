# Component & Structure Audit — 99.999999% Confidence Methodology

**Purpose:** Ensure no files, routes, or references are missed when auditing the component catalog and FILE_STRUCTURE against the codebase.

---

**For agents:** Orphans and undocumented files require **human categorization** before any remediation. Do not auto-remove orphans, auto-add undocumented files to FILE_STRUCTURE, or "fix" router gaps without explicit user approval. See [AUDIT_FINDINGS_DOCUMENTED.md](../../artifacts/AUDIT_FINDINGS_DOCUMENTED.md) for what is proven vs human-needed.

---

## 1. Coverage Principles

| Principle | Implementation |
|-----------|----------------|
| **Enumerate everything** | Walk `src/components` exhaustively; no exclusions except `*.test.*` / `*.spec.*` |
| **Trace every import** | Static `import X from 'path'`, dynamic `import('path')`, and `@/` alias |
| **Resolve correctly** | Handle relative paths, `src/` roots, `@/` (→ project root), barrel `index.tsx`/`index.ts`, and missing extensions |
| **Case-insensitive match** | `Toast.tsx` ↔ `toast.tsx` when comparing basenames |
| **Project-wide stale check** | Search entire project for documented filenames, not just `src/` |
| **Router cross-check** | Compare `nav.ts` screen types with `AppRouter` cases |

---

## 2. Automated Audit Script

**Script:** `scripts/audit-components-and-structure.mjs`

### What it does

1. **Enumeration**
   - `componentFiles`: All `.tsx`/`.ts` under `src/components`
   - `allSrcFiles`: All `.tsx`/`.ts` under `src` (excl. tests)
   - `servicesFiles`, `contextsFiles`, `hooksFiles`, `utilsFiles`

2. **Import graph (incl. re-exports)**
   - Static imports, dynamic `import('...')`, paths `./`, `../`, `src/`, `@/`
   - **Re-export propagation:** `export * from './foo'` and `export { X } from './foo'` — when A imports B and B re-exports C, A counts as importer of C
   - Scan includes test files; orphans get `usedOnlyInTests` flag

3. **Orphans**
   - `componentFiles` with no importers (incl. re-export chain)
   - Subset: orphans used **only** in `.test.`/`.spec.` files

4. **Undocumented**
   - In filesystem, not in FILE_STRUCTURE (case-insensitive basename)
   - Per-dir: services, contexts, hooks, utils

5. **Stale**
   - In FILE_STRUCTURE, but no file with that basename exists anywhere under project root

6. **Router gaps**
   - In `nav.ts` but no `AppRouter` case
   - In `AppRouter` but not in `nav.ts`

7. **COMPONENT_CATALOG verification**
   - Components in catalog missing from codebase
   - Screen mappings with missing component

8. **Navigation grep**
   - `grep` for `push(` / `replace(` in `src`
   - Extract `type: "screen-type"`; verify all are in `nav.ts`

### Output

- `artifacts/AUDIT_COMPONENTS_STRUCTURE.json`
- `artifacts/AUDIT_COMPONENTS_STRUCTURE.md`

### CI

The audit runs in `.github/workflows/ci.yml` after build. It does not fail the pipeline (exit 0); reports are informational.

---

## 3. Proven vs Human Intervention

| Check | Deterministic (script) | Human needed |
|-------|------------------------|--------------|
| Orphans | ✅ Count, list, test-only flag | Categorise, wire/remove |
| Undocumented | ✅ Per-dir list | Add to FILE_STRUCTURE or exclude |
| Stale | ✅ | Fix FILE_STRUCTURE |
| Router gaps | ✅ | Confirm redirect vs missing |
| Catalog components | ✅ | Fix catalog if wrong |
| Navigation grep | ✅ Types in code vs nav.ts | Add to nav.ts if valid |
| Re-exports | ✅ Traced | — |
| Test-only orphans | ✅ Flagged | Verify intentional |

## 4. Known Limitations

| Gap | Risk | Mitigation |
|-----|------|------------|
| **Versioned imports** | `sonner@2.0.3` resolves via vite alias | Script tracks `../ui/sonner` |
| **Runtime-only paths** | `import(` + variable `)` not traced | Grep for string concatenation |
| **Conditional lazy load** | Path in variable | Covered if literal in `import('path')` |
| **ui/ shadcn** | Many compose others | Used = not orphan; unused = orphan |

---

## 5. Final Verification Checklist

Before closing the audit:

- [ ] Run `node scripts/audit-components-and-structure.mjs` and confirm no new errors
- [ ] **Orphans:** For each orphan, decide: wire it, remove it, or document as intentional (e.g. ConnectWalletScreen, AttestationDetail)
- [ ] **Undocumented:** Add to FILE_STRUCTURE or add to an explicit exclusion list with rationale
- [ ] **Stale:** Fix FILE_STRUCTURE (remove or correct references)
- [ ] **Router gaps:** Add AppRouter cases or document redirect/legacy behaviour for `settle-cash`, `settle-bank`, `settle-dot`, `checkpoint-status`
- [ ] Compare `COMPONENT_CATALOG.md` sections against screens/overlays; ensure no screen/flow is undocumented
- [ ] Grep for `push(` and `replace(` in navigation code to find any route strings not in `nav.ts`
- [ ] Grep for `case "` in AppRouter to ensure all cases are captured

---

## 6. Orphan Classification (reference)

| Category | Examples | Action |
|----------|----------|--------|
| **Intentional legacy** | ConnectWalletScreen, AttestationDetail | Document in catalog |
| **Shadcn unused** | accordion, menubar, etc. | Keep for future use or remove |
| **Debug/dev** | PotsDebug, DataLayerErrorBoundary | Document or gate behind flags |
| **Reachable but not imported** | Screens loaded by AppRouter lazy import | Not orphans; script traces dynamic imports |

---

## 7. One-Time Commands for Extra Assurance

```bash
# Find any navigation push/replace we might have missed
rg "push\(|replace\(" src --type ts -A 0

# Find all AppRouter case strings
rg 'case\s+"[^"]+"' src/components/AppRouter.tsx

# Find all nav type strings
rg 'type:\s*["\'][^"\']+["\']' src/nav.ts
```

---

**Last updated:** February 2026
