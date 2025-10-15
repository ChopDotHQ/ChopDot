# ChopDot - Current State

**Last Updated:** October 14, 2025

## 🎯 Project Status: Pre-Launch MVP

ChopDot is a mobile-first expense splitting and group financial management app with Polkadot blockchain integration. Currently in **frontend prototype phase** with mock data.

---

## ✅ Completed Features

### Core Functionality
- **Multi-pot system** - Expense pots and savings pots
- **Expense management** - Add, edit, delete, split expenses
- **Settlement calculations** - Pot-scoped and global balances
- **Attestation system** - Expense confirmation workflow
- **Checkpoint system** - Pre-settlement verification (48h auto-confirm)
- **Activity feed** - Unified timeline of all actions
- **People management** - Balance tracking, trust metrics

### User Experience
- **Clean iOS design** - SF Pro typography, 390×844 iPhone 15 optimized
- **Dark mode support** - System preference + manual toggle
- **Context-sensitive FAB** - Smart floating action button
- **Swipeable navigation** - Gesture-based back navigation
- **Bottom tab bar** - 4-tab navigation (Pots, People, Activity, You)
- **Empty states** - Helpful prompts for first-time users
- **Toast notifications** - User feedback for all actions

### Settings & Management
- **Payment methods** - Bank, crypto, PayPal, TWINT
- **Wallet connection** - Polkadot.js, SubWallet, Talisman support (UI only)
- **You tab** - Profile, QR code, insights, settings
- **Help & Support** - Comprehensive FAQ system (NEW!)
- **Export data** - CSV export for expenses
- **Theme controls** - Light/dark/system preference

### Advanced Features
- **Batch confirmations** - Confirm multiple expenses at once
- **Quick actions** - Scan QR, request payment, quick settle
- **Receipt management** - Upload and view receipts
- **Budget tracking** - Per-pot budgets with progress
- **DeFi savings pots** - Mock yield tracking (Acala integration placeholder)
- **Settlement history** - Complete payment record
- **Insights dashboard** - Spending analytics, confirmation rates

### Technical
- **TypeScript** - Full type safety
- **React hooks** - Modern state management
- **Tailwind V4** - CSS custom properties, design tokens
- **LocalStorage persistence** - Non-blocking, chunked loading
- **Performance monitoring** - Debug helpers, timing logs
- **Authentication system** - Email/password + wallet auth (AuthContext)
- **Feature flags** - FeatureFlagsContext for gradual rollout

---

## 🚧 In Progress / Mock Data

### Backend Integration (Not Connected)
- ❌ PostgreSQL database (schema ready, not connected)
- ❌ REST API (documented, not implemented)
- ❌ Real-time sync (mock SyncBanner exists)
- ❌ Push notifications (mock NotificationCenter exists)

### Blockchain Integration (UI Only)
- ❌ Real Polkadot transactions (mock tx hashes)
- ❌ On-chain attestations (mock data)
- ❌ DOT settlements (UI complete, no real transfers)
- ❌ DeFi yield (Acala integration placeholder)
- ❌ Wallet signatures (connection UI only)

### Authentication (Partial)
- ✅ AuthContext provider
- ✅ Login/logout flow
- ✅ Guest mode
- ❌ Real user accounts (localStorage only)
- ❌ Session management
- ❌ Password reset
- ❌ Email verification

---

## 🎯 Ready for Launch (Priority Order)

### P0 - Critical Launch Blockers
1. **Backend API Connection** - Connect to PostgreSQL, real data persistence
2. **Real Polkadot Integration** - Actual DOT transfers, tx signing
3. **Push Notifications** - Attestation requests, settlement reminders
4. **User Authentication** - Real accounts, session management

### P1 - Launch Week
5. **Receipt Management** - IPFS/Arweave storage, camera capture
6. **Friend Discovery** - Contacts integration, deep links
7. **Multi-currency** - Real exchange rates, currency conversion
8. **Settlement notifications** - Payment confirmations

### P2 - Post-Launch (Week 2-4)
9. **Smart features** - Recurring expenses, templates, auto-split
10. **Trust & reputation** - On-chain reputation scores
11. **Advanced DeFi** - Liquid staking, yield optimization
12. **Export & reporting** - PDF reports, tax helpers

---

## 📊 Technical Architecture

### Frontend (Current)
```
React + TypeScript
├── Tailwind V4 (CSS custom properties)
├── Lucide icons
├── ShadCN/UI components
├── Motion animations
└── LocalStorage (temporary)
```

### Backend (Ready, Not Connected)
```
PostgreSQL + REST API
├── Docker setup ✅
├── Database schema ✅
├── API endpoints documented ✅
└── Connection scripts ready ✅
```

### Blockchain (UI Only)
```
Polkadot Integration
├── Wallet connection UI ✅
├── Transaction UI ✅
├── Mock tx hashes ✅
└── Real integration ❌
```

---

## 🔧 Development Environment

### Current Setup
- **Platform:** Figma Make (browser-based React preview)
- **Data:** LocalStorage (non-persistent across sessions)
- **API:** Mock data in App.tsx
- **Wallet:** UI mockups only

### Production Setup (Not Yet)
- **Frontend:** Vercel/Netlify deployment
- **Backend:** Docker containers (PostgreSQL + Node.js API)
- **Blockchain:** Polkadot mainnet/testnet
- **Storage:** IPFS for receipts

---

## 📱 Supported Features by Tab

### Pots Tab
- ✅ Create expense/savings pots
- ✅ View pot summaries
- ✅ Budget tracking
- ✅ Quick actions (add expense, settle, scan, request)
- ✅ Balance overview (owed/owing)

### People Tab
- ✅ View all balances
- ✅ Settlement history
- ✅ Trust scores
- ✅ Payment preferences
- ✅ Member details

### Activity Tab
- ✅ Unified timeline
- ✅ Pending attestations
- ✅ Batch confirmations
- ✅ Balance summary
- ✅ Context-sensitive FAB (confirm all / add expense)

### You Tab
- ✅ Profile & QR code
- ✅ Quick insights
- ✅ Payment methods
- ✅ Help & Support (NEW!)
- ✅ Settings & preferences
- ✅ Theme controls
- ✅ Logout

---

## 🐛 Known Issues / Limitations

### Performance
- ✅ **FIXED:** Loading freeze (localStorage now non-blocking)
- ⚠️ Large datasets may slow down (needs pagination)
- ⚠️ No backend = no multi-device sync

### Data Persistence
- ⚠️ LocalStorage only (cleared on browser reset)
- ⚠️ No backup/restore (backend needed)
- ⚠️ No conflict resolution (single device only)

### User Experience
- ⚠️ No offline mode indicators
- ⚠️ No real-time updates (requires websockets)
- ⚠️ Mock transaction statuses

---

## 📈 Next Steps

**Immediate (This Week):**
1. ✅ Help & Support implementation (DONE!)
2. Connect to backend API
3. Implement real Polkadot transactions
4. Set up push notifications

**Short-term (Next 2 Weeks):**
5. User testing & feedback
6. Bug fixes & polish
7. Receipt upload to IPFS
8. Friend invite system

**Long-term (Month 1-2):**
9. Multi-currency support
10. Advanced DeFi features
11. Trust & reputation system
12. iOS native app (React Native port)

---

## 📚 Related Documentation

- [Setup Guide](./SETUP_GUIDE.md) - How to run the project
- [Database Schema](./DATABASE_SCHEMA.md) - PostgreSQL tables
- [Backend API](./BACKEND_API.md) - API endpoints
- [Auth System](./AUTH_SYSTEM.md) - Authentication flow
- [Implementation Details](./implementation/) - Feature-specific docs

---

**Status Summary:**  
✅ Frontend prototype complete  
⚠️ Backend ready but not connected  
❌ Blockchain integration UI-only  
🎯 Ready for real integration & launch prep
