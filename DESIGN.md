# ChopDot Design System

## Typography
- **Primary Font:** Inter (Sans-serif)
- **Weights:** Regular (400), Medium (500), Semi-bold (600), Bold (700)

## Colors (Tailwind Defaults & Custom Accents)

### Backgrounds
- **App Canvas (Outer):** `bg-gray-50` / `dark:bg-gray-950`
- **Main View Area:** `bg-gray-50` / `dark:bg-gray-950`
- **Top / Bottom Navigation Bars:** `bg-white` / `dark:bg-[#0a0a0a]` (Provides a solid, grounded anchor)
- **Cards (Level 1):** `bg-white` / `dark:bg-gray-900` or `dark:bg-[#111111]`
- **List Items (Level 2):** `bg-white` / `dark:bg-[#111111]`
- **Inputs / Subtle Backgrounds:** `bg-gray-100` / `dark:bg-gray-800`

### Text
- **Primary Text / Headings:** `text-gray-900` / `dark:text-white`
- **Secondary / Subtle Text:** `text-gray-500` / `dark:text-gray-400`
- **Disabled Text:** `text-gray-400` / `dark:text-gray-500`

### Borders & Layering
Instead of hard, solid gray borders, we prefer opacity-based borders where possible, or very subtle dark colors, to create a smooth, physical layering effect.
- **Top/Bottom Navigation Dividers:** `border-gray-100` / `dark:border-[#1a1a1a]`
- **Card/List Item Borders:** `border-black/5` / `dark:border-white/5` or `border-gray-100` / `dark:border-gray-800`
- **Input Borders:** `border-black/10` / `dark:border-white/20`
- **Active / Focus Rings:** `border-gray-900` / `dark:border-white`

## Elevation & Depth (Layering Architecture)
To create a smooth, timeless aesthetic, ChopDot relies on a clear physical layering model.
1. **Base Canvas (Level 0 - The Foundation)**
   - `bg-gray-50` (Light) / `dark:bg-gray-950` (Dark - nearly pitch black)
   - The deepest background layer. It provides a quiet, recessed space that allows foreground elements to pop.
2. **Surfaces & Cards (Level 1 - The Content)**
   - `bg-white` (Light) / `dark:bg-[#111111]` (Dark - elevated gray)
   - Content containers that sit slightly above the canvas with soft shadows (`shadow-sm`) or soft borders (`border-black/5` / `dark:border-white/5`).
3. **Interactive Elements (Level 2 - The Actions)**
   - High contrast (`bg-gray-900` / `dark:bg-white` or `dark:bg-gray-100`)
   - Primary buttons and active toggles sit at the highest elevation, drawing the eye instantly without needing aggressive colors.

## Accents (Semantic Colors)
- **Success (Settled):** `text-green-600` / `dark:text-green-400`
- **Warning/Owed (Open Amounts):** `text-orange-600`
- **Interactive Links / Icons:** `text-blue-600` / `dark:text-blue-400`
- **Primary Buttons:** `bg-gray-900` / `dark:bg-gray-100`
- **Primary Button Text:** `text-white` / `dark:text-gray-900`

## Components & Structure

### Container & Layout
- Mobile-first bounded container `max-w-[375px]` centered on desktop.
- `flex-1 flex flex-col h-[100dvh]` to stretch vertically and hide overflow.
- Views use `overflow-y-auto` inside the main flex container, with fixed `header` and `footer` blocks set to `shrink-0`.

### Cards & Panels
- **Container Styling:** `bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700`
- **List Items (Smaller Cards):** `rounded-2xl p-4 bg-white dark:bg-[#111111] shadow-sm border border-black/5 dark:border-white/5`

### Buttons (Modern Pill-Shape)
- **Primary Action:** `w-full py-4 rounded-full font-semibold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm transition-colors`
- **Secondary Action:** `w-full py-4 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm transition-colors`
- **Icon Buttons (e.g. Back):** `p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800`

### Inputs
- **Standard Fields:** `border-b-2 border-gray-200 dark:border-gray-700 py-3 focus:border-gray-900 dark:focus:border-gray-100 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors outline-none`
- **Number Entry (Large):** `text-5xl font-bold tracking-tight bg-transparent focus:outline-none text-center`
