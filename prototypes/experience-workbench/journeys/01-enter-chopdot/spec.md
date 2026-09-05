# Journey 01 — Enter ChopDot V1

**Status:** Golden Candidate #11 — review pending. **Priority:** P0.

## Basis and sequence

The registered Journey 01 goal is “Enter, authenticate or continue, then arrive somewhere useful.” Its entries are app launch and an invite link; its exits are Home (02) and invitation acceptance (04). It follows the completed in-app money loop. Journey 12 V1.1 was frozen separately as Golden #10 before this candidate began.

## User goal

Get into ChopDot without losing the reason for opening it.

## Candidate decisions, not previously approved implementation choices

Email with a short sign-in code is the proposed default. Wallet sign-in is optional. New and returning people share the same entry rather than having to decide between two registration forms. The returning-account fixture skips the name step; a new person supplies only the name their groups will see. This proposes an experience, not an authentication-provider choice.

## Paths

New person: Welcome → Email → Code → Name → Signed in → Home reference.

Returning person: Email → Code → Signed in → Home reference.

Invite: Invite waiting → Email or wallet sign-in → Signed in → Continue to invite → existing Join experience. Signing in never joins a group automatically.

Wallet: Account → Request sign-in approval → Waiting → verified result → Signed in. Check again reads the current request; it does not fabricate approval. Declined, expired and unknown outcomes remain distinct. Cancelling invalidates that request so a late result cannot sign the person in.

Expired session: Sign in again → original identity verified → resume invitation. A different identity sees a clear mismatch and no private groups are opened.

## Context and authority

The destination is an allowlisted Home or invitation context, retained through back navigation, changing sign-in methods, retries and offline recovery. The URL retains only that demo destination, not email, code or a session token. Reopening the document requires verification again; a URL is never sign-in proof.

Only verified authentication-provider results establish a real session. Browser fields, clicking Continue, connecting an account, and tapping Check again are not sufficient. Production verification, throttling, single-use challenge checks, replay protection and destination permission checks belong to deterministic server/provider logic, not to an LLM or this prototype's demo code.

Sign-in approval is not payment approval. It cannot authorize a transfer, confirm receipt, close a payment, merge two identities, or accept an invitation. Wallet secrets and private keys are never collected here. Account linking is not designed in this journey.

Before a real Join action, Journey 04 revalidates invitation availability and membership. This candidate does not replace that boundary. Home/Invite references deliberately use existing demo data, not accounts created by the prototype.

## Recovery

Invalid email; incorrect code; expired code and resend; offline with the invitation retained; expired session; wrong identity; wallet approval waiting, rejected, expired or unknown; loading failure. Retry while offline stays offline. A late approval for a cancelled request is ignored.

## Prototype limitations

No email is sent, account created, wallet connected, payment made or group joined by the entry model. Code 123456 and the dev@example.com returning-person fixture are public demonstration values. Do not reuse the demo verifier as production authentication. Fresh document loads intentionally do not restore an authenticated session. Native email delivery, wallet callbacks, recovery services, rate limiting and real account records require later implementation and testing.

## Inheritance and typography

The first style block is copied verbatim from the approved Journey 12 V1.1 artifact. Entry-specific styles are scoped additions, using the existing surfaces, colors, icons, headings and fixed frame. Existing Golden files are not edited. TYPO-01 (small progress labels) stays deferred to the later shared typography pass.

## Review focus

Does email-first feel natural? Is the one-field name step worthwhile? Does an invite survive every interruption? Are signing in and joining visibly separate? Are wallet refresh and approval clearly different? Do the signed-in result and two reference handoffs feel continuous with the Goldens?

## Next boundary

Do not freeze without explicit approval. Once entry is approved, finish any cross-journey integration review before selecting the next supporting journey from the registry.
