# WeekPlate — Meal Planning App

## Architecture Overview

This is a pnpm monorepo with two artifacts:

### `artifacts/mobile` — Expo React Native app (WeekPlate)
- **Framework**: Expo SDK 54 + Expo Router v6 (file-based navigation)
- **Font**: Montserrat (300Light, 400Regular, 500Medium, 600SemiBold, 700Bold) via @expo-google-fonts/montserrat
- **Storage**: AsyncStorage (local only, no auth/login)
- **State**: React Context (`context/AppContext.tsx`) with AsyncStorage persistence
- **AI**: Routes through `artifacts/api-server` (Gemini Flash via Replit AI Integrations proxy)
- **Storage key**: `weekplate_data`

### `artifacts/api-server` — Express API server
- **Port**: 8080
- **Routes**:
  - `POST /api/ai/extract-recipe` — AI recipe URL extraction
  - `POST /api/ai/generate-plan` — AI week plan generation
  - `POST /api/ai/insight` — AI weekly nutritional insight

## Design System
- **Background**: `#0F0F0F`
- **Card**: `#1A1A1A` with `#2A2A2A` border
- **Teal accent**: `#00b29f`
- **Terracotta alert**: `#C8714A`
- **Text**: `#FFFFFF` / secondary `#9A9A9A`
- **Font**: Montserrat family

## App Screens

### Tab Navigation (5 tabs)
1. **Today** (`app/(tabs)/index.tsx`) — Today's meals, batch cooking alerts, "Didn't Cook" modal, weekend state
2. **Week** (`app/(tabs)/week.tsx`) — Day cards with status cycling (cooking/away/unplanned), meal previews
3. **Recipes** (`app/(tabs)/recipes.tsx`) — Recipe bank with search/filter by category, nutritional dots, favorites
4. **Analysis** (`app/(tabs)/analysis.tsx`) — Nutritional balance bars, stat cards, AI insight (weekly/monthly/overtime)
5. **Profile** (`app/(tabs)/profile.tsx`) — Portion control, pantry basics, premium pantry, favorites list

### Modal/Stack Screens
- **Recipe Detail** (`app/recipe/[id].tsx`) — Full recipe view, portion adjuster, nutritional groups, steps
- **Add Recipe** (`app/add-recipe.tsx`) — URL import with AI extraction + manual mode, all fields
- **Planning** (`app/planning.tsx`) — 3-step flow: select days → fridge stock → preferences → AI generates → preview/confirm

## Key Files
- `constants/colors.ts` — All theme colors + nutritional group colors
- `context/AppContext.tsx` — Full app state (recipes, weekPlan, shopping, fridge, profile)
- `utils/ai.ts` — API calls to backend AI routes
- `utils/dates.ts` — Date helpers, ID generation

## AI Integration
- Gemini 2.5 Flash model via Replit AI Integrations proxy
- Env vars: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY` (server-side only)
- Mobile app calls backend API routes; backend calls Gemini directly

## ID Generation
Uses `Date.now().toString() + Math.random().toString(36).substr(2, 9)` (no uuid package)

## Pantry Logic
Pantry basics + premium pantry items are excluded from shopping list generation
