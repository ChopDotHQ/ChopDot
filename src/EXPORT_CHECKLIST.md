# ✅ ChopDot Export Checklist

**Last Updated:** October 15, 2025  
**Status:** PRODUCTION READY 🚀

---

## 📦 Pre-Export Verification

### Build Configuration ✅
- [x] `package.json` - All dependencies present, `@types/node` added
- [x] `vite.config.ts` - Complete with React, Tailwind V4, path aliases
- [x] `tsconfig.json` - Strict mode, proper excludes
- [x] `index.html` - iPhone-optimized viewport, PWA meta tags
- [x] `main.tsx` - React 18 createRoot, StrictMode enabled

### Design System ✅
- [x] `globals.css` - Complete with documented tokens
- [x] `DESIGN_TOKENS.md` - Comprehensive token reference created
- [x] Primary tokens documented (--bg, --card, --ink, etc.)
- [x] Shadow system documented (3-level hierarchy)
- [x] Typography system documented (active vs experimental)
- [x] ShadCN compatibility layer explained

### Documentation ✅
- [x] `README.md` - Clear signpost to README_EXPORT.md added
- [x] `README_EXPORT.md` - Setup instructions present
- [x] `FILE_STRUCTURE.md` - Complete file navigation guide created
- [x] `DESIGN_TOKENS.md` - Design system reference created
- [x] All implementation docs in `/docs/implementation/`

### Code Quality ✅
- [x] Zero TypeScript errors
- [x] Zero dead code
- [x] Zero broken imports
- [x] Performance optimized (lazy initialization, memoization)
- [x] LocalStorage persistence working

---

## 📋 Export Steps

### 1. Export from Figma Make
Look for:
- **File menu** → Export / Download
- **Settings icon** → Export Project
- **Right-click** → Download
- **Share button** → Download Code

**Expected output:** `chopdot.zip` or similar

---

### 2. Extract & Verify

```bash
# Extract the zip file
unzip chopdot.zip -d chopdot/
cd chopdot/

# Verify key files exist
ls -la package.json       # Dependencies
ls -la vite.config.ts     # Build config
ls -la App.tsx            # Main app
ls -la styles/globals.css # Design system
```

**Expected files:** 89+ source files

---

### 3. Install Dependencies

```bash
npm install
```

**Expected time:** 2-3 minutes  
**Expected output:** `node_modules/` (~250MB)

**Common issues:**
- `EACCES` permission error → Try `sudo npm install` or fix npm permissions
- `ERESOLVE` peer dependency warning → Safe to ignore, or run `npm install --legacy-peer-deps`

---

### 4. Run Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v6.0.3  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h + enter to show help
```

**Open:** http://localhost:5173

**Expected behavior:**
- Login screen appears
- Can create account or login
- All features work (pots, expenses, settlements)
- Data persists in localStorage

---

### 5. Build for Production

```bash
npm run build
```

**Expected output:**
```
vite v6.0.3 building for production...
✓ 245 modules transformed.
dist/index.html                   0.89 kB │ gzip:  0.51 kB
dist/assets/index-BwZ8S7Tm.css   12.34 kB │ gzip:  3.45 kB
dist/assets/index-DkJF8sT9.js   156.78 kB │ gzip: 52.34 kB
✓ built in 3.21s
```

**Result:** `dist/` folder with optimized production files

---

## 🚀 Deployment Options

### Option 1: Vercel (Easiest - 5 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# → Link to existing project? No
# → What's your project's name? chopdot
# → In which directory is your code located? ./
# → Want to modify these settings? No
```

**Result:** Live at `https://chopdot-xxx.vercel.app`

**Auto-deploys on:**
- Git push to main branch
- Pull request previews

---

### Option 2: Netlify (5 minutes)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build first
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Follow prompts
# → Authorize with GitHub
# → Pick a site name: chopdot
# → Deploy path: dist
```

**Result:** Live at `https://chopdot-xxx.netlify.app`

---

### Option 3: GitHub Pages (10 minutes)

1. **Add to `vite.config.ts`:**
```typescript
export default defineConfig({
  base: '/chopdot/', // Replace with your repo name
  // ... rest of config
})
```

2. **Build:**
```bash
npm run build
```

3. **Deploy:**
```bash
# Install gh-pages
npm install -g gh-pages

# Deploy dist folder
gh-pages -d dist
```

**Result:** Live at `https://yourusername.github.io/chopdot/`

---

### Option 4: iOS App (Capacitor - 30 minutes)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize
npx cap init ChopDot com.chopdot.app

# Add iOS platform
npx cap add ios

# Build web assets
npm run build

# Copy to iOS
npx cap copy

# Open in Xcode
npx cap open ios
```

**In Xcode:**
1. Select your development team
2. Choose a device or simulator
3. Click Run
4. Test on real iPhone
5. Archive → Distribute → App Store

**Result:** ChopDot in the App Store!

---

## 🔍 Post-Export Verification

### ✅ Functionality Checklist

After deploying, test these features:

- [ ] **Authentication**
  - [ ] Can create account
  - [ ] Can login with email/password
  - [ ] Can logout
  - [ ] Auth state persists on refresh

- [ ] **Pots**
  - [ ] Can create new pot
  - [ ] Can view pot details
  - [ ] Can add members to pot
  - [ ] Can edit pot settings

- [ ] **Expenses**
  - [ ] Can add expense
  - [ ] Can edit expense
  - [ ] Can delete expense
  - [ ] Can confirm expense (attestation)
  - [ ] Batch confirm works

- [ ] **Settlements**
  - [ ] Can navigate to settle screen
  - [ ] Can select payment method
  - [ ] Can complete settlement
  - [ ] Settlement shows in history

- [ ] **Navigation**
  - [ ] All 4 tabs work (Pots, People, Activity, You)
  - [ ] Back button works
  - [ ] Swipe-to-go-back works (mobile)
  - [ ] Deep navigation preserves state

- [ ] **Data Persistence**
  - [ ] Data saves to localStorage
  - [ ] Data loads on page refresh
  - [ ] No data loss on navigation

- [ ] **UI/UX**
  - [ ] Design tokens applied correctly
  - [ ] Light/dark mode works
  - [ ] Toast notifications appear
  - [ ] Loading states work
  - [ ] Empty states show

---

## 🐛 Common Issues & Fixes

### Issue: "Module not found: lucide-react"
**Fix:**
```bash
npm install lucide-react
```

### Issue: "Cannot find module '@tailwindcss/vite'"
**Fix:**
```bash
npm install -D @tailwindcss/vite tailwindcss@4.0.0
```

### Issue: LocalStorage quota exceeded
**Fix:**
```javascript
// Open browser console
window.ChopDot.clearAll()
```

### Issue: White screen / blank page
**Fix:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for 404s
4. Verify `index.html` loads
5. Check `vite.config.ts` base path

### Issue: Styles not loading
**Fix:**
1. Verify `globals.css` is imported in `main.tsx`
2. Check Tailwind V4 plugin in `vite.config.ts`
3. Clear browser cache
4. Restart dev server

---

## 📊 Performance Benchmarks

After export, verify these metrics:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Initial load | < 2s | Browser DevTools → Network → Disable cache |
| Bundle size (gzipped) | < 150 KB | `npm run build` output |
| Lighthouse Performance | > 90 | Chrome DevTools → Lighthouse |
| Lighthouse Accessibility | > 95 | Chrome DevTools → Lighthouse |
| Time to Interactive | < 3s | Lighthouse report |

---

## 🎯 Production Optimizations (Optional)

### Enable Compression
Most hosts (Vercel, Netlify) do this automatically.

For custom hosting, add to `nginx.conf`:
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
```

### Enable Caching
Add to `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'ui': ['lucide-react', 'recharts'],
      }
    }
  }
}
```

### Add Analytics (Optional)
```bash
npm install @vercel/analytics
```

```tsx
// main.tsx
import { Analytics } from '@vercel/analytics/react';

<StrictMode>
  <App />
  <Analytics />
</StrictMode>
```

---

## 📝 Final Checklist

Before sharing your deployed app:

- [ ] Tested on iPhone Safari (primary target)
- [ ] Tested on Chrome desktop
- [ ] Verified localStorage works
- [ ] Verified all flows work
- [ ] No console errors
- [ ] Lighthouse score > 90
- [ ] README updated with live URL
- [ ] Screenshots/demo video ready
- [ ] Analytics configured (optional)
- [ ] Error tracking setup (optional)

---

## 🎉 Success Criteria

Your export is successful when:

✅ `npm install` completes without errors  
✅ `npm run dev` opens working app at localhost:5173  
✅ `npm run build` creates `dist/` folder  
✅ Deployed app loads without errors  
✅ All features work as expected  
✅ Data persists across page refreshes  
✅ Design tokens render correctly  
✅ Light/dark mode works  

---

## 🆘 Emergency Debug Commands

If something breaks, use these:

```javascript
// Open browser console (F12)

// Check app version & state
window.ChopDot.diagnosePerformance()

// Check localStorage size
window.ChopDot.checkStorageSize()

// Clear all data (nuclear option)
window.ChopDot.clearAll()

// Force reload from localStorage
location.reload()
```

---

## 📚 Reference Documentation

After export, these files are your source of truth:

| File | Purpose |
|------|---------|
| `README_EXPORT.md` | Setup instructions |
| `DESIGN_TOKENS.md` | Design system reference |
| `FILE_STRUCTURE.md` | Navigate the codebase |
| `docs/QUICK_REFERENCE.md` | Command quick reference |
| `docs/SETUP_GUIDE.md` | Detailed setup guide |
| `styles/globals.css` | CSS source of truth |
| `App.tsx` | Application logic |

---

## ✅ You're Ready!

Your ChopDot codebase is:
- ✅ Properly labeled
- ✅ Well-documented
- ✅ Production-ready
- ✅ Export-ready
- ✅ Deploy-ready

**Next step:** Export from Figma Make and follow this checklist!

**Questions?** Check the docs or open an issue.

---

**Built with ❤️ using React, TypeScript, Tailwind V4, and Polkadot**
