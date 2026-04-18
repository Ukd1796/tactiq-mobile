# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start           # Start Metro bundler (scan QR with Expo Go or dev build)
npx expo start --ios     # Start + open iOS simulator
npx expo start --android # Start + open Android emulator
npx tsc --noEmit         # Type-check without emitting (also: npm run typecheck)

# OTA updates (JS-only changes — no app store needed)
eas update --channel production --message "description"
eas update --channel preview --message "description"

# Full native builds (required when adding new native modules or changing app.json plugins)
eas build --platform android --profile production
eas build --platform ios --profile production
```

**Local dev note:** `localhost` does not work on physical devices. Use your Mac's LAN IP in `.env`: `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api`

## Architecture

### Navigation
`App.tsx` → `RootNavigator` branches on Supabase session:
- **Unauthenticated** → `AuthStack` (SignIn, SignUp)
- **Authenticated** → `MainTabs` (4 bottom tabs: Dashboard, Strategies, Paper Trade, Live)

Strategies tab uses a nested `StrategiesStack` (MyStrategies → BacktestResults → StrategyBuilder).

### State layers
| Layer | Library | What it owns |
|---|---|---|
| Auth session | `AuthContext` + Supabase | User/session, persisted to device keychain via `expo-secure-store` |
| Strategy editor | Zustand (`strategyStore`) | Multi-step wizard state (universe, strategies, risk config) |
| Server data | TanStack Query | API + Supabase query results; cleared on sign-out |

`strategyStore.reset()` and `queryClient.clear()` are both called on `SIGNED_OUT` in `AuthContext`.

### Data flow
1. User builds strategy in Zustand → saves to **Supabase** `user_strategies` table
2. Backtest triggered → **Python backend** (`EXPO_PUBLIC_API_URL`) queues job
3. Results polled + stored in Supabase `backtest_results` → rendered in `BacktestResultsScreen`
4. Paper trade session started → backend tracks positions; mobile polls `/paper-trade/{id}/dashboard` every 60 s

### API layer
`src/lib/api.ts` is a thin fetch wrapper (`api.get`, `api.post`, `api.delete`). All backend calls go through it.
React Query hooks live in `src/api/` (strategies, backtest, paper_trade, market, broker).
Supabase hooks (RLS-protected) live in `src/db/`.

### Styling
NativeWind (Tailwind for React Native) + design tokens in `src/lib/theme.ts`. Dark theme only (`userInterfaceStyle: dark` in `app.json`). Use `colors.*`, `spacing.*`, `radius.*` from theme — do not hardcode hex values.

### Environment variables
All must be prefixed `EXPO_PUBLIC_` (Expo strips others at build time):
- `EXPO_PUBLIC_API_URL` — Python backend base URL
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### EAS / Builds
- OTA updates (`eas update`) work for JS-only changes and land immediately on installed apps
- A full `eas build` is required whenever `app.json` plugins change or a new native module is added
- Project ID: `bc49f3dc-f731-4500-854e-46c7c95e77c1` (owner: `ujjwal1796`)
- Production channel maps to App Store / Play Store builds; preview channel for internal testing
