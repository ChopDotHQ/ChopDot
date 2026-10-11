# ChopDot J01 — exact repaired-build review

Packaged source SHA: `4b29bfac000f3c7639cbfde8de081fc06ba13afe`

Source tree: `1d1f4c8f07ca9c198a425c172146e2bd32322f4c`

This is the existing packager's complete 264-file output, with unmodified runtime
bytes, plus these instructions, provenance, screenshots and a Python-only local
launcher. No Node/npm, credentials, backend or provider is needed to review it.
The hosted ChopDot Site is unchanged; this package is a separate local review.

## Launch on your computer

1. Download and unzip `ChopDot-J01-review-4b29bfac.zip`.
2. Open a terminal in its `ChopDot-review-4b29bfac` folder.
3. Run:

```sh
python3 launch.py --port 8765
```

4. In a fresh private browser window, open this **local URL on your computer**:

`http://127.0.0.1:8765/prototypes/integrated-product-preview-v2/index.html`

Use one review tab. Keep that private window open during reload checks. This
preserves your ordinary browser records and the hosted Site's existing work.
Private-window work is temporary; there is no cross-device sync or real auth.
If port8765 is occupied, use another unused port and its matching printed URL;
keep the same port throughout the review so local state stays on the same origin.
Do not double-click the HTML as a file. Stop the server with Ctrl+C after review.

The launcher uses only Python3's standard library, binds to loopback, serves the
packaged files and mirrors the exact test fixture's empty `/favicon.ico` response.
It does not modify app files, seed records, collect secrets or deploy anything.

## Three review paths

1. **Simulation instructions:** From the front door select **Create account**.
   Enter `review@example.com` and select **Send code**. Verify the visible
   `123456` instructions and **No email was sent**. Select **Change email → Use a
   wallet instead → Everyday Account ending 9Kq**. Verify **No wallet approval is
   requested** and visible **Simulate verified approval**, **Simulate declined
   approval**, **Simulate unknown result** controls. **Check again** alone must
   not imply successful approval. These are public synthetic fixtures.

2. **Guest Back:** In a fresh review private window, enter **Continue as guest →
   Start a group**. Name it `Review local group`, keep CHF, and select **Create
   group**. Reload the browser tab to return to Guest Home with that local group.
   Select **Invite someone → Create account**. At Email select the top **Back**.
   Expected: **Ready to share?** account boundary, not the old marketing welcome.
   Select **Not now**. Expected: Guest Home still contains `Review local group`.

3. **Safe reload:** From that Guest Home select **Invite someone → Create account**,
   enter `review@example.com`, and select **Send code**. Reload the whole browser
   tab before submitting the code. Expected: a fresh empty Email form and the
   visible **Sign-in restarted…** explanation. The conversion intent and saved
   group remain; email, code and verification proof do not resume. Select top
   **Back → Not now** to inspect the same saved group. Request a fresh code if
   continuing. Signing in remains distinct from joining or payment authority.

## Screens and existing evidence

`screenshots/` includes exact-4b29 full-run front-door/code/wallet/converted
captures and Python-launcher review-path captures at **393x852** and **430x890**:
`simulation-code-*`, `simulation-wallet-*`, `guest-back-boundary-*`,
`guest-back-home-*`, `safe-reload-*`. These are actual Chromium captures,
not redesigned mockups. `delivery-smoke.json` records the bounded capture run.

Completed source verification is reused: full runner exit0; browser373,
model213, framework18; deterministic264-file packages and unchanged authority.
Prior de9ced5 independent372-pass/one-fail receipt remains preserved in repository
evidence. This delivery is not a new audit, independent tooling review, human
comprehension study, physical-device/accessibility certification or J01 acceptance.
Historical clarity evidence remains stale and INCOMPLETE.

`PACKAGE-MANIFEST.json` hashes every unchanged packager-produced file.
`SOURCE.json` records the exact source and packaging/capture provenance. The
external archive SHA-256 is supplied with the repository delivery receipt.
