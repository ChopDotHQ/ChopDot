# Root Cause Analysis - Edits Not Persisting

## Problem

Edits (expenses/members) appear in UI but don't persist to Supabase.

## Root Cause

**App.tsx is using hardcoded pots with string IDs ("1", "2") instead of loading from Supabase.**

### Evidence

1. **App.tsx line 505:** Hardcoded `useState` with pots:
   ```typescript
   const [pots, setPots] = useState<Pot[]>(() => [
     { id: "1", name: "Devconnect Buenos Aires", ... },
     { id: "2", name: "Urbe Campus Rome", ... },
     ...
   ]);
   ```

2. **Supabase has pots with UUIDs:**
   - `1a6b158a-c1a8-44c1-af77-038686f5b74d` - "Devconnect Buenos Aires (Sample)"
   - `1b4e54ca-3221-4966-87af-c6e6b1b3dd69` - "Urbe Campus Rome (Sample)"

3. **When editing:**
   - UI uses pot ID "1" (from hardcoded state)
   - `savePot()` tries to save with ID "1"
   - Supabase doesn't have a pot with ID "1"
   - Save either fails silently or creates a new pot

## Solution

**Option 1: Use `usePots()` hook in App.tsx** (Recommended)
- Replace hardcoded `useState` with `usePots()` hook
- This will load pots from Supabase with correct UUIDs
- Edits will then use the correct pot IDs

**Option 2: Enable `VITE_DL_READS=on`**
- PotsHome already has logic to use `usePots()` when flag is on
- But App.tsx still needs to use data layer for pot operations

**Option 3: Sync pot IDs**
- Map hardcoded pot IDs to Supabase UUIDs
- More complex, not recommended

## Immediate Fix

Replace hardcoded pots in App.tsx with `usePots()` hook:

```typescript
// OLD (line 505):
const [pots, setPots] = useState<Pot[]>(() => [ ... ]);

// NEW:
const { pots: dlPots } = usePots();
const pots = dlPots; // Use data layer pots
```

## Verification

After fix:
1. Pots should load from Supabase with UUIDs
2. Clicking a pot should use UUID (not "1")
3. Edits should save to correct pot in Supabase
4. `last_edit_at` should update in Supabase

