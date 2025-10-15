# Context-Sensitive FAB Implementation

**Date:** October 13, 2025  
**Components Updated:** BottomTabBar.tsx, App.tsx  
**Status:** ✅ COMPLETE

---

## 🎯 **Overview**

Replaced the static center FAB (Floating Action Button) with a **context-sensitive smart button** that:
- ✅ Changes icon, color, and action based on current tab/context
- ✅ Uses lucide-react icons matching quick action button style
- ✅ Hides completely on People/You tabs (not useful there)
- ✅ Semantic colors (orange for expenses, green for confirmations)
- ✅ Super practical one-tap access to most common actions

---

## 📊 **FAB Behavior by Context**

| Current Tab/Screen | FAB Shows | Icon | Color | Action |
|-------------------|-----------|------|-------|--------|
| **Pots tab** | ✅ Visible | `Receipt` | Orange (`--accent-orange`) | Opens Choose Pot → Add Expense |
| **Activity tab** (pending expenses) | ✅ Visible | `CheckCircle` | Green (`--success`) | Batch confirm all pending expenses |
| **Activity tab** (no pending) | ✅ Visible | `Receipt` | Orange (`--accent-orange`) | Opens Choose Pot → Add Expense |
| **People tab** | ❌ HIDDEN | - | - | - |
| **You tab** | ❌ HIDDEN | - | - | - |

---

## 🎨 **Visual Design**

### **Style Matching Quick Actions**

```tsx
// FAB now matches quick action button style from PotsHome
<button
  style={{ 
    background: fabColor,            // Semantic color (orange/green)
    boxShadow: 'var(--shadow-fab)',  // sh-l2 elevation
  }}
  className="w-14 h-14 rounded-full"  // 56px circular
>
  <FabIcon className="w-6 h-6 text-white" strokeWidth={2} />
</button>
```

### **Color Semantics**

```tsx
// Orange = Financial actions (expenses)
fabColor: "var(--accent-orange)"  // #FF9500

// Green = Success/Confirmation actions
fabColor: "var(--success)"        // #19C37D
```

---

## 🔧 **Implementation Details**

### **1. BottomTabBar.tsx Updates**

**Old Props:**
```tsx
interface BottomTabBarProps {
  onAddExpense: () => void;
  fabLabel?: string;  // Pot name label
}
```

**New Props:**
```tsx
interface BottomTabBarProps {
  onFabClick: () => void;
  fabVisible?: boolean;
  fabIcon?: LucideIcon;
  fabColor?: string;
}
```

**Removed:**
- ❌ `SwapArrowsIcon` (was generic)
- ❌ `fabLabel` text under button (was confusing)

**Added:**
- ✅ Dynamic icon from lucide-react
- ✅ Dynamic color based on context
- ✅ Visibility toggle
- ✅ Spacer when hidden (maintains layout)

---

### **2. App.tsx - getFabState() Logic**

**Context-Aware State Function:**

```tsx
const getFabState = useCallback((): {
  visible: boolean;
  icon: LucideIcon;
  color: string;
  action: () => void;
} => {
  const activeTab = getActiveTab();

  // PEOPLE & YOU TABS: Hide completely
  if (activeTab === "people" || activeTab === "you") {
    return { visible: false, ... };
  }

  // ACTIVITY TAB: Smart behavior
  if (activeTab === "activity") {
    if (pendingExpenses.length > 0) {
      // Show "Confirm All" button
      return {
        visible: true,
        icon: CheckCircle,
        color: "var(--success)",
        action: () => batchConfirmAll(),
      };
    } else {
      // Show "Add Expense" button
      return {
        visible: true,
        icon: Receipt,
        color: "var(--accent-orange)",
        action: () => openAddExpense(),
      };
    }
  }

  // POTS TAB: Always "Add Expense"
  if (activeTab === "pots") {
    return {
      visible: true,
      icon: Receipt,
      color: "var(--accent-orange)",
      action: () => openAddExpense(),
    };
  }

  return { visible: false, ... };
}, [activeTab, pendingExpenses, ...]);
```

---

## 🎯 **User Experience Improvements**

### **Before (Static FAB):**
```
❌ Always showed swap arrows icon (unclear meaning)
❌ Label said "SF Roommates" even outside that pot (confusing)
❌ Same action everywhere (opened Choose Pot)
❌ Visible on all tabs (even where not useful)
```

### **After (Context-Sensitive FAB):**
```
✅ Clear icon shows what tapping does (receipt = expense, check = confirm)
✅ No confusing label (icon is self-explanatory)
✅ Smart action per context (most useful action for each screen)
✅ Hidden where not needed (cleaner People/You tabs)
✅ Semantic colors (orange for money, green for confirmation)
```

---

## 💡 **Key Features**

### **1. Batch Confirm All (Activity Tab)**

When pending expenses exist:

```tsx
// FAB becomes "Confirm All" button
icon: CheckCircle
color: var(--success)  // Green

// Action: Batch attest all pending expenses
action: () => {
  // Group by pot
  const groupedByPot = new Map<string, string[]>();
  pendingExpenses.forEach(exp => {
    const pot = pots.find(p => p.expenses.some(e => e.id === exp.id));
    if (pot) {
      groupedByPot.get(pot.id).push(exp.id);
    }
  });

  // Batch attest per pot (single state update)
  groupedByPot.forEach((expenseIds, potId) => {
    setPots(prevPots => /* batch update */);
  });

  showToast(`✓ ${pendingExpenses.length} expenses confirmed`);
}
```

**Benefits:**
- ✅ One tap to confirm all pending (super fast)
- ✅ Clear visual feedback (green button = success action)
- ✅ Prevents self-attestation (filtered correctly)
- ✅ Efficient batch update (no async issues)

---

### **2. Smart Add Expense**

On Pots/Activity tabs:

```tsx
// FAB shows "Add Expense"
icon: Receipt
color: var(--accent-orange)  // Orange

// Action: Context-aware expense creation
action: () => {
  if (pots.length === 0) {
    showToast("Create a pot first!");
    return;
  }
  
  if (pots.length === 1) {
    // Direct to add expense
    setCurrentPotId(pots[0].id);
    push({ type: "add-expense" });
  } else {
    // Show pot chooser
    setShowChoosePot(true);
  }
}
```

**Benefits:**
- ✅ One tap to add expense (most common action)
- ✅ Skips chooser if only one pot (faster)
- ✅ Clear orange color = financial action

---

### **3. Hidden on Irrelevant Tabs**

```tsx
// People tab: Hidden (they tap individual people to settle)
if (activeTab === "people") {
  return { visible: false };
}

// You tab: Hidden (they use dedicated QR/settings buttons)
if (activeTab === "you") {
  return { visible: false };
}
```

**Benefits:**
- ✅ Cleaner UI (no unnecessary button)
- ✅ Clear hierarchy (dedicated actions in those tabs)
- ✅ Maintains layout spacing (spacer when hidden)

---

## 🎨 **Design System Compliance**

### **✅ Matches Quick Action Buttons**

| Element | Quick Actions | FAB | Match? |
|---------|--------------|-----|--------|
| **Icon library** | lucide-react | lucide-react | ✅ |
| **Icon size** | 20px (w-5 h-5) | 24px (w-6 h-6) | ✅ Similar |
| **Icon color** | White | White | ✅ |
| **Background** | Semantic color | Semantic color | ✅ |
| **Shape** | Rounded square | Circle | ✅ Both work |
| **Shadow** | sh-l1 | sh-l2 | ✅ Elevated |

### **Color Semantics**

```css
/* Orange = Financial actions */
--accent-orange: #FF9500
Usage: Add Expense, expenses

/* Green = Success actions */
--success: #19C37D
Usage: Confirm, attestation, positive states
```

---

## 📱 **User Flows**

### **Flow 1: Pots Tab → Add Expense**

```
User on Pots tab
  ↓
Sees orange FAB with receipt icon
  ↓
Taps FAB
  ↓
1 pot? → Direct to Add Expense
Multiple pots? → Choose Pot sheet
```

### **Flow 2: Activity Tab → Confirm All**

```
User on Activity tab
Pending expenses: 3
  ↓
Sees green FAB with checkmark icon
  ↓
Taps FAB
  ↓
All 3 expenses confirmed instantly
Toast: "✓ 3 expenses confirmed"
```

### **Flow 3: People Tab → No FAB**

```
User on People tab
  ↓
FAB hidden (not needed)
  ↓
Clean UI, tap individual people to settle
```

---

## 🔍 **Edge Cases Handled**

### **1. Zero Pots**
```tsx
if (pots.length === 0) {
  showToast("Create a pot first!", "info");
  return;
}
```

### **2. Self-Attestation Prevention**
```tsx
// Filter out expenses you paid for
const validExpenseIds = expenseIds.filter(expenseId => {
  const expense = pot.expenses.find(e => e.id === expenseId);
  return expense && 
         expense.paidBy !== "owner" && 
         !expense.attestations.includes("owner");
});
```

### **3. Already Confirmed**
```tsx
// Skip expenses already confirmed by you
!expense.attestations.includes("owner")
```

### **4. Layout When Hidden**
```tsx
{/* Spacer maintains centered tabs */}
{!fabVisible && <div className="w-14" />}
```

---

## 🎉 **Result**

### **Before:**
```
[Pots] [People] [⚡ SF Roommates] [Activity] [You]
              ↑ confusing label
```

### **After:**
```
On Pots tab:
[Pots] [People] [🧾 Orange] [Activity] [You]
              ↑ clear: add expense

On Activity tab (pending):
[Pots] [People] [✓ Green] [Activity] [You]
              ↑ clear: confirm all

On People tab:
[Pots] [People] [        ] [Activity] [You]
              ↑ hidden
```

---

## ✅ **Checklist**

- [x] FAB shows correct icon per context
- [x] FAB uses semantic colors (orange/green)
- [x] FAB hidden on People/You tabs
- [x] FAB batch confirms all pending on Activity
- [x] FAB adds expense on Pots/Activity (no pending)
- [x] Layout maintains spacing when hidden
- [x] Matches quick action button style
- [x] Proper haptic feedback
- [x] Self-attestation prevention
- [x] Edge cases handled (0 pots, already confirmed)

---

## 🚀 **Why This Is Better**

**Super Practical:**
- ✅ One tap to most common action per screen
- ✅ No extra navigation (direct to action)
- ✅ Clear what it does (icon + color)

**Clean Design:**
- ✅ Matches existing quick actions
- ✅ Semantic colors (orange = money, green = success)
- ✅ Hidden where not useful (cleaner UI)

**Smart Context:**
- ✅ Activity: Confirms or adds based on state
- ✅ Pots: Always adds (most common)
- ✅ People/You: Hidden (not needed)

**The FAB is now a power-user tool that adapts to what you need!** 🎨✨
