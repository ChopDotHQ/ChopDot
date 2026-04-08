# ChopDot Financial Overview (2026 Base Case)

<discovery_plan>
- Convert the current product and infrastructure assumptions into a working financial model
- Separate platform cost, company burn, pricing, revenue, runway, and valuation scenarios
- Make the model editable so assumptions can be changed without rebuilding the workbook
</discovery_plan>

## FACTS

- Editable workbook:
  - `docs/finance/CHOPDOT_FINANCIAL_MODEL_2026.xlsx`
- Current financial model type:
  - software subscription model
  - non-custodial coordination product
  - no yield, no pooled-funds spread, no token economics revenue in the base case
- Current pricing assumptions:
  - Organizer Pro: `$12/mo`
  - Community / Club: `$49/mo`
  - SMB / Provider: `$149/mo`
  - Builder / API: `$499/mo` from `Y3`
- Current participant-side assumption:
  - participants pay `$0` directly in the base case if included in an organizer account

## ASSUMPTIONS

- This is a planning model, not an accounting statement.
- Vendor pricing is based on currently published pricing pages used when building the workbook:
  - Vercel
  - Supabase
  - Resend
- This model assumes ChopDot stays:
  - non-custodial
  - coordination-first
  - proof-capable later
- The valuation sheet shows private ARR-multiple scenarios.
  - It is not a public-market market-cap model.

## Today

### Cost to run

| Metric | Base case |
| --- | ---: |
| Lean platform cost / month | `$125` |
| Governance / compliance baseline / month | `$2,300` |
| Full operating cost / month at Y1 team plan | `$29,881` |
| Current modeled revenue / month (Y1 average) | `$4,970` |
| Current modeled net burn / month | `$24,911` |

### Cost to users

| User type | Base case |
| --- | ---: |
| Participant | `$0/mo` |
| Organizer Pro | `$12/mo` |
| Community / Club | `$49/mo` |
| SMB / Provider | `$149/mo` |
| Effective per-member cost in 4-person Organizer Pro group | `$3.00/mo` |

### Money-making mechanism

- Primary revenue now:
  - recurring software subscriptions
- Secondary revenue later:
  - Builder / API access
  - premium organizer controls
  - audit / export / policy workflows
- Explicitly not modeled as revenue today:
  - payment rail markup
  - yield
  - custody spread
  - token issuance

### Runway

| Scenario | Months of runway |
| --- | ---: |
| No cash modeled | `0.0` |
| Raise A: `$250k` | `10.0` |
| Raise B: `$500k` | `20.1` |
| Raise C: `$1.0m` | `40.1` |

## 5-Year Base-Case Forecast

| Year | ARR | Active users | EBITDA | Monthly burn |
| --- | ---: | ---: | ---: | ---: |
| Y1 | `$59,640` | `1,120` | `-$298,932` | `$24,911` |
| Y2 | `$209,340` | `4,020` | `-$535,853` | `$44,654` |
| Y3 | `$626,340` | `11,220` | `-$691,364` | `$57,614` |
| Y4 | `$1,604,760` | `27,080` | `-$586,404` | `$48,867` |
| Y5 | `$3,329,280` | `54,240` | `-$316,826` | `$26,402` |

## Implications In Plain English

- This base case gets ChopDot to meaningful software revenue.
- This base case does **not** get ChopDot to profitability by `Y5`.
- Under the current headcount and pricing assumptions, ChopDot still burns cash in every modeled year.
- So if you keep this operating shape, ChopDot needs:
  - more capital
  - better pricing
  - stronger upsell
  - slower hiring
  - or a combination of all four

## Valuation Scenarios

These are simple ARR-multiple planning scenarios, not public-market market cap.

| Year | Low (4x ARR) | Base (8x ARR) | High (12x ARR) |
| --- | ---: | ---: | ---: |
| Y3 | `$2,505,360` | `$5,010,720` | `$7,516,080` |
| Y4 | `$6,419,040` | `$12,838,080` | `$19,257,120` |
| Y5 | `$13,317,120` | `$26,634,240` | `$39,951,360` |

## Revenue Protection

### What protects revenue

- organizer workflows
- community / club coordination
- provider-side release and closeout tooling
- event history and trust semantics
- sticky group state once commitments, participants, and history live in ChopDot

### What puts revenue at risk

- low pricing power if ChopDot feels like a generic expense app
- competition from cheaper or free tools for simple groups
- SMB churn if release / closeout semantics are weak
- vendor dependency if auth / DB / messaging become fragile or expensive
- compliance or legal costs rising faster than revenue
- over-hiring ahead of proof of wedge

## What To Change First If You Want A Better Business

1. Raise prices carefully once the commitment loop is trusted.
2. Push harder on Community / Club and SMB / Provider tiers.
3. Delay some headcount expansion until retention and willingness-to-pay are proven.
4. Add premium policy / closeout / audit features earlier than token or custody features.
5. Keep vendor costs modular, but focus more on people-cost discipline than infra-cost obsession.

## Recommended Next Financial Steps

1. Maintain this workbook as the live source of truth for financial planning.
2. Create three scenarios in the workbook:
   - conservative
   - base
   - aggressive
3. Add a hiring toggle sheet next so headcount plans can be changed without rewriting formulas.
4. Add a pricing sensitivity sheet next so you can test:
   - `$12` vs `$19` Organizer Pro
   - `$49` vs `$79` Community
   - `$149` vs `$249` SMB
5. Revisit the forecast after Teddy restores the commitment loop and you understand real willingness-to-pay.
