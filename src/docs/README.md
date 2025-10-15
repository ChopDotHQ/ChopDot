# ChopDot Documentation

Welcome to the ChopDot documentation! This is your guide to understanding, setting up, and working with the ChopDot codebase.

---

## 📚 Quick Navigation

### Getting Started
- **[Current State](./CURRENT_STATE.md)** ⭐ - What works now, what's next
- **[Setup Guide](./SETUP_GUIDE.md)** - How to run locally

### Technical Reference
- **[Database Schema](./DATABASE_SCHEMA.md)** - PostgreSQL table structure
- **[Backend API](./BACKEND_API.md)** - REST API endpoints
- **[Auth System](./AUTH_SYSTEM.md)** - Authentication & authorization

### Implementation Details
- **[Feature Implementations](./implementation/)** - How specific features work

### Archive
- **[Migration & Debug History](./archive/)** - Historical notes & fixes

---

## 📖 Documentation Structure

```
docs/
├── README.md                    # This file
├── CURRENT_STATE.md            # Project status
├── SETUP_GUIDE.md              # Local development setup
├── DATABASE_SCHEMA.md          # PostgreSQL schema
├── BACKEND_API.md              # API reference
├── AUTH_SYSTEM.md              # Authentication system
├── implementation/             # Feature-specific docs
│   ├── help-section.md
│   ├── checkpoint-system.md
│   ├── batch-confirm-preview.md
│   ├── context-sensitive-fab.md
│   ├── csv-export.md
│   ├── attestation-detail.md
│   ├── request-payment.md
│   ├── quick-actions.md
│   ├── dot-fee.md
│   ├── pending-mutation-states.md
│   └── web3auth-google-login.md
└── archive/                    # Historical docs
    └── MIGRATION_AND_DEBUG_HISTORY.md
```

---

## 🎯 Documentation by Role

### I'm a Developer
**Start here:**
1. [Current State](./CURRENT_STATE.md) - Understand what's built
2. [Setup Guide](./SETUP_GUIDE.md) - Get the app running
3. [Implementation Docs](./implementation/) - Learn specific features

**Reference:**
- [Database Schema](./DATABASE_SCHEMA.md) - Data structure
- [Backend API](./BACKEND_API.md) - API endpoints
- [Auth System](./AUTH_SYSTEM.md) - How auth works

### I'm a Designer
**Start here:**
1. [Current State](./CURRENT_STATE.md) - See what's implemented
2. `/guidelines/Typography.md` - Typography system
3. `/guidelines/Guidelines.md` - Design principles

### I'm a Product Manager
**Start here:**
1. [Current State](./CURRENT_STATE.md) - Feature status
2. `/README.md` (root) - Roadmap & priorities
3. `/CHANGELOG.md` - Version history

---

## 🔍 Find What You Need

### "How do I..."

**...run the app locally?**  
→ [Setup Guide](./SETUP_GUIDE.md)

**...understand the authentication flow?**  
→ [Auth System](./AUTH_SYSTEM.md)

**...know what's implemented vs. planned?**  
→ [Current State](./CURRENT_STATE.md)

**...understand a specific feature?**  
→ [Implementation Docs](./implementation/)

**...set up the database?**  
→ [Database Schema](./DATABASE_SCHEMA.md)

**...use the API?**  
→ [Backend API](./BACKEND_API.md)

**...debug an issue?**  
→ [Migration & Debug History](./archive/MIGRATION_AND_DEBUG_HISTORY.md)

### "I want to..."

**...add a new feature**  
1. Check [Current State](./CURRENT_STATE.md) for context
2. Review related [Implementation Docs](./implementation/)
3. Follow design system in `/guidelines/`

**...fix a bug**  
1. Check [Debug History](./archive/MIGRATION_AND_DEBUG_HISTORY.md) for common issues
2. Use debug helpers: `window.ChopDot.diagnosePerformance()`
3. Review relevant implementation docs

**...understand the codebase**  
1. Start with [Current State](./CURRENT_STATE.md)
2. Read `/README.md` (root) for high-level overview
3. Explore [Implementation Docs](./implementation/) for specific features

---

## 📝 Implementation Docs

Each feature has detailed documentation in `/docs/implementation/`:

### User Experience
- **[Help Section](./implementation/help-section.md)** - FAQ system
- **[Quick Actions](./implementation/quick-actions.md)** - Bottom sheet shortcuts
- **[Request Payment](./implementation/request-payment.md)** - Payment request flow

### Core Features
- **[Checkpoint System](./implementation/checkpoint-system.md)** - Pre-settlement verification
- **[Batch Confirm](./implementation/batch-confirm-preview.md)** - Multi-expense approval
- **[Attestation Detail](./implementation/attestation-detail.md)** - Expense confirmation UI
- **[Context-Sensitive FAB](./implementation/context-sensitive-fab.md)** - Smart floating button

### Data & Export
- **[CSV Export](./implementation/csv-export.md)** - Data export functionality
- **[Pending Mutation States](./implementation/pending-mutation-states.md)** - Optimistic UI updates

### Blockchain
- **[DOT Fee Calculator](./implementation/dot-fee.md)** - Transaction fee estimation
- **[Web3Auth Google Login](./implementation/web3auth-google-login.md)** - Social login

---

## 🛠️ Development Workflow

### Before You Start
1. Read [Current State](./CURRENT_STATE.md)
2. Check `/CHANGELOG.md` for recent changes
3. Review relevant [Implementation Docs](./implementation/)

### While Developing
- Follow design system in `/guidelines/`
- Use debug helpers: `window.ChopDot.*`
- Check browser console for ChopDot logs

### After Implementing
- Update [Current State](./CURRENT_STATE.md) if needed
- Add implementation doc in `/docs/implementation/`
- Update `/CHANGELOG.md`

---

## 🔗 Quick Links

**Root Documentation:**
- [Main README](../README.md) - Project overview
- [CHANGELOG](../CHANGELOG.md) - Version history
- [Attributions](../Attributions.md) - Credits

**Guidelines:**
- [Design Guidelines](../guidelines/Guidelines.md)
- [Typography System](../guidelines/Typography.md)
- [Quick Reference](../guidelines/QUICK_REFERENCE.md)

**Code:**
- [App.tsx](../App.tsx) - Main application entry point
- [/components](../components/) - React components
- [/utils](../utils/) - Utility functions
- [/contexts](../contexts/) - React contexts

---

## ❓ Need Help?

### Debug Helpers
```javascript
window.ChopDot.diagnosePerformance()  // Performance analysis
window.ChopDot.showState()            // Current app state
window.ChopDot.checkStorageSize()     // localStorage usage
```

### Common Issues
See [Debug History](./archive/MIGRATION_AND_DEBUG_HISTORY.md) for solutions to common problems.

### Contact
- **Email:** support@chopdot.app
- **GitHub Issues:** Report bugs & suggest features

---

**Last Updated:** October 14, 2025  
**Documentation Version:** 1.0
