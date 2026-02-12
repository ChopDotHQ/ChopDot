# MVP Action Inventory (Teddy Checklist)

Generated: 2026-02-11

This list is intended to be the pre-Cypress source of truth for MVP action coverage.

## Summary

- Total identified actions: 175
- `READY`: 155
- `PARTIAL`: 20

Legend:
- `READY` = action appears wired and should be included in Cypress coverage.
- `PARTIAL` = action is currently stubbed/mock/unwired and should be expected to fail until implemented.

Primary code references used for this inventory:
- `src/components/AppRouter.tsx`
- `src/App.tsx`
- `src/components/app/AppOverlays.tsx`
- `src/components/screens/*.tsx`
- `docs/SMOKE_TEST_CHECKLIST.md`

## Actions

### Auth

- [ ] MVP-001 | READY | Load app while logged out and land on authentication screen | Cypress
- [ ] MVP-002 | READY | Open email login panel from auth screen | Cypress
- [ ] MVP-003 | READY | Submit valid email/password login | Cypress
- [ ] MVP-004 | READY | Show validation error for invalid email/password login | Cypress
- [ ] MVP-005 | READY | Trigger forgot-password flow from login panel | Cypress
- [ ] MVP-006 | READY | Open sign-up panel from login panel | Cypress
- [ ] MVP-007 | READY | Submit valid sign-up form | Cypress
- [ ] MVP-008 | READY | Block sign-up when password and confirm password do not match | Cypress
- [ ] MVP-009 | READY | Block sign-up when terms acceptance is missing | Cypress
- [ ] MVP-010 | READY | Login with Polkadot.js extension wallet | Manual
- [ ] MVP-011 | READY | Login with WalletConnect modal flow | Manual
- [ ] MVP-012 | READY | Continue as guest from auth screen | Cypress
- [ ] MVP-013 | READY | Toggle auth visual variant (theme/view mode controls) | Cypress
- [ ] MVP-014 | READY | Logout from authenticated app back to auth screen | Cypress

### Navigation

- [ ] MVP-015 | READY | Switch to Pots tab from bottom tab bar | Cypress
- [ ] MVP-016 | READY | Switch to People tab from bottom tab bar | Cypress
- [ ] MVP-017 | READY | Switch to Activity tab from bottom tab bar | Cypress
- [ ] MVP-018 | READY | Switch to You tab from bottom tab bar | Cypress
- [ ] MVP-019 | READY | Trigger center FAB action in Pots context | Cypress
- [ ] MVP-020 | READY | Trigger center FAB action in Activity context | Cypress
- [ ] MVP-021 | READY | Open notification center from header bell | Cypress
- [ ] MVP-022 | READY | Mark notifications read from notification center | Cypress
- [ ] MVP-023 | READY | Close notification center overlay | Cypress
- [ ] MVP-024 | READY | Open and close wallet/account menu from header | Cypress

### Pots Home

- [ ] MVP-025 | READY | Render pots list (or empty state) on Pots tab | Cypress
- [ ] MVP-026 | READY | Search pots by name query | Cypress
- [ ] MVP-027 | READY | Sort pots by recent activity | Cypress
- [ ] MVP-028 | READY | Sort pots alphabetically ascending | Cypress
- [ ] MVP-029 | READY | Sort pots alphabetically descending | Cypress
- [ ] MVP-030 | READY | Sort pots by balance high to low | Cypress
- [ ] MVP-031 | READY | Sort pots by balance low to high | Cypress
- [ ] MVP-032 | READY | Toggle visibility of totals (privacy eye control) | Cypress
- [ ] MVP-033 | READY | Open pot detail from pot card click | Cypress
- [ ] MVP-034 | READY | Use create-pot CTA from top action area | Cypress
- [ ] MVP-035 | READY | Use create-pot CTA from empty state | Cypress
- [ ] MVP-036 | READY | Quick action: Add expense | Cypress
- [ ] MVP-037 | READY | Quick action: Settle | Cypress
- [ ] MVP-038 | READY | Quick action: Scan | Cypress
- [ ] MVP-039 | READY | Quick action: Request | Cypress
- [ ] MVP-040 | READY | Load additional pots via pagination button | Cypress

### Create Pot

- [ ] MVP-041 | READY | Open create-pot screen from Pots Home | Cypress
- [ ] MVP-042 | READY | Edit pot name field | Cypress
- [ ] MVP-043 | READY | Select expense pot type | Cypress
- [ ] MVP-044 | READY | Select savings pot type | Cypress
- [ ] MVP-045 | READY | Select base currency | Cypress
- [ ] MVP-046 | READY | Toggle budget tracking on/off | Cypress
- [ ] MVP-047 | READY | Enter budget amount when budget tracking is enabled | Cypress
- [ ] MVP-048 | READY | Copy invite link from create-pot flow | Cypress
- [ ] MVP-049 | READY | Submit create-pot and return to pot-home | Cypress
- [ ] MVP-050 | READY | Show validation for invalid create-pot submission | Cypress

### Pot Home

- [ ] MVP-051 | READY | Open pot-home screen with selected pot | Cypress
- [ ] MVP-052 | READY | Navigate back from pot-home to previous screen | Cypress
- [ ] MVP-053 | READY | Switch between Expenses/Members/Settings tabs | Cypress
- [ ] MVP-054 | READY | Open Add Expense from Expenses tab CTA | Cypress
- [ ] MVP-055 | READY | Open Expense Detail from expense list row | Cypress
- [ ] MVP-056 | READY | Toggle pending-only expenses filter | Cypress
- [ ] MVP-057 | READY | Toggle expense activity panel visibility | Cypress
- [ ] MVP-058 | READY | Open expenses sort/filter controls | Cypress
- [ ] MVP-059 | READY | Swipe action: attest expense from list row | Cypress
- [ ] MVP-060 | READY | Swipe action: delete expense from list row | Cypress
- [ ] MVP-061 | PARTIAL | Checkpoint confirmation flow before settlement | Manual
- [ ] MVP-062 | READY | Start settle flow from Expenses tab | Cypress
- [ ] MVP-063 | READY | Batch confirm pending expenses | Cypress
- [ ] MVP-064 | READY | Savings tab: Add contribution CTA | Cypress
- [ ] MVP-065 | READY | Savings tab: Withdraw CTA | Cypress
- [ ] MVP-066 | READY | Savings tab: open all contributions history | Cypress
- [ ] MVP-067 | READY | Export pot expenses CSV from pot header action | Cypress
- [ ] MVP-068 | READY | Open quick-add keypad sheet | Cypress
- [ ] MVP-069 | READY | Save quick-add expense via keypad sheet | Cypress

### Pot Members

- [ ] MVP-070 | PARTIAL | Open Add Member flow from pot-home members tab | Cypress
- [ ] MVP-071 | READY | Search contacts in Add Member sheet | Cypress
- [ ] MVP-072 | READY | Add existing contact to pot from Add Member sheet | Cypress
- [ ] MVP-073 | READY | Send invite to new member via Add Member sheet | Cypress
- [ ] MVP-074 | READY | Open show-QR from Add Member sheet | Cypress
- [ ] MVP-075 | READY | Open member edit modal from member menu | Cypress
- [ ] MVP-076 | READY | Save member updates (name/address/verified) from edit modal | Cypress
- [ ] MVP-077 | READY | Copy member wallet address from member card | Cypress
- [ ] MVP-078 | READY | Resend pending invite from member menu | Cypress
- [ ] MVP-079 | READY | Revoke pending invite from member menu | Cypress
- [ ] MVP-080 | PARTIAL | Remove member from pot via member menu | Cypress
- [ ] MVP-081 | READY | Open member-detail screen | Cypress
- [ ] MVP-082 | READY | Open payment details modal in member-detail screen | Cypress
- [ ] MVP-083 | READY | Run settle action from member-detail screen | Cypress

### Pot Settings

- [ ] MVP-084 | PARTIAL | Update pot name in Settings tab (persisted update) | Cypress
- [ ] MVP-085 | PARTIAL | Update pot base currency in Settings tab (persisted update) | Cypress
- [ ] MVP-086 | PARTIAL | Toggle budget tracking in Settings tab (persisted update) | Cypress
- [ ] MVP-087 | PARTIAL | Update budget amount in Settings tab (persisted update) | Cypress
- [ ] MVP-088 | READY | Copy invite link from Settings tab | Cypress
- [ ] MVP-089 | PARTIAL | Open Share Pot (IPFS) sheet from Settings tab | Manual
- [ ] MVP-090 | READY | Export pot as JSON file | Cypress
- [ ] MVP-091 | READY | Import pot from JSON file | Cypress
- [ ] MVP-092 | READY | Export encrypted pot (.chop) with password | Cypress
- [ ] MVP-093 | READY | Import encrypted pot (.chop) with password | Cypress
- [ ] MVP-094 | READY | Open password modal for encrypted export | Cypress
- [ ] MVP-095 | READY | Open password modal for encrypted import | Cypress
- [ ] MVP-096 | PARTIAL | Leave pot action from Settings tab | Cypress
- [ ] MVP-097 | PARTIAL | Archive pot action from Settings tab | Cypress
- [ ] MVP-098 | PARTIAL | Delete pot action from Settings tab | Cypress

### Import Pot

- [ ] MVP-099 | PARTIAL | Reach import-pot flow from normal in-app navigation | Cypress
- [ ] MVP-100 | READY | Reach import-pot flow via cid URL parameter | Cypress
- [ ] MVP-101 | READY | Confirm import-pot and open imported pot-home | Cypress
- [ ] MVP-102 | READY | Cancel import-pot flow and return to previous screen | Cypress

### Add/Edit Expense

- [ ] MVP-103 | READY | Open add-expense screen from pot-home | Cypress
- [ ] MVP-104 | READY | Change selected pot from add-expense header control | Cypress
- [ ] MVP-105 | READY | Set amount field with numeric validation | Cypress
- [ ] MVP-106 | READY | Change currency for non-DOT pot | Cypress
- [ ] MVP-107 | READY | Enter description/memo (required) | Cypress
- [ ] MVP-108 | READY | Select paid-by member | Cypress
- [ ] MVP-109 | READY | Change expense date | Cypress
- [ ] MVP-110 | READY | Configure equal split with member include/exclude | Cypress
- [ ] MVP-111 | READY | Configure custom percentage split | Cypress
- [ ] MVP-112 | READY | Validate custom split must total 100% | Cypress
- [ ] MVP-113 | READY | Configure shares-based split | Cypress
- [ ] MVP-114 | READY | Save new expense and return to pot-home | Cypress
- [ ] MVP-115 | READY | Open edit-expense prefilled with existing data | Cypress
- [ ] MVP-116 | READY | Save edits to existing expense | Cypress
- [ ] MVP-117 | PARTIAL | Open receipt upload sheet from add-expense UI | Cypress

### Expense Detail

- [ ] MVP-118 | READY | Open expense-detail from pot-home or activity entry | Cypress
- [ ] MVP-119 | READY | Go back from expense-detail | Cypress
- [ ] MVP-120 | READY | Attest expense from detail screen | Cypress
- [ ] MVP-121 | READY | Edit expense from detail screen | Cypress
- [ ] MVP-122 | READY | Delete expense from detail screen | Cypress
- [ ] MVP-123 | READY | Copy receipt link from detail screen | Cypress
- [ ] MVP-124 | READY | Open receipt viewer modal from detail screen | Cypress
- [ ] MVP-125 | READY | Close receipt viewer modal | Cypress
- [ ] MVP-126 | READY | Run anchor/update expense action from detail screen | Manual
- [ ] MVP-127 | READY | Connect wallet from expense-detail CTA | Manual

### Settlement

USDC note:
- Chain service supports USDC transfer (`sendUsdc`), but current settle UI does not expose a USDC method tab.
- Track USDC readiness with `MVP-174` and `MVP-175` until UI wiring is implemented.

- [ ] MVP-128 | READY | Open settle-selection from pot-home | Cypress
- [ ] MVP-129 | READY | Return from settle-selection to pot-home | Cypress
- [ ] MVP-130 | READY | Select a person in settle-selection | Cypress
- [ ] MVP-131 | READY | Open settle-home scoped to selected counterparty | Cypress
- [ ] MVP-132 | READY | Choose cash settlement method tab | Cypress
- [ ] MVP-133 | READY | Choose bank settlement method tab | Cypress
- [ ] MVP-134 | READY | Choose PayPal settlement method tab | Cypress
- [ ] MVP-135 | READY | Choose TWINT settlement method tab | Cypress
- [ ] MVP-136 | READY | Choose DOT settlement method when wallet and address exist | Manual
- [ ] MVP-137 | READY | Confirm cash settlement and complete flow | Cypress
- [ ] MVP-138 | READY | Confirm bank settlement with optional reference | Cypress
- [ ] MVP-139 | READY | Confirm PayPal settlement with email requirement | Cypress
- [ ] MVP-140 | READY | Confirm TWINT settlement with phone requirement | Cypress
- [ ] MVP-141 | READY | Submit DOT on-chain settlement transaction | Manual
- [ ] MVP-174 | PARTIAL | Choose USDC settlement method tab (not exposed in current settle-home UI) | Manual
- [ ] MVP-175 | PARTIAL | Submit USDC on-chain settlement transaction from settle-home flow | Manual
- [ ] MVP-142 | READY | Copy bank transfer details from settle-home | Cypress
- [ ] MVP-143 | READY | Copy PayPal payment details from settle-home | Cypress
- [ ] MVP-144 | READY | Copy TWINT payment details from settle-home | Cypress
- [ ] MVP-145 | PARTIAL | Open Hyperbridge bridge sheet from settle-home | Manual
- [ ] MVP-146 | READY | Open settlement history from settle-home | Cypress
- [ ] MVP-147 | PARTIAL | Export settlement history as CSV from history screen | Cypress
- [ ] MVP-148 | READY | Open settlement confirmation: view history action | Cypress
- [ ] MVP-149 | READY | Open settlement confirmation: done action | Cypress

### People

- [ ] MVP-150 | READY | Switch between People and Balances sub-tabs | Cypress
- [ ] MVP-151 | READY | Run settle action from person row | Cypress
- [ ] MVP-152 | READY | Run remind action from person row | Cypress
- [ ] MVP-153 | READY | Open people sort/filter sheet and apply sort | Cypress
- [ ] MVP-154 | READY | Open person detail entry from people list | Cypress

### Activity

- [ ] MVP-155 | READY | Open activity-home and view timeline cards | Cypress
- [ ] MVP-156 | READY | Open expense activity item to expense-detail | Cypress
- [ ] MVP-157 | READY | Open pot-created activity item to pot-home | Cypress
- [ ] MVP-158 | READY | Confirm pending expense from activity pending section | Cypress
- [ ] MVP-159 | READY | Use settle action from activity sheet | Cypress
- [ ] MVP-160 | READY | Open activity sort/filter controls | Cypress
- [ ] MVP-161 | READY | Change activity filter chip | Cypress
- [ ] MVP-162 | READY | Refresh activity feed from pull-to-refresh | Cypress

### You Tab

- [ ] MVP-163 | PARTIAL | Open My QR sheet from You tab | Cypress
- [ ] MVP-164 | PARTIAL | Open Scan QR sheet from You tab | Cypress
- [ ] MVP-165 | READY | Open Receive QR screen from You tab (wallet connected) | Cypress
- [ ] MVP-166 | READY | Open Payment Methods from You tab | Cypress
- [ ] MVP-167 | READY | Set preferred payment method in Payment Methods screen | Cypress
- [ ] MVP-168 | READY | Open add payment method sheet and save | Cypress
- [ ] MVP-169 | READY | Open View Insights from You tab | Cypress
- [ ] MVP-170 | READY | Update profile email from Security section | Cypress
- [ ] MVP-171 | READY | Update password from Security section | Cypress
- [ ] MVP-172 | PARTIAL | Run advanced actions (export data/privacy/backup/dev/clear cache) | Manual
- [ ] MVP-173 | READY | Logout and delete-account actions from You tab | Manual

## Known Partial Hotspots

- `MVP-061` Checkpoint confirmation flow before settlement
- `MVP-070` Open Add Member flow from pot-home members tab
- `MVP-080` Remove member from pot via member menu
- `MVP-084` Update pot name in Settings tab (persisted update)
- `MVP-085` Update pot base currency in Settings tab (persisted update)
- `MVP-086` Toggle budget tracking in Settings tab (persisted update)
- `MVP-087` Update budget amount in Settings tab (persisted update)
- `MVP-089` Open Share Pot (IPFS) sheet from Settings tab
- `MVP-096` Leave pot action from Settings tab
- `MVP-097` Archive pot action from Settings tab
- `MVP-098` Delete pot action from Settings tab
- `MVP-099` Reach import-pot flow from normal in-app navigation
- `MVP-117` Open receipt upload sheet from add-expense UI
- `MVP-145` Open Hyperbridge bridge sheet from settle-home
- `MVP-147` Export settlement history as CSV from history screen
- `MVP-174` Choose USDC settlement method tab (not exposed in current settle-home UI)
- `MVP-175` Submit USDC on-chain settlement transaction from settle-home flow
- `MVP-163` Open My QR sheet from You tab
- `MVP-164` Open Scan QR sheet from You tab
- `MVP-172` Run advanced actions (export data/privacy/backup/dev/clear cache)

## Suggested Cypress Execution Order

1. Auth
2. Navigation
3. Pots Home
4. Create Pot
5. Pot Home
6. Pot Members
7. Pot Settings
8. Add/Edit Expense
9. Expense Detail
10. Settlement
11. People
12. Activity
13. You Tab
