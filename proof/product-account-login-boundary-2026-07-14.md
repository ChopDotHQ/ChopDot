# Product Account login boundary - 2026-07-14

## Result

`blocked_runtime`

The live Paseo host exposes a real Product Account login flow. Selecting the
host account control opens a QR prompt titled `Login with Polkadot Mobile` and
asks the user to scan it with Polkadot Mobile.

This proves that:

- the deployed ChopDot shell is running inside the expected Polkadot host;
- the host identity manager is present and can initiate its login ceremony;
- the remaining identity blocker is not ChopDot routing or missing host UI.

It does not prove that:

- a Product Account was granted to ChopDot;
- the QR challenge completed;
- two devices share a session;
- a payment or receipt operation succeeded.

## Evidence

- Live URL: `https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`
- Screenshot: `proof/polkadot-host-capability-live/product-account-login-qr.png`
- Capability report: `proof/polkadot-host-capability-live/report.json`
- Browser observation: host dialog contained `Scan with Polkadot Mobile to connect`

## Blocking dependency

Polkadot Mobile is currently available as community source, not as a normal
App Store or Google Play install. A runnable client is therefore unavailable
for this live QR check. Building the iOS source with full Xcode is an optional
fallback, not a ChopDot prerequisite.

## Next gate

Use an official distributed Polkadot Mobile build when one becomes available,
or explicitly choose the optional source-build route. Then scan the live QR
and record the returned product-scoped identity before attempting live
Statement Store sync.
