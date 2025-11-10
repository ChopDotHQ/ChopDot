# ChopDot 🏺

**Expense splitting and group financial management, powered by Polkadot.**

ChopDot is a mobile-first app that makes splitting expenses with friends, roommates, and travel groups effortless. Built with blockchain trust and DeFi savings built-in.

---

## 👋 First Time Here?

**→ Start with [README_EXPORT.md](./README_EXPORT.md) for setup instructions.**

This file contains general project documentation. For installation, deployment, and getting started, see the export guide first.

---

## 🎯 What Makes ChopDot Different?

| Feature | Splitwise/Tricount | ChopDot |
|---------|-------------------|---------|
| **Savings Pots** | ❌ No | ✅ Earn yield while saving together |
| **Settlement** | Bank transfer only | ✅ Cash, Bank, DOT, USDC |
| **Receipts** | Stored on servers | ✅ IPFS/Arweave (coming soon) |
| **UI/UX** | Cluttered, dated | ✅ Clean iOS design |

---

## 🚀 Quick Start

### Option 1: View in Figma Make (Fastest)
The prototype is currently running in Figma Make for rapid iteration.

1. Open the Figma Make preview
2. Check browser console for debug commands
3. Explore the app (all data is mock/localStorage)

### Option 2: Run Locally (Coming Soon)
```bash
# Clone the repo
git clone https://github.com/your-org/chopdot.git
cd chopdot

# Install dependencies
npm install

# Run development server
npm run dev
```

### Option 3: Run with Backend (Docker)
```bash
# Start PostgreSQL + API
docker-compose up -d

# See SETUP_GUIDE.md for detailed instructions
```

---

## 📱 Core Features

### Expense Management
- **Multi-pot system** - Separate pots for roommates, trips, savings
- **Smart splitting** - Equal, unequal, percentage, custom

### Settlement
- **Multiple methods** - Cash, bank transfer, DOT wallet, TWINT
- **Pot-scoped or global** - Settle per pot or across all groups
- **Settlement history** - Complete payment record with tx hashes
- **Payment requests** - Request payment from people who owe you

### Savings Pots
- **Pool money together** - Group savings with DeFi yield
- **Acala integration** (coming) - Earn interest on pooled funds
- **Goal tracking** - Set savings targets, track progress
- **Transparent yields** - On-chain, verifiable returns

### User Experience
- **Clean iOS design** - Optimized for iPhone 15 (390×844)
- **Dark mode** - System preference + manual toggle
- **Context-sensitive FAB** - Smart floating action button
- **Help & Support** - Comprehensive FAQ (no annoying tutorials)
- **Quick actions** - Scan QR, add expense, request payment

---

## 🏗️ Tech Stack

### Frontend
- **React + TypeScript** - Type-safe component library
- **Tailwind V4** - CSS custom properties, design tokens
- **Motion** - Smooth animations
- **ShadCN/UI** - Accessible component primitives

### Backend (Ready, Not Connected Yet)
- **PostgreSQL** - Relational database
- **REST API** - RESTful endpoints
- **Docker** - Containerized deployment

### Blockchain (UI Complete, Integration Pending)
- **Polkadot** - DOT settlements
- **Acala** - DeFi savings yields
- **IPFS/Arweave** - Decentralized receipt storage

---

## 📚 Documentation

- **[Current State](./docs/CURRENT_STATE.md)** - What works, what's next
- **[Setup Guide](./docs/SETUP_GUIDE.md)** - How to run locally
- **[Database Schema](./docs/DATABASE_SCHEMA.md)** - PostgreSQL tables
- **[Backend API](./docs/BACKEND_API.md)** - API endpoints
- **[Auth System](./docs/AUTH_SYSTEM.md)** - Authentication flow
- **[Implementation Details](./docs/implementation/)** - Feature-specific docs

---

## 🎯 Roadmap

### ✅ Phase 1: Frontend Prototype (DONE)
- [x] Core expense management
- [x] Settlement calculations
- [x] Activity feed
- [x] Help & Support
- [x] Clean iOS design

### 🚧 Phase 2: Backend Integration (In Progress)
- [ ] Connect to PostgreSQL
- [ ] Real user accounts
- [ ] Push notifications
- [ ] Real-time sync

### 🔜 Phase 3: Blockchain Integration (Next)
- [ ] Real Polkadot transactions
- [ ] DOT settlements
- [ ] Wallet signatures

### 🌟 Phase 4: DeFi & Polish (Future)
- [ ] Acala yield integration
- [ ] IPFS receipt storage
- [ ] Multi-currency support
- [ ] iOS native app

---

## 🐛 Debug Commands

The app includes debug helpers for development. Open browser console and try:

```javascript
// Check performance
window.ChopDot.diagnosePerformance()

// View current state
window.ChopDot.showState()

// Check storage size
window.ChopDot.checkStorageSize()

// Archive old expenses (for testing large datasets)
window.ChopDot.archiveOldExpenses()

// Emergency reset (if app freezes)
window.ChopDot.emergencyFix()
window.ChopDot.clearAll()
```

---

## 🤝 Contributing

ChopDot is in active development. We're not accepting external contributions yet, but feel free to:
- Report bugs via GitHub Issues
- Suggest features
- Share feedback

---

## 📄 License

[To be determined]

---

## 🙏 Acknowledgments

- **Polkadot** - Blockchain infrastructure
- **Acala** - DeFi protocol integration
- **Figma Make** - Rapid prototyping platform
- **Tailwind Labs** - CSS framework
- **ShadCN** - UI components

---

## 📞 Contact

Questions? Reach out:
- **Email:** support@chopdot.app
- **Twitter:** [@chopdot](https://twitter.com/chopdot) (coming soon)
- **Discord:** [Join our community](https://discord.gg/chopdot) (coming soon)

---

**Status:** Pre-launch MVP  
**Version:** 0.1.0-alpha  
**Last Updated:** October 14, 2025
