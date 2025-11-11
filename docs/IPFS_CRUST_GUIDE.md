# IPFS & Crust Integration Guide

**Last Updated:** January 2025  
**Status:** ✅ Working - Automatic authentication implemented

---

## Overview

ChopDot uses IPFS (via Crust Network) for decentralized storage of pot data, receipts, and backups. Authentication is **automatic** - users sign once, then everything works seamlessly.

---

## How It Works

### For Users (Automatic - No Setup Required!)

1. **User connects wallet** → Wallet address stored
2. **User uploads file/receipt/shares pot** → App automatically:
   - Detects wallet address
   - Signs a message (one-time, cached)
   - Sends signature to backend
   - Backend generates token automatically
   - Upload succeeds ✅

**No manual setup, no `.env` editing, no technical knowledge needed!**

---

## Authentication Flow

### What Users Sign

**Their wallet address** - nothing else.

**Example:**
- Address: `5GbgBKrD6aQXW381kF41xN4RsS4SJGVYdBJKsUTn1Vg4x2SK`
- Message: `5GbgBKrD6aQXW381kF41xN4RsS4SJGVYdBJKsUTn1Vg4x2SK` (same)
- Result: Signature proving ownership

### When They Sign

**First time only** - when they first try to upload anything to IPFS:
- Upload a file (CrustStorage)
- Upload a receipt (Add Expense)
- Share a pot (Share Pot button)
- Auto-backup runs (background)

### User Experience

#### First Upload
1. User uploads file/shares pot
2. **Onboarding modal appears** (if first time):
   - Explains what they'll sign (their address)
   - Explains why (IPFS authentication)
   - Explains it's safe (no transactions, no permissions)
3. User clicks "I Understand, Continue"
4. Wallet prompts: "Sign message: [address]"
5. User approves
6. Upload succeeds ✅
7. Signature cached for future uploads

#### Subsequent Uploads
1. User uploads file/shares pot
2. **No wallet prompt** (uses cached signature)
3. Upload succeeds immediately ✅

---

## Technical Details

### Architecture

```
Client (Browser)
  ↓
Frontend: Detects wallet → Signs message → Caches signature
  ↓
Backend: Receives signature → Generates Crust token → Uploads to IPFS
  ↓
IPFS: Stores file → Returns CID
  ↓
Client: Receives CID → Success ✅
```

### Key Components

**Frontend:**
- `src/services/storage/ipfsAuth.ts` - Signature generation and caching
- `src/services/storage/ipfs.ts` - IPFS upload/download
- `src/components/IPFSAuthOnboarding.tsx` - Onboarding modal
- `src/services/sharing/potShare.ts` - Pot sharing via IPFS

**Backend:**
- `backend/src/utils/crustAuth.ts` - Token generation
- `backend/src/services/ipfs.service.ts` - IPFS upload service

### Endpoints

**Upload:** `https://gw.crustfiles.app/api/v0` (Crust W3Auth Gateway)  
**Read:** `https://ipfs.io` (Public IPFS Gateway, with fallbacks)

---

## Features

### ✅ Automatic Authentication
- Users sign once, works forever
- No manual token generation
- No backend config needed

### ✅ Pot Sharing
- Upload pot snapshot to IPFS
- Generate shareable link: `/import-pot?cid=Qm...`
- Anyone can import via link

### ✅ Auto-Backup
- Pots automatically backed up to IPFS on changes
- Debounced (2 seconds after last change)
- Free (IPFS-only, no Crust pinning costs)

### ✅ Receipt Storage
- Receipts uploaded to IPFS
- Stored with expense data
- Accessible via IPFS gateway

---

## Configuration

### Frontend

No configuration needed - works automatically with wallet connection.

### Backend

**Environment Variables** (optional - for fallback):
```bash
# Crust IPFS API endpoint (for uploads)
CRUST_IPFS_API=https://gw.crustfiles.app/api/v0

# Crust IPFS Gateway (for reading files)
CRUST_IPFS_GATEWAY=https://ipfs.io

# Global token (fallback if no user auth)
CRUST_W3AUTH_TOKEN=<optional-global-token>
```

**Note:** Global token is optional - user-specific tokens are generated automatically.

---

## Security & Privacy

### What the Signature Proves

✅ **You own this wallet address**  
✅ **You authorize IPFS uploads**  
❌ **Does NOT authorize transactions**  
❌ **Does NOT give access to funds**  
❌ **Does NOT give any permissions**

### What Gets Sent to Backend

- Wallet address (public - already known)
- Signature (proof of ownership)
- File/receipt/pot data (what you're uploading)

**Nothing sensitive** - just proof you own the address.

---

## Troubleshooting

### "No wallet connected"
- Connect your Polkadot wallet (Polkadot.js, SubWallet, or Talisman)
- Refresh the page

### "Failed to sign message"
- Check wallet extension is unlocked
- Try disconnecting and reconnecting wallet

### "403 Forbidden" after adding token
- Token format might be incorrect
- Check backend logs for details
- Try regenerating token

### Upload fails
- Check wallet is connected
- Check network connection
- Check backend is running (if using backend proxy)

---

## Known Limitations

### Syncing Issue
**Current Status:** ⚠️ **Not Implemented**

When users share a pot via IPFS link, each person gets a snapshot copy. Changes made by one user don't sync to others automatically.

**Why:** IPFS is immutable (snapshots), and there's no coordination mechanism for updates.

**See:** `TECHNICAL_SYNC_ANALYSIS.md` for detailed analysis and potential solutions.

---

## Related Documentation

- **Technical Sync Analysis:** `TECHNICAL_SYNC_ANALYSIS.md` - Detailed analysis of syncing challenges
- **Implementation Analysis:** `CRUST_IPFS_IMPLEMENTATION_ANALYSIS.md` - Comprehensive code flow analysis
- **Sharing Guide:** `SHARING_VS_ADDING_MEMBERS.md` - User guide for sharing vs adding members

---

## Summary

**Before:** Users had to manually generate tokens and edit backend config  
**After:** Users just connect wallet and upload - it works automatically! 🎉

No more manual setup, no more `.env` editing, no more technical barriers!

