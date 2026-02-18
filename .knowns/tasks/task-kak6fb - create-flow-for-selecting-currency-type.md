---
id: kak6fb
title: "Create flow for selecting currency type"
status: done
priority: medium
createdAt: '2026-02-18T14:59:52Z'
updatedAt: '2026-02-18T16:05:00Z'
timeSpent: 0
---

# Create flow for selecting currency type

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currency types, show exchange rates, include l1 & l2 cryptos
<!-- SECTION:DESCRIPTION:END -->

## Completion Notes

- Added expanded currency support in the web app and Expo app for fiat + L1/L2 crypto selections.
- Added live exchange-rate previews during pot creation in:
  - `src/components/screens/CreatePot.tsx`
  - `expo-app/app/create-pot.tsx`
- Added shared web currency catalog and extended pricing support:
  - `src/services/prices/currencyCatalog.ts`
  - `src/services/prices/currencyService.ts`
  - `src/services/prices/coingecko.ts`
  - `src/services/prices/types.ts`
- Expanded supported base currencies in web and Expo type systems:
  - `src/schema/pot.ts`
  - `expo-app/types/pot.ts`
