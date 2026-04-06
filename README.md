# TacTiq Mobile

React Native (Expo) app for TacTiq — same backend and Supabase database as the web app.

---

## What's in this folder

```
mobile/
├── App.tsx                   ← entry point
├── src/
│   ├── api/                  ← copied from web src/api/ (TanStack Query hooks)
│   ├── db/                   ← copied from web src/db/ (Supabase hooks)
│   ├── stores/               ← copied from web src/stores/ (Zustand)
│   ├── lib/
│   │   ├── api.ts            ← fetch wrapper (same as web, uses EXPO_PUBLIC_API_URL)
│   │   ├── supabase.ts       ← Supabase client (uses SecureStore instead of localStorage)
│   │   └── theme.ts          ← design tokens matching web (colors, spacing, radius)
│   ├── contexts/
│   │   └── AuthContext.tsx   ← Supabase auth (token persisted in device keychain)
│   ├── navigation/           ← React Navigation (bottom tabs + stacks)
│   ├── screens/              ← one folder per tab
│   │   ├── auth/             ← SignIn, SignUp
│   │   ├── dashboard/        ← Dashboard
│   │   ├── strategies/       ← My Strategies, Backtest Results
│   │   ├── paper/            ← Paper Trade
│   │   └── live/             ← Live Trading
│   └── components/ui/        ← NativeWind-based Button, Card, Badge, etc.
```

---

## Prerequisites (one-time setup on Mac)

### 1. Node.js 18+
```bash
# Check your version
node --version

# If below 18, install via nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Expo CLI
```bash
npm install -g expo-cli
# or use npx expo (no global install needed)
```

### 3. iOS Simulator (Mac only — no Xcode required, just Command Line Tools)
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Then install the full Xcode from the Mac App Store (free, ~12 GB)
# After install, open Xcode once to accept the license agreement
```

> **Tip:** You don't need to know how to use Xcode. You only need it installed so Expo can launch the iOS Simulator.

### 4. Expo Go on your Android phone (required — this is the easiest way to run it)
Install **Expo Go** from the **Google Play Store** on your Android phone.
You don't need Android Studio, an emulator, or any extra setup on your Mac.
Once installed, you just scan a QR code to run the app live on your phone.

---

## Setup

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Set environment variables
```bash
cp .env .env.local
```

Open `.env.local` and fill in your values (same as the web app's `.env` — just rename the prefix):

| Web variable | Mobile variable |
|---|---|
| `VITE_API_URL` | `EXPO_PUBLIC_API_URL` |
| `VITE_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Example:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Important for the API URL:** When running on a physical device or simulator, `localhost` won't work because it resolves to the device, not your Mac. Use your Mac's local IP address instead. Find it with: `ipconfig getifaddr en0`

---

## Running the app on your Android phone

This is the simplest setup — no emulator, no Android Studio needed.

### Step 1 — Install Expo Go on your Android phone
Open the **Google Play Store** on your Android phone and install **Expo Go**.

### Step 2 — Connect to the same Wi-Fi
Your Mac and your Android phone must be on the **same Wi-Fi network**.
(e.g. both connected to your home router — not one on Wi-Fi and one on mobile data)

### Step 3 — Find your Mac's local IP address
```bash
ipconfig getifaddr en0
```
This prints something like `192.168.1.42`. You'll need this for the API URL in your `.env`.

### Step 4 — Update your `.env`
Make sure `EXPO_PUBLIC_API_URL` uses your Mac's IP, **not** `localhost`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000/api
```
`localhost` on your phone resolves to the phone itself, not your Mac — the API calls will fail if you use it.

### Step 5 — Start the dev server
```bash
cd mobile
npx expo start
```
A QR code appears in the terminal.

### Step 6 — Scan the QR code
Open the **Expo Go** app on your Android phone → tap **Scan QR code** → point it at the QR code in the terminal.

The app will load on your phone in about 10–15 seconds. Any time you save a file on your Mac, the app on your phone updates automatically (no re-scan needed).

---

### Troubleshooting Android connection

**"Network response timed out" / blank screen**
- Confirm both devices are on the same Wi-Fi network
- Make sure your Python backend is running with `--host 0.0.0.0`:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- Try pressing `s` in the Expo terminal to switch to **Expo Go tunnel mode** (routes traffic via Expo's servers, bypasses local network issues):
  ```bash
  npx expo start --tunnel
  ```
  With tunnel mode, `localhost` in the API URL won't work — you still need the Mac IP or a public URL.

**QR code won't scan**
- Make sure you're scanning from inside the **Expo Go** app, not the phone's default camera
- Try pressing `w` in the terminal — it shows the QR code in the browser instead, which is easier to scan

**"Something went wrong" error in Expo Go**
```bash
# Clear Metro bundler cache and restart
npx expo start --clear
```

---

### Optional: Android Emulator (Mac only, no phone needed)
If you ever want to test without your phone, you can use an Android emulator — but it requires installing Android Studio (~5 GB).

```bash
# 1. Download Android Studio from developer.android.com/studio
# 2. Open Android Studio → Virtual Device Manager → create an emulator
# 3. Start the emulator, then:
npx expo start
# Press 'a' to connect to the emulator
```

---

## Development workflow

### Making changes
- Edit any file in `src/screens/` and the app hot-reloads instantly (no rebuild needed)
- The Metro bundler watches for changes automatically

### TypeScript check
```bash
cd mobile
npx tsc --noEmit
```

### Updating shared API/DB code
If you update `src/api/` or `src/db/` in the **web app**, copy the changed files to the same path in `mobile/src/`:
```bash
# Example: sync the paper_trade API hook
cp ../src/api/paper_trade.ts src/api/paper_trade.ts
```
Then check that imports still resolve (they use relative paths like `../lib/api`).

---

## Navigation structure

```
App.tsx
└── RootNavigator
    ├── AuthStack (when logged out)
    │   ├── SignInScreen
    │   └── SignUpScreen
    └── MainTabs (when logged in)
        ├── Dashboard tab → DashboardScreen
        ├── Strategies tab → MyStrategiesScreen
        │                     └── BacktestResultsScreen (push)
        ├── Paper Trade tab → PaperTradeScreen
        └── Live tab → LiveTradingScreen
```

---

## Building for production (when ready to ship)

We use **EAS Build** (Expo's cloud build service — free tier available).

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure the project (one-time)
eas build:configure

# Build for iOS (creates an .ipa for TestFlight/App Store)
eas build --platform ios

# Build for Android (creates an .apk or .aab for Play Store)
eas build --platform android
```

> For App Store submission you'll need an Apple Developer account ($99/year). For just testing on your own devices, the free EAS tier is enough.

---

## Common issues

**"Unable to resolve module" error**
```bash
# Clear Metro cache
npx expo start --clear
```

**"Network request failed" when calling the API**
- Make sure `EXPO_PUBLIC_API_URL` uses your Mac's local IP, not `localhost`
- Make sure your Python backend is running (`uvicorn main:app --host 0.0.0.0 --port 8000`)
- Make sure your Mac's firewall isn't blocking port 8000

**Simulator not showing up after pressing 'i'**
- Open Xcode → Preferences → Components → download at least one iOS Simulator runtime
- Then try `npx expo start` again

**Fonts not loading**
```bash
npx expo install @expo-google-fonts/inter expo-font
```
