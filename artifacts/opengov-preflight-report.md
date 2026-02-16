# OpenGov Preflight Report

Generated: 2026-02-16T16:12:08.056487+00:00

Summary: PASS=9 WARN=0 FAIL=2

## FAIL

- [Claims] Polkadot transactions claim contradiction: Found both sides of claim. Example positive: spec.md:127:- ✅ Real Polkadot transactions (DOT transfers via `balances.transferKeepAlive`) | Example negative: spec.md:444:- [ ] Real Polkadot transactions not implemented (UI only)
- [Claims] Production-ready claim vs unfinished markers: Found both sides of claim. Example positive: spec.md:5:**Status:** Production Ready 🚀   | Example negative: src/DESIGN_TOKENS.md:28:| `--muted` | `#8E8E93` | Tertiary text (timestamps, hints, placeholders) |

## PASS

- [Delivery] Recent commit activity: 169 commits in last 90 days.
- [Delivery] Contributor history: 281	Devpen787 |     20	Gizmotronn |      3	Liam Arbuckle
- [Proposal] Milestones section: Detected.
- [Proposal] KPI section: Detected.
- [Proposal] Budget section: Detected.
- [Proposal] Risk section: Detected.
- [Proposal] Sustainability section: Detected.
- [Proposal] Reporting/accountability section: Detected.
- [Budget] Monthly burn analysis: Amount: 45,000.00 USDT over 3 months = 15,000.00 USDT/month. Conservative monthly burn for early-stage treasury request.
