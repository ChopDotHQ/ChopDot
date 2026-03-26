# ChopDot Documentation

Welcome to the ChopDot documentation! This is your guide to understanding, setting up, and working with the ChopDot codebase.

---

## 📚 Quick Navigation

### Getting Started
- **[Setup Guide](./SETUP_GUIDE.md)** - How to run locally
- **[Quick Reference](./QUICK_REFERENCE.md)** - Fast lookup for developers

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
├── SETUP_GUIDE.md              # Local development setup
├── DATABASE_SCHEMA.md          # PostgreSQL schema
├── BACKEND_API.md              # API reference
├── AUTH_SYSTEM.md              # Authentication system
├── QUICK_REFERENCE.md          # Developer quick reference
├── implementation/             # Feature-specific docs
│   ├── help-section.md
│   ├── context-sensitive-fab.md
│   ├── csv-export.md
│   ├── attestation-detail.md
│   ├── request-payment.md
│   ├── quick-actions.md
│   ├── dot-fee.md
│   ├── pending-mutation-states.md
│   └── web3auth-google-login.md
└── archive/                    # Historical docs
    ├── DOCUMENTATION_CLEANUP_SUMMARY.md
    └── MIGRATION_AND_DEBUG_HISTORY.md
```

---

## 🎯 Documentation by Role

### I'm a Developer
**Start here:**
1. [Setup Guide](./SETUP_GUIDE.md) - Get the app running
2. [Quick Reference](./QUICK_REFERENCE.md) - Fast lookup for developers
3. [Implementation Docs](./implementation/) - Learn specific features

**Reference:**
- [Database Schema](./DATABASE_SCHEMA.md) - Data structure
- [Backend API](./BACKEND_API.md) - API endpoints
- [Auth System](./AUTH_SYSTEM.md) - How auth works

### I'm a Designer
**Start here:**
1. `/guidelines/Guidelines.md` - Design principles
2. `/guidelines/Typography.md` - Typography system
3. `/guidelines/QUICK_REFERENCE.md` - Design quick reference

### I'm a Product Manager
**Start here:**
1. `/README.md` (root) - Project overview & roadmap
2. `/docs/archive/spec.md` - Archived full specification
3. `/CHANGELOG.md` - Version history

---

## 🔍 Find What You Need

### "How do I..."

**...run the app locally?**  
→ [Setup Guide](./SETUP_GUIDE.md)

**...understand the authentication flow?**  
→ [Auth System](./AUTH_SYSTEM.md)

**...know what's implemented vs. planned?**  
→ `/docs/archive/spec.md` - Archived full specification and previous state snapshot

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
1. Check `/docs/archive/spec.md` for historical context
2. Review related [Implementation Docs](./implementation/)
3. Follow design system in `/guidelines/`

**...fix a bug**  
1. Check [Debug History](./archive/MIGRATION_AND_DEBUG_HISTORY.md) for common issues
2. Use debug helpers: `window.ChopDot.diagnosePerformance()`
3. Review relevant implementation docs

**...understand the codebase**  
1. Read `/README.md` (root) for high-level overview
2. Check `/docs/archive/spec.md` for the archived detailed specification
3. Explore [Implementation Docs](./implementation/) for specific features

---

## 📝 Implementation Docs

Each feature has detailed documentation in `/docs/implementation/`:

### User Experience
- **[Help Section](./implementation/help-section.md)** - FAQ system
- **[Quick Actions](./implementation/quick-actions.md)** - Bottom sheet shortcuts
- **[Request Payment](./implementation/request-payment.md)** - Payment request flow

### Core Features
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
1. Read `/docs/archive/spec.md` for the archived architecture snapshot
2. Check `/CHANGELOG.md` for recent changes
3. Review relevant [Implementation Docs](./implementation/)

### While Developing
- Follow design system in `/guidelines/`
- Use debug helpers: `window.ChopDot.*`
- Check browser console for ChopDot logs

### After Implementing
- Add or update a current architecture doc under `/docs/` if architecture changes
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
