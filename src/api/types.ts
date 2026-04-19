// ─── Market ────────────────────────────────────────────────────────────────

export type RegimeValue =
  | 'BULL_CONFIRMED'
  | 'BULL_EARLY'
  | 'BULL_WATCH'
  | 'SIDEWAYS_CHOPPY'
  | 'TRANSITION_UP'
  | 'BEAR_WATCH'
  | 'BEAR_TRANSITION'
  | 'BEAR_CONFIRMED';

export type AtrLevel = 'low' | 'normal' | 'elevated' | 'high';

export interface MarketRegime {
  regime: RegimeValue;
  breadth_pct_uptrend: number;
  breadth_pct_downtrend: number;
  active_stocks: number;
  atr_level: AtrLevel;
  as_of_date: string;
  note: string;
}

export interface UniverseTier {
  total: number;
  active: number;
  as_of_date: string;
}

export interface UniverseStats {
  nifty50: UniverseTier;
  nifty100: UniverseTier;
  broad150: UniverseTier;
}

export type StrategyId =
  | 'trend-follow'
  | 'breakout'
  | 'quiet-breakout'
  | 'trend-pullback'
  | 'mean-reversion';

export interface StrategyWeights {
  regime: RegimeValue;
  weights: Record<StrategyId, number>;
  rationale: string;
  source: 'llm' | 'fallback';
  decided_at: string;   // ISO datetime — when the LLM last rebalanced
}

// ─── Strategies ────────────────────────────────────────────────────────────

export interface StrategyEntry {
  id: StrategyId;
  enabled: boolean;
  floor_weight: number;
}

export interface RiskParams {
  risk_per_trade_pct: number;
  max_position_pct: number;
  pause_threshold_pct: number;
  capital_amount: number;
}

export interface StrategyConfigPayload {
  name: string;
  universe: 'nifty50' | 'nifty100' | 'broad150';
  strategies: StrategyEntry[];
  risk: RiskParams;
  /** ISO date string e.g. "2019-01-01". Defaults to 2019-01-01 on the server. */
  backtest_start?: string;
  /** ISO date string e.g. "2026-01-01". Defaults to today on the server. */
  backtest_end?: string;
}

export interface SavedStrategy extends StrategyConfigPayload {
  id: string;
  created_at: string;
}

export interface SaveStrategyResponse {
  id: string;
  created_at: string;
}

// ─── Backtest ──────────────────────────────────────────────────────────────

export type BacktestStatus = 'queued' | 'running' | 'complete' | 'failed';

export interface BacktestStartResponse {
  run_id: string;
  status: 'queued';
  estimated_seconds: number;
}

export interface BacktestSummary {
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  win_rate_pct: number;
  total_trades: number;
  benchmark_return_pct: number;
  benchmark_max_dd_pct: number;
  benchmark_sharpe: number;
}

export interface EquityCurvePoint {
  date: string;        // ISO date "2019-01-31"
  portfolio: number;
  benchmark: number;
}

export interface PeriodBreakdown {
  period: string;
  start_date: string;
  end_date: string;
  regime: RegimeValue;
  return_pct: number;
  max_dd_pct: number;
  sharpe: number;
  vs_nifty_pct: number;
}

export type TradeAction = 'BUY' | 'SELL' | 'BLOCKED';

export interface TradeLogEntry {
  date: string;
  symbol: string;
  action: TradeAction;
  strategy: string;
  entry_price: number;
  exit_price: number | null;
  pnl_pct: number | null;
  regime_at_entry: string;
  reason: string;
}

export interface AiNarrative {
  what_worked: string;
  what_to_watch: string;
  bear_behavior: string;
  improvement_tip: string;
}

export interface BacktestRunning {
  run_id: string;
  status: 'queued' | 'running';
  progress_pct: number;
}

export interface BacktestComplete {
  run_id: string;
  status: 'complete';
  strategy_id: string;
  config_snapshot: StrategyConfigPayload;
  summary: BacktestSummary;
  equity_curve: EquityCurvePoint[];
  period_breakdown: PeriodBreakdown[];
  trade_log: TradeLogEntry[];
  ai_narrative: AiNarrative;
}

export interface BacktestFailed {
  run_id: string;
  status: 'failed';
  error: string;
}

export type BacktestResult = BacktestRunning | BacktestComplete | BacktestFailed;

// ─── Paper Trade ───────────────────────────────────────────────────────────

export interface PaperTradeSession {
  session_id: string;
  start_date: string;
  unlock_live_date: string;
}

export type SignalStatus = 'BUY' | 'SELL' | 'PENDING' | 'FILLED' | 'CANCELLED';

export interface PaperPosition {
  symbol: string;
  strategy: string;
  days_held: number;
  entry_price: number;
  quantity: number;
  unrealised_pnl_pct: number | null;
  current_price: number | null;
  unrealised_pnl_abs: number | null;
  current_value: number | null;
}

export interface PaperSignal {
  id: string;
  date: string;
  symbol: string;
  status: SignalStatus;
  strategy: string;
  entry_price: number;
}

export interface PaperDashboard {
  session_id: string;
  portfolio_value: number;
  day_count: number;
  regime: RegimeValue;
  open_positions: PaperPosition[];
  todays_signals: PaperSignal[];
  total_invested: number;
  cash_balance: number;
  unrealised_pnl_abs: number | null;
}

export interface PaperWeeklyReport {
  week_start: string;
  week_end: string;
  total_signals: number;
  filled_buys: number;
  filled_sells: number;
  pending_signals: number;
  regime: RegimeValue;
  notable_trades: TradeLogEntry[];
}

// ─── Insights ────────────────────────────────────────────────────────────────

export interface InsightsMeta {
  signals_7d: number;
  signals_filled: number;
  signals_blocked: number;
  signals_pending: number;
  block_reasons: Record<string, number>;
  fill_rate_by_strategy: Record<string, number>;
  regime: string;
  breadth_pct_uptrend: number;
  positions_at_risk: string[];
  best_performer: string | null;
  worst_performer: string | null;
  generated_at: string;
}

export interface PaperInsights {
  signal_health: string;
  position_insight: string;
  regime_context: string;
  strategy_tip: string;
  meta: InsightsMeta;
}

// ─── Broker ──────────────────────────────────────────────────────────────────

export type BrokerName = 'zerodha';
export type BrokerConnectionStatus = 'connected' | 'token_expired' | 'disconnected';

export interface BrokerStatusResponse {
  connected: boolean;
  broker: BrokerName;
  status: BrokerConnectionStatus;
  broker_user_id: string | null;
  token_fetched_at: string | null;
  token_valid: boolean;
}

export interface ConnectBrokerResponse {
  broker: BrokerName;
  login_url: string;
}
