# Decision Log

## Current decisions

### 1. Product center

- **Decision:** ChopDot is a shared commitment product.
- **Why:** This is the clearest abstraction across deposits, goals, and closeout.
- **Revisit if:** real users consistently need a different primitive than shared commitment/chapter/closeout.

### 2. MVP posture

- **Decision:** coordination first, proof second, no custody-first launch.
- **Why:** lower legal, compliance, and operational risk.
- **Revisit if:** a legally clean execution rail becomes essential to core product value and is no longer optional.

### 3. First implementation proof

- **Decision:** restore the chapter / closeout loop first.
- **Why:** simplest technical recovery path for the commitment kernel.
- **Revisit if:** the current pot model cannot support it cleanly.

### 4. Wedge

- **Decision:** group deposits remain the strongest wedge.
- **Why:** urgency, deadlines, multiple parties, real social friction.
- **Revisit if:** another commitment type shows stronger retention and willingness-to-pay.

### 5. Architecture posture

- **Decision:** API-ready now, API-product later.
- **Why:** future builders/providers/agents need stable domain contracts without forcing API-first GTM.
- **Revisit if:** builder demand arrives earlier than direct operator demand.

### 6. Monetization posture

- **Decision:** subscription-led now, usage-priced trust actions later.
- **Why:** stable revenue now, fairer protocol-like economics later.
- **Revisit if:** subscription conversion is weak and usage-priced actions show clearer willingness-to-pay.

### 7. Rejected for now

- **Decision:** no token-first economics, no yield, no hidden spread on user money.
- **Why:** wrong legal posture, wrong trust posture, wrong company shape for now.
- **Revisit if:** ChopDot deliberately becomes a different kind of company with explicit legal and operational changes.
