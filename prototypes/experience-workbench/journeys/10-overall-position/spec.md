# Journey 10 — Overall Position

**Priority:** P0  
**Status:** V1 Golden / Design Approved  
**Prototype:** `v1-golden.html.gz.b64`

## User goal

Understand what I owe, what I am owed, who is involved, which groups created the balances, and what I can do next.

## Entry

- Home → Overall position
- People tab → Balances
- Group Home → View balances
- Review completion → Updated position

## Primary view

People is the default view because payments happen between people.

Secondary view:

`People → Groups`

## Information hierarchy

1. Net position
2. Gross amount you owe
3. Gross amount owed to you
4. People or groups creating the balances
5. Readiness or uncertainty
6. Settle, request, group, or issue handoff

## Core example

- Net: `+CHF 132.20`
- You owe: `CHF 84.30`
- Owed to you: `CHF 216.50`

People:
- You owe Jeanine CHF 54.30
- You owe Nina CHF 30.00
- Marc owes you CHF 125.40
- Sam owes you CHF 91.10

Groups:
- Zurich Weekend +CHF 52.90
- Apartment −CHF 54.30
- Ski Trip +CHF 79.30
- Geneva Day +CHF 54.30

## Netting rule

Balances may offset only when they involve:

- the same two people;
- the same currency.

Example:

- You owe Jeanine CHF 74.30 in Apartment.
- Jeanine owes you CHF 20.00 in Ski Trip.
- You settle CHF 54.30.

The person detail must show the group-level offsets. ChopDot may not hide the path to the final amount.

## Currency rule

Different currencies never combine silently.

Mixed state:

- CHF +132.20
- EUR −18.00
- DOT +2.400000

The default state shows no combined total.

An optional estimated home-currency view may exist only when:

- it is explicitly selected;
- it is labeled `Estimated`;
- the rate time is visible;
- original currency balances remain visible;
- settlement still occurs per currency.

## Readiness rule

An unresolved expense issue marks only the affected balance as `May change`.

Unaffected people and groups remain actionable.

The affected balance cannot enter settlement until the issue is resolved.

## Actions

- Amounts you owe → `Settle`
- Amounts owed to you → `Request`
- Group rows → Group Home
- Uncertain balance → Review issue
- Mixed currencies → Currency detail or optional estimate

Journey 10 owns understanding and routing. It does not perform settlement or requests.

## States

- standard People view;
- Groups view;
- same-currency person netting;
- person owed money;
- mixed currencies;
- one person across two currencies;
- optional CHF estimate;
- balance may change;
- group balance may change;
- only owe;
- only owed;
- all square;
- no balances;
- offline saved balances;
- loading;
- group, settlement, request, review, and navigation handoffs.

## Product decisions

- Show gross obligations alongside net.
- Default to people; groups are secondary.
- Keep the screen about shared obligations, not wallet balances.
- Avoid trust scores, wallet addresses, and payment-method clutter.
- Net only inside one currency.
- Show why a person-level balance exists.
- Do not block unrelated balances when one issue is open.
- Keep Settle and Request as explicit journey handoffs.
- Preserve the global People navigation context.
- Use short labels rather than explanatory paragraphs.

## Approval

Approved as **Golden Journey #8** on September 4, 2026.

Promoted patterns:
- Position Summary
- Person Balance
- Group Balance
- Same-Currency Offset
- Currency Position
- May-Change Balance

Next: Journey 11 — Settle Up.
