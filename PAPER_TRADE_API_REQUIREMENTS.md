# Paper Trade — Backend API Requirements

These are the changes needed in the **financial-lab** backend to fully support the mobile Paper Trade screen. The mobile app currently estimates current price and absolute P&L from the percentage the backend already returns, but this is approximate. The fields below make it exact and expose cash/invested breakdown without client-side guessing.

---

## 1. `GET /paper-trade/:session_id/dashboard`

### Add to response body

```jsonc
{
  "session_id": "...",
  "portfolio_value": 1082340,
  "day_count": 14,
  "regime": "BULL_CONFIRMED",

  // ── NEW ──────────────────────────────────────────────────────────────────
  "total_invested": 950000,          // sum of (entry_price × quantity) for all open positions
  "cash_balance": 132340,            // starting_capital − total_invested (+ realised gains/losses)
  "unrealised_pnl_abs": 28500,       // sum of unrealised P&L in INR across all open positions (signed)
  // ─────────────────────────────────────────────────────────────────────────

  "open_positions": [...],
  "todays_signals": [...]
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `total_invested` | `number` | Sum of `entry_price × quantity` for every open position |
| `cash_balance` | `number` | Cash not deployed in any position. `starting_capital − total_deployed_cost + realised_pnl` |
| `unrealised_pnl_abs` | `number` | Total unrealised P&L in INR (signed). `portfolio_value − (cash_balance + total_invested)` or computed per position |

---

## 2. `PaperPosition` object (inside `open_positions`)

### Current shape

```jsonc
{
  "symbol": "RELIANCE",
  "strategy": "trend-follow",
  "days_held": 5,
  "entry_price": 2376.20,
  "quantity": 10,
  "unrealised_pnl_pct": 3.24
}
```

### Required shape

```jsonc
{
  "symbol": "RELIANCE",
  "strategy": "trend-follow",
  "days_held": 5,
  "entry_price": 2376.20,
  "quantity": 10,
  "unrealised_pnl_pct": 3.24,

  // ── NEW ──────────────────────────────────────────────────────────────────
  "current_price": 2453.17,          // latest available market price for the symbol
  "unrealised_pnl_abs": 769.70,      // (current_price − entry_price) × quantity  [signed]
  "current_value": 24531.70          // current_price × quantity
  // ─────────────────────────────────────────────────────────────────────────
}
```

### Field definitions

| Field | Type | Nullable | Description |
|---|---|---|---|
| `current_price` | `number` | yes — `null` if price feed unavailable | Latest market price. Use EOD close if intraday feed not available |
| `unrealised_pnl_abs` | `number` | yes — `null` if `current_price` is `null` | `(current_price − entry_price) × quantity` |
| `current_value` | `number` | yes — `null` if `current_price` is `null` | `current_price × quantity` |

---

## 3. Price feed strategy (recommendation)

The mobile app refreshes the dashboard every 60 seconds. Two viable approaches:

### Option A — EOD close (simplest)
- After market close each day, update `current_price` on each open `paper_position` row with the day's closing price.
- Simple: no intraday feed needed. Price is stale intraday but accurate for paper trading purposes.

### Option B — Delayed intraday (15-min delay)
- Pull prices from NSE/BSE 15-min delayed feed during market hours (9:15 AM – 3:30 PM IST).
- Update the `current_price` field in-memory or cache it (Redis/SQLite) per symbol.
- The dashboard endpoint fetches cached prices and computes `unrealised_pnl_abs` / `current_value` at query time.
- After market close, persist the final close price to the DB row.

---

## 4. TypeScript type changes needed in the mobile app

Once the backend ships these fields, update `src/api/types.ts`:

```typescript
export interface PaperPosition {
  symbol: string;
  strategy: string;
  days_held: number;
  entry_price: number;
  quantity: number;
  unrealised_pnl_pct: number | null;
  // New
  current_price: number | null;
  unrealised_pnl_abs: number | null;
  current_value: number | null;
}

export interface PaperDashboard {
  session_id: string;
  portfolio_value: number;
  day_count: number;
  regime: RegimeValue;
  open_positions: PaperPosition[];
  todays_signals: PaperSignal[];
  // New
  total_invested: number;
  cash_balance: number;
  unrealised_pnl_abs: number | null;
}
```

Once these fields are present the mobile app will automatically use exact server values instead of the current client-side estimates (the `~` prefix on current price will be removed).

---

## 5. Prompt for financial-lab

Use the following prompt to implement these changes in the financial-lab project:

---

> **Paper trade dashboard — add invested/cash breakdown and live position prices**
>
> In the `GET /paper-trade/:session_id/dashboard` response, add three new top-level fields:
> - `total_invested` (number): sum of `entry_price × quantity` across all open positions
> - `cash_balance` (number): `starting_capital − total_invested + realised_pnl_so_far`
> - `unrealised_pnl_abs` (number | null): total unrealised P&L in INR across all open positions
>
> In each object inside `open_positions`, add three new fields:
> - `current_price` (number | null): latest available market price for the symbol. Use the most recent EOD close price you have; return `null` if the symbol has no price data.
> - `unrealised_pnl_abs` (number | null): `(current_price − entry_price) × quantity`. Null if `current_price` is null.
> - `current_value` (number | null): `current_price × quantity`. Null if `current_price` is null.
>
> The `unrealised_pnl_pct` field already exists — keep it. The new `unrealised_pnl_abs` is just the INR amount of the same P&L.
>
> For the price source, use whatever EOD close price table you already query for backtest/signal generation — no new data source needed. The mobile app polls this endpoint every 60 seconds so no streaming is required.
