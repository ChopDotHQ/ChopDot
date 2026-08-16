# Sharing vs Adding Members - User Guide

## Two Different Features

### 1. **Share Pot** (IPFS Link Sharing)
**Button:** "Share invite" icon in the top-right of a pot

**What it does:**
- Creates a **shareable link** to your pot
- Uploads pot data to IPFS (decentralized storage)
- Generates a link like: `http://localhost:5173/import-pot?cid=QmABC123...`

**Who can use it:**
- **Anyone** with the link can import/view the pot
- No account needed
- No invitation acceptance needed

**Use cases:**
- Share pot with friends who don't have the app yet
- Backup your pot data
- Share a read-only copy of expenses
- Export pot data for external use

**Requirements:**
- Wallet must be connected (for IPFS authentication)
- One-time wallet signature (first time only)

**Result:**
- Recipient gets a **copy** of the pot they can import
- They can view expenses, balances, etc.
- They can add it to their own pots list

---

### 2. **Add Member** (Invite to Join)
**Button:** "Add Member" in the Members tab

**What it does:**
- Adds someone as an **active member** of your pot
- They can add expenses, edit, participate
- Invite via email/name or QR code

**Who can use it:**
- People you **invite** to join your pot
- They need to accept/join the invitation

**Use cases:**
- Add collaborators who will actively participate
- Invite friends to add expenses together
- Build a group expense tracking pot

**Requirements:**
- Recipient needs to accept the invitation
- They become a member with permissions

**Result:**
- Recipient becomes a **member** of your pot
- They can add expenses, edit, etc.
- Changes sync across all members

---

## Key Differences

| Feature | Share Pot | Add Member |
|---------|-----------|------------|
| **Purpose** | Share a copy/link | Add active collaborator |
| **Recipient Action** | Import/view | Accept invitation |
| **Permissions** | Read-only copy | Full member access |
| **Data Sync** | Independent copy | Shared pot |
| **Use Case** | Backup, sharing | Collaboration |

---

## When to Use Which?

**Use "Share Pot" when:**
- ✅ You want to share a copy of expenses with someone
- ✅ They don't need to edit/add expenses
- ✅ You want to backup your pot
- ✅ You want to share with someone who doesn't have the app

**Use "Add Member" when:**
- ✅ You want someone to actively participate
- ✅ They need to add expenses
- ✅ You want real-time collaboration
- ✅ You want them to be part of the group

---

## Current UI Confusion

The "Share invite" button name is confusing because:
- It sounds like it's for inviting members
- But it actually creates an IPFS share link
- The "Add Member" feature also mentions "invite"

**Suggested improvements:**
1. Rename "Share invite" → "Share Pot" or "Get Share Link"
2. Keep "Add Member" separate and clear
3. Add tooltips explaining the difference

