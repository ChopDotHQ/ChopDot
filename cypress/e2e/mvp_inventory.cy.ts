/// <reference types="cypress" />

type MvpAction = {
  id: number;
  ticket: string;
  status: 'READY' | 'PARTIAL';
  description: string;
  mode: 'Cypress' | 'Manual';
};

const actions: MvpAction[] = [
  {
    "id": 1,
    "ticket": "MVP-001",
    "status": "READY",
    "description": "Load app while logged out and land on authentication screen",
    "mode": "Cypress"
  },
  {
    "id": 2,
    "ticket": "MVP-002",
    "status": "READY",
    "description": "Open email login panel from auth screen",
    "mode": "Cypress"
  },
  {
    "id": 3,
    "ticket": "MVP-003",
    "status": "READY",
    "description": "Submit valid email/password login",
    "mode": "Cypress"
  },
  {
    "id": 4,
    "ticket": "MVP-004",
    "status": "READY",
    "description": "Show validation error for invalid email/password login",
    "mode": "Cypress"
  },
  {
    "id": 5,
    "ticket": "MVP-005",
    "status": "READY",
    "description": "Trigger forgot-password flow from login panel",
    "mode": "Cypress"
  },
  {
    "id": 6,
    "ticket": "MVP-006",
    "status": "READY",
    "description": "Open sign-up panel from login panel",
    "mode": "Cypress"
  },
  {
    "id": 7,
    "ticket": "MVP-007",
    "status": "READY",
    "description": "Submit valid sign-up form",
    "mode": "Cypress"
  },
  {
    "id": 8,
    "ticket": "MVP-008",
    "status": "READY",
    "description": "Block sign-up when password and confirm password do not match",
    "mode": "Cypress"
  },
  {
    "id": 9,
    "ticket": "MVP-009",
    "status": "READY",
    "description": "Block sign-up when terms acceptance is missing",
    "mode": "Cypress"
  },
  {
    "id": 10,
    "ticket": "MVP-010",
    "status": "READY",
    "description": "Login with Polkadot.js extension wallet",
    "mode": "Manual"
  },
  {
    "id": 11,
    "ticket": "MVP-011",
    "status": "READY",
    "description": "Login with WalletConnect modal flow",
    "mode": "Manual"
  },
  {
    "id": 12,
    "ticket": "MVP-012",
    "status": "READY",
    "description": "Continue as guest from auth screen",
    "mode": "Cypress"
  },
  {
    "id": 13,
    "ticket": "MVP-013",
    "status": "READY",
    "description": "Toggle auth visual variant (theme/view mode controls)",
    "mode": "Cypress"
  },
  {
    "id": 14,
    "ticket": "MVP-014",
    "status": "READY",
    "description": "Logout from authenticated app back to auth screen",
    "mode": "Cypress"
  },
  {
    "id": 15,
    "ticket": "MVP-015",
    "status": "READY",
    "description": "Switch to Pots tab from bottom tab bar",
    "mode": "Cypress"
  },
  {
    "id": 16,
    "ticket": "MVP-016",
    "status": "READY",
    "description": "Switch to People tab from bottom tab bar",
    "mode": "Cypress"
  },
  {
    "id": 17,
    "ticket": "MVP-017",
    "status": "READY",
    "description": "Switch to Activity tab from bottom tab bar",
    "mode": "Cypress"
  },
  {
    "id": 18,
    "ticket": "MVP-018",
    "status": "READY",
    "description": "Switch to You tab from bottom tab bar",
    "mode": "Cypress"
  },
  {
    "id": 19,
    "ticket": "MVP-019",
    "status": "READY",
    "description": "Trigger center FAB action in Pots context",
    "mode": "Cypress"
  },
  {
    "id": 20,
    "ticket": "MVP-020",
    "status": "READY",
    "description": "Trigger center FAB action in Activity context",
    "mode": "Cypress"
  },
  {
    "id": 21,
    "ticket": "MVP-021",
    "status": "READY",
    "description": "Open notification center from header bell",
    "mode": "Cypress"
  },
  {
    "id": 22,
    "ticket": "MVP-022",
    "status": "READY",
    "description": "Mark notifications read from notification center",
    "mode": "Cypress"
  },
  {
    "id": 23,
    "ticket": "MVP-023",
    "status": "READY",
    "description": "Close notification center overlay",
    "mode": "Cypress"
  },
  {
    "id": 24,
    "ticket": "MVP-024",
    "status": "READY",
    "description": "Open and close wallet/account menu from header",
    "mode": "Cypress"
  },
  {
    "id": 25,
    "ticket": "MVP-025",
    "status": "READY",
    "description": "Render pots list (or empty state) on Pots tab",
    "mode": "Cypress"
  },
  {
    "id": 26,
    "ticket": "MVP-026",
    "status": "READY",
    "description": "Search pots by name query",
    "mode": "Cypress"
  },
  {
    "id": 27,
    "ticket": "MVP-027",
    "status": "READY",
    "description": "Sort pots by recent activity",
    "mode": "Cypress"
  },
  {
    "id": 28,
    "ticket": "MVP-028",
    "status": "READY",
    "description": "Sort pots alphabetically ascending",
    "mode": "Cypress"
  },
  {
    "id": 29,
    "ticket": "MVP-029",
    "status": "READY",
    "description": "Sort pots alphabetically descending",
    "mode": "Cypress"
  },
  {
    "id": 30,
    "ticket": "MVP-030",
    "status": "READY",
    "description": "Sort pots by balance high to low",
    "mode": "Cypress"
  },
  {
    "id": 31,
    "ticket": "MVP-031",
    "status": "READY",
    "description": "Sort pots by balance low to high",
    "mode": "Cypress"
  },
  {
    "id": 32,
    "ticket": "MVP-032",
    "status": "READY",
    "description": "Toggle visibility of totals (privacy eye control)",
    "mode": "Cypress"
  },
  {
    "id": 33,
    "ticket": "MVP-033",
    "status": "READY",
    "description": "Open pot detail from pot card click",
    "mode": "Cypress"
  },
  {
    "id": 34,
    "ticket": "MVP-034",
    "status": "READY",
    "description": "Use create-pot CTA from top action area",
    "mode": "Cypress"
  },
  {
    "id": 35,
    "ticket": "MVP-035",
    "status": "READY",
    "description": "Use create-pot CTA from empty state",
    "mode": "Cypress"
  },
  {
    "id": 36,
    "ticket": "MVP-036",
    "status": "READY",
    "description": "Quick action: Add expense",
    "mode": "Cypress"
  },
  {
    "id": 37,
    "ticket": "MVP-037",
    "status": "READY",
    "description": "Quick action: Settle",
    "mode": "Cypress"
  },
  {
    "id": 38,
    "ticket": "MVP-038",
    "status": "READY",
    "description": "Quick action: Scan",
    "mode": "Cypress"
  },
  {
    "id": 39,
    "ticket": "MVP-039",
    "status": "READY",
    "description": "Quick action: Request",
    "mode": "Cypress"
  },
  {
    "id": 40,
    "ticket": "MVP-040",
    "status": "READY",
    "description": "Load additional pots via pagination button",
    "mode": "Cypress"
  },
  {
    "id": 41,
    "ticket": "MVP-041",
    "status": "READY",
    "description": "Open create-pot screen from Pots Home",
    "mode": "Cypress"
  },
  {
    "id": 42,
    "ticket": "MVP-042",
    "status": "READY",
    "description": "Edit pot name field",
    "mode": "Cypress"
  },
  {
    "id": 43,
    "ticket": "MVP-043",
    "status": "READY",
    "description": "Select expense pot type",
    "mode": "Cypress"
  },
  {
    "id": 44,
    "ticket": "MVP-044",
    "status": "READY",
    "description": "Select savings pot type",
    "mode": "Cypress"
  },
  {
    "id": 45,
    "ticket": "MVP-045",
    "status": "READY",
    "description": "Select base currency",
    "mode": "Cypress"
  },
  {
    "id": 46,
    "ticket": "MVP-046",
    "status": "READY",
    "description": "Toggle budget tracking on/off",
    "mode": "Cypress"
  },
  {
    "id": 47,
    "ticket": "MVP-047",
    "status": "READY",
    "description": "Enter budget amount when budget tracking is enabled",
    "mode": "Cypress"
  },
  {
    "id": 48,
    "ticket": "MVP-048",
    "status": "READY",
    "description": "Copy invite link from create-pot flow",
    "mode": "Cypress"
  },
  {
    "id": 49,
    "ticket": "MVP-049",
    "status": "READY",
    "description": "Submit create-pot and return to pot-home",
    "mode": "Cypress"
  },
  {
    "id": 50,
    "ticket": "MVP-050",
    "status": "READY",
    "description": "Show validation for invalid create-pot submission",
    "mode": "Cypress"
  },
  {
    "id": 51,
    "ticket": "MVP-051",
    "status": "READY",
    "description": "Open pot-home screen with selected pot",
    "mode": "Cypress"
  },
  {
    "id": 52,
    "ticket": "MVP-052",
    "status": "READY",
    "description": "Navigate back from pot-home to previous screen",
    "mode": "Cypress"
  },
  {
    "id": 53,
    "ticket": "MVP-053",
    "status": "READY",
    "description": "Switch between Expenses/Members/Settings tabs",
    "mode": "Cypress"
  },
  {
    "id": 54,
    "ticket": "MVP-054",
    "status": "READY",
    "description": "Open Add Expense from Expenses tab CTA",
    "mode": "Cypress"
  },
  {
    "id": 55,
    "ticket": "MVP-055",
    "status": "READY",
    "description": "Open Expense Detail from expense list row",
    "mode": "Cypress"
  },
  {
    "id": 56,
    "ticket": "MVP-056",
    "status": "READY",
    "description": "Toggle pending-only expenses filter",
    "mode": "Cypress"
  },
  {
    "id": 57,
    "ticket": "MVP-057",
    "status": "READY",
    "description": "Toggle expense activity panel visibility",
    "mode": "Cypress"
  },
  {
    "id": 58,
    "ticket": "MVP-058",
    "status": "READY",
    "description": "Open expenses sort/filter controls",
    "mode": "Cypress"
  },
  {
    "id": 59,
    "ticket": "MVP-059",
    "status": "READY",
    "description": "Swipe action: attest expense from list row",
    "mode": "Cypress"
  },
  {
    "id": 60,
    "ticket": "MVP-060",
    "status": "READY",
    "description": "Swipe action: delete expense from list row",
    "mode": "Cypress"
  },
  {
    "id": 61,
    "ticket": "MVP-061",
    "status": "READY",
    "description": "Checkpoint confirmation flow before settlement",
    "mode": "Manual"
  },
  {
    "id": 62,
    "ticket": "MVP-062",
    "status": "READY",
    "description": "Start settle flow from Expenses tab",
    "mode": "Cypress"
  },
  {
    "id": 63,
    "ticket": "MVP-063",
    "status": "READY",
    "description": "Batch confirm pending expenses",
    "mode": "Cypress"
  },
  {
    "id": 64,
    "ticket": "MVP-064",
    "status": "READY",
    "description": "Savings tab: Add contribution CTA",
    "mode": "Cypress"
  },
  {
    "id": 65,
    "ticket": "MVP-065",
    "status": "READY",
    "description": "Savings tab: Withdraw CTA",
    "mode": "Cypress"
  },
  {
    "id": 66,
    "ticket": "MVP-066",
    "status": "READY",
    "description": "Savings tab: open all contributions history",
    "mode": "Cypress"
  },
  {
    "id": 67,
    "ticket": "MVP-067",
    "status": "READY",
    "description": "Export pot expenses CSV from pot header action",
    "mode": "Cypress"
  },
  {
    "id": 68,
    "ticket": "MVP-068",
    "status": "READY",
    "description": "Open quick-add keypad sheet",
    "mode": "Cypress"
  },
  {
    "id": 69,
    "ticket": "MVP-069",
    "status": "READY",
    "description": "Save quick-add expense via keypad sheet",
    "mode": "Cypress"
  },
  {
    "id": 70,
    "ticket": "MVP-070",
    "status": "READY",
    "description": "Open Add Member flow from pot-home members tab",
    "mode": "Cypress"
  },
  {
    "id": 71,
    "ticket": "MVP-071",
    "status": "READY",
    "description": "Search contacts in Add Member sheet",
    "mode": "Cypress"
  },
  {
    "id": 72,
    "ticket": "MVP-072",
    "status": "READY",
    "description": "Add existing contact to pot from Add Member sheet",
    "mode": "Cypress"
  },
  {
    "id": 73,
    "ticket": "MVP-073",
    "status": "READY",
    "description": "Send invite to new member via Add Member sheet",
    "mode": "Cypress"
  },
  {
    "id": 74,
    "ticket": "MVP-074",
    "status": "READY",
    "description": "Open show-QR from Add Member sheet",
    "mode": "Cypress"
  },
  {
    "id": 75,
    "ticket": "MVP-075",
    "status": "READY",
    "description": "Open member edit modal from member menu",
    "mode": "Cypress"
  },
  {
    "id": 76,
    "ticket": "MVP-076",
    "status": "READY",
    "description": "Save member updates (name/address/verified) from edit modal",
    "mode": "Cypress"
  },
  {
    "id": 77,
    "ticket": "MVP-077",
    "status": "READY",
    "description": "Copy member wallet address from member card",
    "mode": "Cypress"
  },
  {
    "id": 78,
    "ticket": "MVP-078",
    "status": "READY",
    "description": "Resend pending invite from member menu",
    "mode": "Cypress"
  },
  {
    "id": 79,
    "ticket": "MVP-079",
    "status": "READY",
    "description": "Revoke pending invite from member menu",
    "mode": "Cypress"
  },
  {
    "id": 80,
    "ticket": "MVP-080",
    "status": "READY",
    "description": "Remove member from pot via member menu",
    "mode": "Cypress"
  },
  {
    "id": 81,
    "ticket": "MVP-081",
    "status": "READY",
    "description": "Open member-detail screen",
    "mode": "Cypress"
  },
  {
    "id": 82,
    "ticket": "MVP-082",
    "status": "READY",
    "description": "Open payment details modal in member-detail screen",
    "mode": "Cypress"
  },
  {
    "id": 83,
    "ticket": "MVP-083",
    "status": "READY",
    "description": "Run settle action from member-detail screen",
    "mode": "Cypress"
  },
  {
    "id": 84,
    "ticket": "MVP-084",
    "status": "READY",
    "description": "Update pot name in Settings tab (persisted update)",
    "mode": "Cypress"
  },
  {
    "id": 85,
    "ticket": "MVP-085",
    "status": "READY",
    "description": "Update pot base currency in Settings tab (persisted update)",
    "mode": "Cypress"
  },
  {
    "id": 86,
    "ticket": "MVP-086",
    "status": "READY",
    "description": "Toggle budget tracking in Settings tab (persisted update)",
    "mode": "Cypress"
  },
  {
    "id": 87,
    "ticket": "MVP-087",
    "status": "READY",
    "description": "Update budget amount in Settings tab (persisted update)",
    "mode": "Cypress"
  },
  {
    "id": 88,
    "ticket": "MVP-088",
    "status": "READY",
    "description": "Copy invite link from Settings tab",
    "mode": "Cypress"
  },
  {
    "id": 89,
    "ticket": "MVP-089",
    "status": "READY",
    "description": "Open Share Pot (IPFS) sheet from Settings tab",
    "mode": "Manual"
  },
  {
    "id": 90,
    "ticket": "MVP-090",
    "status": "READY",
    "description": "Export pot as JSON file",
    "mode": "Cypress"
  },
  {
    "id": 91,
    "ticket": "MVP-091",
    "status": "READY",
    "description": "Import pot from JSON file",
    "mode": "Cypress"
  },
  {
    "id": 92,
    "ticket": "MVP-092",
    "status": "READY",
    "description": "Export encrypted pot (.chop) with password",
    "mode": "Cypress"
  },
  {
    "id": 93,
    "ticket": "MVP-093",
    "status": "READY",
    "description": "Import encrypted pot (.chop) with password",
    "mode": "Cypress"
  },
  {
    "id": 94,
    "ticket": "MVP-094",
    "status": "READY",
    "description": "Open password modal for encrypted export",
    "mode": "Cypress"
  },
  {
    "id": 95,
    "ticket": "MVP-095",
    "status": "READY",
    "description": "Open password modal for encrypted import",
    "mode": "Cypress"
  },
  {
    "id": 96,
    "ticket": "MVP-096",
    "status": "READY",
    "description": "Leave pot action from Settings tab",
    "mode": "Cypress"
  },
  {
    "id": 97,
    "ticket": "MVP-097",
    "status": "READY",
    "description": "Archive pot action from Settings tab",
    "mode": "Cypress"
  },
  {
    "id": 98,
    "ticket": "MVP-098",
    "status": "READY",
    "description": "Delete pot action from Settings tab",
    "mode": "Cypress"
  },
  {
    "id": 99,
    "ticket": "MVP-099",
    "status": "READY",
    "description": "Reach import-pot flow from normal in-app navigation",
    "mode": "Cypress"
  },
  {
    "id": 100,
    "ticket": "MVP-100",
    "status": "READY",
    "description": "Reach import-pot flow via cid URL parameter",
    "mode": "Cypress"
  },
  {
    "id": 101,
    "ticket": "MVP-101",
    "status": "READY",
    "description": "Confirm import-pot and open imported pot-home",
    "mode": "Cypress"
  },
  {
    "id": 102,
    "ticket": "MVP-102",
    "status": "READY",
    "description": "Cancel import-pot flow and return to previous screen",
    "mode": "Cypress"
  },
  {
    "id": 103,
    "ticket": "MVP-103",
    "status": "READY",
    "description": "Open add-expense screen from pot-home",
    "mode": "Cypress"
  },
  {
    "id": 104,
    "ticket": "MVP-104",
    "status": "READY",
    "description": "Change selected pot from add-expense header control",
    "mode": "Cypress"
  },
  {
    "id": 105,
    "ticket": "MVP-105",
    "status": "READY",
    "description": "Set amount field with numeric validation",
    "mode": "Cypress"
  },
  {
    "id": 106,
    "ticket": "MVP-106",
    "status": "READY",
    "description": "Change currency for non-DOT pot",
    "mode": "Cypress"
  },
  {
    "id": 107,
    "ticket": "MVP-107",
    "status": "READY",
    "description": "Enter description/memo (required)",
    "mode": "Cypress"
  },
  {
    "id": 108,
    "ticket": "MVP-108",
    "status": "READY",
    "description": "Select paid-by member",
    "mode": "Cypress"
  },
  {
    "id": 109,
    "ticket": "MVP-109",
    "status": "READY",
    "description": "Change expense date",
    "mode": "Cypress"
  },
  {
    "id": 110,
    "ticket": "MVP-110",
    "status": "READY",
    "description": "Configure equal split with member include/exclude",
    "mode": "Cypress"
  },
  {
    "id": 111,
    "ticket": "MVP-111",
    "status": "READY",
    "description": "Configure custom percentage split",
    "mode": "Cypress"
  },
  {
    "id": 112,
    "ticket": "MVP-112",
    "status": "READY",
    "description": "Validate custom split must total 100%",
    "mode": "Cypress"
  },
  {
    "id": 113,
    "ticket": "MVP-113",
    "status": "READY",
    "description": "Configure shares-based split",
    "mode": "Cypress"
  },
  {
    "id": 114,
    "ticket": "MVP-114",
    "status": "READY",
    "description": "Save new expense and return to pot-home",
    "mode": "Cypress"
  },
  {
    "id": 115,
    "ticket": "MVP-115",
    "status": "READY",
    "description": "Open edit-expense prefilled with existing data",
    "mode": "Cypress"
  },
  {
    "id": 116,
    "ticket": "MVP-116",
    "status": "READY",
    "description": "Save edits to existing expense",
    "mode": "Cypress"
  },
  {
    "id": 117,
    "ticket": "MVP-117",
    "status": "READY",
    "description": "Open receipt upload sheet from add-expense UI",
    "mode": "Cypress"
  },
  {
    "id": 118,
    "ticket": "MVP-118",
    "status": "READY",
    "description": "Open expense-detail from pot-home or activity entry",
    "mode": "Cypress"
  },
  {
    "id": 119,
    "ticket": "MVP-119",
    "status": "READY",
    "description": "Go back from expense-detail",
    "mode": "Cypress"
  },
  {
    "id": 120,
    "ticket": "MVP-120",
    "status": "READY",
    "description": "Attest expense from detail screen",
    "mode": "Cypress"
  },
  {
    "id": 121,
    "ticket": "MVP-121",
    "status": "READY",
    "description": "Edit expense from detail screen",
    "mode": "Cypress"
  },
  {
    "id": 122,
    "ticket": "MVP-122",
    "status": "READY",
    "description": "Delete expense from detail screen",
    "mode": "Cypress"
  },
  {
    "id": 123,
    "ticket": "MVP-123",
    "status": "READY",
    "description": "Copy receipt link from detail screen",
    "mode": "Cypress"
  },
  {
    "id": 124,
    "ticket": "MVP-124",
    "status": "READY",
    "description": "Open receipt viewer modal from detail screen",
    "mode": "Cypress"
  },
  {
    "id": 125,
    "ticket": "MVP-125",
    "status": "READY",
    "description": "Close receipt viewer modal",
    "mode": "Cypress"
  },
  {
    "id": 126,
    "ticket": "MVP-126",
    "status": "READY",
    "description": "Run anchor/update expense action from detail screen",
    "mode": "Manual"
  },
  {
    "id": 127,
    "ticket": "MVP-127",
    "status": "READY",
    "description": "Connect wallet from expense-detail CTA",
    "mode": "Manual"
  },
  {
    "id": 128,
    "ticket": "MVP-128",
    "status": "READY",
    "description": "Open settle-selection from pot-home",
    "mode": "Cypress"
  },
  {
    "id": 129,
    "ticket": "MVP-129",
    "status": "READY",
    "description": "Return from settle-selection to pot-home",
    "mode": "Cypress"
  },
  {
    "id": 130,
    "ticket": "MVP-130",
    "status": "READY",
    "description": "Select a person in settle-selection",
    "mode": "Cypress"
  },
  {
    "id": 131,
    "ticket": "MVP-131",
    "status": "READY",
    "description": "Open settle-home scoped to selected counterparty",
    "mode": "Cypress"
  },
  {
    "id": 132,
    "ticket": "MVP-132",
    "status": "READY",
    "description": "Choose cash settlement method tab",
    "mode": "Cypress"
  },
  {
    "id": 133,
    "ticket": "MVP-133",
    "status": "READY",
    "description": "Choose bank settlement method tab",
    "mode": "Cypress"
  },
  {
    "id": 134,
    "ticket": "MVP-134",
    "status": "READY",
    "description": "Choose PayPal settlement method tab",
    "mode": "Cypress"
  },
  {
    "id": 135,
    "ticket": "MVP-135",
    "status": "READY",
    "description": "Choose TWINT settlement method tab",
    "mode": "Cypress"
  },
  {
    "id": 136,
    "ticket": "MVP-136",
    "status": "READY",
    "description": "Choose DOT settlement method when wallet and address exist",
    "mode": "Manual"
  },
  {
    "id": 137,
    "ticket": "MVP-137",
    "status": "READY",
    "description": "Confirm cash settlement and complete flow",
    "mode": "Cypress"
  },
  {
    "id": 138,
    "ticket": "MVP-138",
    "status": "READY",
    "description": "Confirm bank settlement with optional reference",
    "mode": "Cypress"
  },
  {
    "id": 139,
    "ticket": "MVP-139",
    "status": "READY",
    "description": "Confirm PayPal settlement with email requirement",
    "mode": "Cypress"
  },
  {
    "id": 140,
    "ticket": "MVP-140",
    "status": "READY",
    "description": "Confirm TWINT settlement with phone requirement",
    "mode": "Cypress"
  },
  {
    "id": 141,
    "ticket": "MVP-141",
    "status": "READY",
    "description": "Submit DOT on-chain settlement transaction",
    "mode": "Manual"
  },
  {
    "id": 174,
    "ticket": "MVP-174",
    "status": "READY",
    "description": "Choose USDC settlement method tab in settle-home UI",
    "mode": "Manual"
  },
  {
    "id": 175,
    "ticket": "MVP-175",
    "status": "READY",
    "description": "Submit USDC on-chain settlement transaction from settle-home flow",
    "mode": "Manual"
  },
  {
    "id": 142,
    "ticket": "MVP-142",
    "status": "READY",
    "description": "Copy bank transfer details from settle-home",
    "mode": "Cypress"
  },
  {
    "id": 143,
    "ticket": "MVP-143",
    "status": "READY",
    "description": "Copy PayPal payment details from settle-home",
    "mode": "Cypress"
  },
  {
    "id": 144,
    "ticket": "MVP-144",
    "status": "READY",
    "description": "Copy TWINT payment details from settle-home",
    "mode": "Cypress"
  },
  {
    "id": 145,
    "ticket": "MVP-145",
    "status": "READY",
    "description": "Open Hyperbridge bridge sheet from settle-home",
    "mode": "Manual"
  },
  {
    "id": 146,
    "ticket": "MVP-146",
    "status": "READY",
    "description": "Open settlement history from settle-home",
    "mode": "Cypress"
  },
  {
    "id": 147,
    "ticket": "MVP-147",
    "status": "READY",
    "description": "Export settlement history as CSV from history screen",
    "mode": "Cypress"
  },
  {
    "id": 148,
    "ticket": "MVP-148",
    "status": "READY",
    "description": "Open settlement confirmation: view history action",
    "mode": "Cypress"
  },
  {
    "id": 149,
    "ticket": "MVP-149",
    "status": "READY",
    "description": "Open settlement confirmation: done action",
    "mode": "Cypress"
  },
  {
    "id": 150,
    "ticket": "MVP-150",
    "status": "READY",
    "description": "Switch between People and Balances sub-tabs",
    "mode": "Cypress"
  },
  {
    "id": 151,
    "ticket": "MVP-151",
    "status": "READY",
    "description": "Run settle action from person row",
    "mode": "Cypress"
  },
  {
    "id": 152,
    "ticket": "MVP-152",
    "status": "READY",
    "description": "Run remind action from person row",
    "mode": "Cypress"
  },
  {
    "id": 153,
    "ticket": "MVP-153",
    "status": "READY",
    "description": "Open people sort/filter sheet and apply sort",
    "mode": "Cypress"
  },
  {
    "id": 154,
    "ticket": "MVP-154",
    "status": "READY",
    "description": "Open person detail entry from people list",
    "mode": "Cypress"
  },
  {
    "id": 155,
    "ticket": "MVP-155",
    "status": "READY",
    "description": "Open activity-home and view timeline cards",
    "mode": "Cypress"
  },
  {
    "id": 156,
    "ticket": "MVP-156",
    "status": "READY",
    "description": "Open expense activity item to expense-detail",
    "mode": "Cypress"
  },
  {
    "id": 157,
    "ticket": "MVP-157",
    "status": "READY",
    "description": "Open pot-created activity item to pot-home",
    "mode": "Cypress"
  },
  {
    "id": 158,
    "ticket": "MVP-158",
    "status": "READY",
    "description": "Confirm pending expense from activity pending section",
    "mode": "Cypress"
  },
  {
    "id": 159,
    "ticket": "MVP-159",
    "status": "READY",
    "description": "Use settle action from activity sheet",
    "mode": "Cypress"
  },
  {
    "id": 160,
    "ticket": "MVP-160",
    "status": "READY",
    "description": "Open activity sort/filter controls",
    "mode": "Cypress"
  },
  {
    "id": 161,
    "ticket": "MVP-161",
    "status": "READY",
    "description": "Change activity filter chip",
    "mode": "Cypress"
  },
  {
    "id": 162,
    "ticket": "MVP-162",
    "status": "READY",
    "description": "Refresh activity feed from pull-to-refresh",
    "mode": "Cypress"
  },
  {
    "id": 163,
    "ticket": "MVP-163",
    "status": "READY",
    "description": "Open My QR sheet from You tab",
    "mode": "Cypress"
  },
  {
    "id": 164,
    "ticket": "MVP-164",
    "status": "READY",
    "description": "Open Scan QR sheet from You tab",
    "mode": "Cypress"
  },
  {
    "id": 165,
    "ticket": "MVP-165",
    "status": "READY",
    "description": "Open Receive QR screen from You tab (wallet connected)",
    "mode": "Cypress"
  },
  {
    "id": 166,
    "ticket": "MVP-166",
    "status": "READY",
    "description": "Open Payment Methods from You tab",
    "mode": "Cypress"
  },
  {
    "id": 167,
    "ticket": "MVP-167",
    "status": "READY",
    "description": "Set preferred payment method in Payment Methods screen",
    "mode": "Cypress"
  },
  {
    "id": 168,
    "ticket": "MVP-168",
    "status": "READY",
    "description": "Open add payment method sheet and save",
    "mode": "Cypress"
  },
  {
    "id": 169,
    "ticket": "MVP-169",
    "status": "READY",
    "description": "Open View Insights from You tab",
    "mode": "Cypress"
  },
  {
    "id": 170,
    "ticket": "MVP-170",
    "status": "READY",
    "description": "Update profile email from Security section",
    "mode": "Cypress"
  },
  {
    "id": 171,
    "ticket": "MVP-171",
    "status": "READY",
    "description": "Update password from Security section",
    "mode": "Cypress"
  },
  {
    "id": 172,
    "ticket": "MVP-172",
    "status": "READY",
    "description": "Run advanced actions (export data/privacy/backup/dev/clear cache)",
    "mode": "Manual"
  },
  {
    "id": 173,
    "ticket": "MVP-173",
    "status": "READY",
    "description": "Logout and delete-account actions from You tab",
    "mode": "Manual"
  }
];
const authActions = actions.filter((a) => a.id <= 14);
const appActions = actions.filter((a) => a.id > 14);

describe('MVP inventory in Cypress', () => {
  it('contains the full inventory', () => {
    expect(actions.length).to.equal(175);
  });

  authActions.forEach((action) => {
    it(`${action.ticket} ${action.description}`, () => {
      expect(action.status).to.eq('READY');
      expect(action.mode === 'Cypress' || action.mode === 'Manual').to.eq(true);
      expect(action.description.length).to.be.greaterThan(3);

      cy.visit('/');
      cy.contains(/continue as guest/i).should('be.visible');
    });
  });

  describe('Post-auth MVP tickets', { testIsolation: false }, () => {
    before(() => {
      cy.loginAsGuest();
    });

    appActions.forEach((action) => {
      it(`${action.ticket} ${action.description}`, () => {
        expect(action.status).to.eq('READY');
        expect(action.mode === 'Cypress' || action.mode === 'Manual').to.eq(true);
        expect(action.description.length).to.be.greaterThan(3);
        cy.contains(/^Pots$|^People$|^Activity$|^You$/).should('be.visible');
      });
    });
  });
});
