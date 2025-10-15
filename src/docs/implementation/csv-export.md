# CSV Export Implementation

**Date:** October 13, 2025  
**Status:** ✅ Complete

---

## 🎯 Overview

Implemented CSV export functionality for pot expenses, enabling users to download expense data as spreadsheet files for debugging, accounting, reconciliation, and external analysis.

---

## 📁 Files Created

**New Utilities (1 file):**
- ✅ `/utils/export.ts` - CSV generation and download utilities

**Files Updated (1):**
- ✅ `/components/screens/PotHome.tsx` - Added export button to header

---

## 🎨 User Interface

### Export Button Location

**Position:** TopBar right action area (next to pot name)  
**Icon:** Download icon from lucide-react  
**Visibility:** Only shown for expense pots with expenses  
**Style:** Clean iOS button with hover/active states

**Visual:**
```
┌─────────────────────────────────┐
│ ← 🏠 SF Roommates         ⬇️    │  ← Export button
├─────────────────────────────────┤
│ [Expenses] [Members] [Settings] │
│                                 │
│ Expenses list...                │
└─────────────────────────────────┘
```

---

## 📊 CSV Format

### Expense Export Columns

| Column | Description | Example |
|--------|-------------|---------|
| **Date** | Expense date (MM/DD/YYYY) | `10/11/2025` |
| **Memo** | Expense description | `Groceries at Whole Foods` |
| **Amount** | Total expense amount | `120.50` |
| **Currency** | Currency code | `USD` |
| **Paid By** | Who paid ("You" or member name) | `You` or `Alice` |
| **Your Split** | Your share of expense | `40.17` |
| **Confirmed** | Confirmation status | `✓ Yes`, `Pending`, or `2/3` |
| **Receipt** | Receipt attached? | `✓ Yes` or `No` |
| **Attestation Status** | On-chain or off-chain | `On-chain` or `Off-chain` |
| **On-chain Hash** | Blockchain tx hash (truncated) | `0x1234567890...abcdef12` |

### Example CSV Output

```csv
Date,Memo,Amount,Currency,Paid By,Your Split,Confirmed,Receipt,Attestation Status,On-chain Hash
10/11/2025,Groceries at Whole Foods,120.50,USD,You,40.17,2/2,✓ Yes,On-chain,0x1234567890...abcdef12
10/08/2025,Electricity bill,85.00,USD,Alice,28.33,✓ Yes,No,Off-chain,
10/05/2025,Internet bill,45.00,USD,Alice,15.00,Pending,No,Off-chain,
```

---

## 🔧 Implementation Details

### Export Utility (`/utils/export.ts`)

**Main Function:**
```typescript
exportPotExpensesToCSV(
  potName: string,
  expenses: Expense[],
  members: Member[],
  currentUserId: string = "owner"
): void
```

**Features:**
- ✅ Sorts expenses by date (newest first)
- ✅ Formats dates as MM/DD/YYYY
- ✅ Calculates user's split amount
- ✅ Shows confirmation status (✓/Pending/ratio)
- ✅ Includes receipt status
- ✅ Truncates on-chain hashes for readability
- ✅ Escapes commas and quotes in cell data
- ✅ Generates clean filename: `PotName_expenses_YYYY-MM-DD.csv`

**Helper Functions:**
```typescript
// Generate CSV content from data
// Escape special characters in cells
// Create download link
// Trigger browser download
downloadCSV(content: string, filename: string): void
```

**Bonus Function (for future use):**
```typescript
// Export summary of all pots
exportPotsSummaryToCSV(pots: Pot[]): void
```

---

### PotHome Integration

**Import Statements:**
```typescript
import { Download } from "lucide-react";
import { exportPotExpensesToCSV } from "../../utils/export";
import { triggerHaptic } from "../../utils/haptics";
```

**Export Handler:**
```typescript
const handleExportCSV = () => {
  triggerHaptic('light');
  
  if (potType === "expense" && expenses.length > 0) {
    exportPotExpensesToCSV(potName, expenses, members, currentUserId);
    onShowToast?.("✓ Expenses exported to CSV", "success");
  } else if (potType === "expense") {
    onShowToast?.("No expenses to export", "info");
  } else {
    onShowToast?.("CSV export available for expense pots", "info");
  }
};
```

**TopBar Integration:**
```typescript
<TopBar 
  title={potName} 
  onBack={onBack}
  rightAction={
    potType === "expense" && expenses.length > 0 && (
      <button
        onClick={handleExportCSV}
        className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 active:scale-95"
        title="Export to CSV"
      >
        <Download className="w-5 h-5" />
      </button>
    )
  }
/>
```

---

## ✅ Behavior

### When Button is Visible
- ✅ Pot type is "expense" (not savings)
- ✅ Pot has at least 1 expense

### When Button is Hidden
- ❌ Pot is a savings pot
- ❌ Expense pot has no expenses yet

### On Click
1. Haptic feedback (light vibration)
2. Generate CSV from expense data
3. Trigger browser download
4. Show success toast: "✓ Expenses exported to CSV"

### Filename Format
```
SF_Roommates_expenses_2025-10-13.csv
```

**Rules:**
- Pot name sanitized (special chars → underscore)
- Date appended (YYYY-MM-DD format)
- `.csv` extension

---

## 📋 Use Cases

### 1. Debugging & Testing
**Scenario:** Developer needs to inspect expense data  
**Action:** Click export button  
**Result:** CSV opens in Excel/Google Sheets for analysis

### 2. Accounting & Reconciliation
**Scenario:** User needs to reconcile expenses with bank statements  
**Action:** Export expenses, compare with bank transactions  
**Result:** Easy to spot missing or duplicate expenses

### 3. Sharing with Accountant
**Scenario:** User's accountant needs expense breakdown  
**Action:** Export CSV, email to accountant  
**Result:** Accountant imports into their system

### 4. Tax Preparation
**Scenario:** User needs to report business expenses  
**Action:** Export expenses, filter by category  
**Result:** Clean data for tax forms

### 5. Backup & Archive
**Scenario:** User wants to archive pot data before deletion  
**Action:** Export CSV before deleting pot  
**Result:** Permanent record of all expenses

---

## 🎯 Design Decisions

### Why CSV (not JSON/Excel)?
- ✅ **Universal compatibility** - Works with Excel, Google Sheets, Numbers, etc.
- ✅ **Simple format** - Easy to parse and edit
- ✅ **Small file size** - Text-based, compresses well
- ✅ **Human-readable** - Can be opened in text editor
- ✅ **Import-friendly** - Most software accepts CSV

### Why Only Expense Pots?
- ✅ **Clear use case** - Expense tracking needs export most
- ✅ **Simpler implementation** - Expenses have consistent schema
- ⚠️ **Savings pots** - Could be added later if needed (contributions export)

### Why TopBar Button (not Settings)?
- ✅ **Accessibility** - Available on all expense tabs
- ✅ **Discoverability** - Visible icon in header
- ✅ **Efficiency** - One click export (no navigation)
- ✅ **iOS pattern** - Common placement for actions

### Why Truncate Hashes?
- ✅ **Readability** - Full 64-char hash is unwieldy
- ✅ **Identifiable** - First 10 + last 8 chars sufficient
- ✅ **Copyable** - Full hash available in app if needed

---

## 🚀 Testing Checklist

**Basic Functionality:**
- [x] Export button visible on expense pot with expenses
- [x] Export button hidden on savings pot
- [x] Export button hidden on empty expense pot
- [x] Clicking export triggers download
- [x] CSV file downloads with correct filename
- [x] Haptic feedback on click
- [x] Success toast appears

**CSV Content:**
- [x] All expenses included
- [x] Expenses sorted newest first
- [x] Dates formatted correctly (MM/DD/YYYY)
- [x] Amounts formatted with 2 decimals
- [x] "Your Split" calculated correctly
- [x] Confirmation status accurate (✓/Pending/ratio)
- [x] Receipt status shown (Yes/No)
- [x] On-chain hash truncated correctly
- [x] Member names resolved (not IDs)

**Edge Cases:**
- [x] Expense with comma in memo (escaped)
- [x] Expense with quote in memo (escaped)
- [x] User who paid (shows split count, not "Pending")
- [x] Fully confirmed expense (shows "✓ Yes")
- [x] Partially confirmed expense (shows "2/3")
- [x] Unconfirmed expense (shows "Pending")
- [x] On-chain anchored expense (shows hash)
- [x] Off-chain expense (hash column empty)

**File Handling:**
- [x] Filename sanitizes pot name correctly
- [x] Special characters replaced with underscore
- [x] Date appended in correct format
- [x] File extension is .csv
- [x] File opens in Excel/Google Sheets
- [x] Data imports correctly

---

## 🔮 Future Enhancements

### Phase 1: Additional Export Options
**Pot Summary Export:**
```typescript
// Already implemented in export.ts, just needs UI
exportPotsSummaryToCSV(pots: Pot[]): void
```

**UI:** Add "Export All Pots" button in PotsHome header

**Use Case:** Overview of all pots at once

---

### Phase 2: Export Customization
**Date Range Filter:**
```typescript
exportPotExpensesToCSV(
  potName,
  expenses,
  members,
  currentUserId,
  { startDate, endDate } // NEW
)
```

**UI:** Sheet with date pickers before export

**Use Case:** Monthly/quarterly reports

---

### Phase 3: Export Format Options
**Add JSON export:**
```typescript
exportPotExpensesToJSON(potName, expenses, members)
```

**Use Case:** Developer-friendly format for API integration

**Add PDF export:**
```typescript
exportPotExpensesToPDF(potName, expenses, members)
```

**Use Case:** Professional reports for sharing

---

### Phase 4: Savings Pot Export
**Export contributions:**
```typescript
exportPotContributionsToCSV(potName, contributions, members)
```

**Columns:**
- Date, Member, Amount, Method, Tx Hash, Yield Earned

**Use Case:** DeFi yield tracking

---

## 📊 CSV vs Other Formats

| Format | Pros | Cons | Use Case |
|--------|------|------|----------|
| **CSV** | ✅ Universal compatibility<br>✅ Small file size<br>✅ Human-readable | ❌ No formatting<br>❌ Single sheet only | Accounting, import to tools |
| **JSON** | ✅ Structured data<br>✅ Easy to parse<br>✅ Developer-friendly | ❌ Less human-readable<br>❌ Needs code to view | API integration, backups |
| **PDF** | ✅ Professional appearance<br>✅ Print-ready<br>✅ Formatted | ❌ Not editable<br>❌ Larger file size | Sharing with stakeholders |
| **Excel** | ✅ Formatted tables<br>✅ Multiple sheets<br>✅ Formulas | ❌ Requires Excel<br>❌ More complex | Advanced analysis |

**Decision:** CSV is the best v1 choice for maximum utility with minimal complexity.

---

## 💡 Tips for Users

### Opening the CSV
**On Mac:**
- Double-click → Opens in Numbers
- Right-click → Open With → Excel

**On Windows:**
- Double-click → Opens in Excel

**On Mobile:**
- Downloads to Files app
- Tap → Preview or open in Sheets

### Importing to Google Sheets
1. Open Google Sheets
2. File → Import
3. Upload CSV
4. Select "Replace current sheet"
5. ✓ Data imported!

### Filtering by Date Range
1. Open CSV in spreadsheet app
2. Select Date column
3. Apply date filter
4. Export filtered view

### Summing Your Split
1. Open CSV
2. Select "Your Split" column
3. Apply SUM formula
4. See total you need to pay/collect

---

## 🎉 Summary

Successfully implemented CSV export for pot expenses with:
- ✅ Clean TopBar button integration
- ✅ Comprehensive expense data export
- ✅ Smart filename generation
- ✅ Proper CSV escaping
- ✅ Toast feedback
- ✅ Haptic feedback
- ✅ Universal format compatibility

**Result:** Users can now easily export expense data for debugging, accounting, sharing, and archival purposes!

---

**End of Implementation Summary**
