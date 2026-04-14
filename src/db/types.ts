import type {
  StrategyEntry, RiskParams,
  BacktestSummary, StrategyConfigPayload, AiNarrative,
  EquityCurvePoint, PeriodBreakdown, TradeLogEntry,
} from '../api/types';
import { defaultStrategies } from '../stores/strategyStore';
import type { StrategyStore } from '../stores/strategyStore';
import { RISK_CONFIG } from '../lib/riskConfig';

/** Clamp a DB value to the valid range; fall back to default if out of bounds. */
function clampRisk(value: number, key: keyof typeof RISK_CONFIG): number {
  const { min, max, default: def } = RISK_CONFIG[key];
  if (value < min || value > max) return def;
  return value;
}

// ─── Exact DB row shape ─────────────────────────────────────────────────────

export interface UserStrategyRow {
  id: string;
  user_id: string;
  name: string;
  universe: 'nifty50' | 'nifty100' | 'broad150';
  strategies: StrategyEntry[];
  risk: RiskParams;
  backtest_start: string | null;   // "YYYY-MM-DD"
  backtest_end: string | null;     // "YYYY-MM-DD"
  last_backtest_run_id: string | null;
  backtest_history: { runId: string; label: string }[];
  created_at: string;
  updated_at: string;
}

export type UserStrategyInsert = Omit<UserStrategyRow, 'id' | 'created_at' | 'updated_at'>;

export type UserStrategyUpdate = Partial<
  Omit<UserStrategyRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ─── Backtest result DB types ───────────────────────────────────────────────

export interface BacktestResultRow {
  id: string;
  run_id: string;
  user_id: string;
  strategy_id: string;
  summary: BacktestSummary;
  config_snapshot: StrategyConfigPayload;
  ai_narrative: AiNarrative;
  period_breakdown: PeriodBreakdown[];
  equity_curve: EquityCurvePoint[];
  trade_log: TradeLogEntry[];
  created_at: string;
}

/** Lightweight projection — no equity_curve or trade_log (for strategy card previews) */
export interface BacktestResultSummaryRow {
  run_id: string;
  summary: BacktestSummary;
  created_at: string;
}

export type BacktestResultInsert = Omit<BacktestResultRow, 'id' | 'created_at'>;

// ─── Mapping helpers ────────────────────────────────────────────────────────

type StoreSaveState = Pick<
  StrategyStore,
  | 'strategyName'
  | 'universe'
  | 'strategies'
  | 'risk'
  | 'backtestStartYear'
  | 'backtestStartMonth'
  | 'backtestEndYear'
  | 'backtestEndMonth'
  | 'lastBacktestRunId'
  | 'backtestHistory'
>;

export function storeToInsert(state: StoreSaveState, userId: string): UserStrategyInsert {
  const {
    strategyName, universe, strategies, risk,
    backtestStartYear, backtestStartMonth,
    backtestEndYear, backtestEndMonth,
    lastBacktestRunId, backtestHistory,
  } = state;

  return {
    user_id:  userId,
    name:     strategyName,
    universe,
    strategies: strategies.map((s) => ({
      id:           s.id as StrategyEntry['id'],
      enabled:      s.enabled,
      floor_weight: s.floor_weight,
    })),
    risk: {
      risk_per_trade_pct:  risk.riskPerTrade,
      max_position_pct:    risk.maxPosition,
      pause_threshold_pct: risk.pauseThreshold,
      capital_amount:      risk.capitalAmount,
    },
    backtest_start: `${backtestStartYear}-${String(backtestStartMonth).padStart(2, '0')}-01`,
    backtest_end:   `${backtestEndYear}-${String(backtestEndMonth).padStart(2, '0')}-01`,
    last_backtest_run_id: lastBacktestRunId,
    backtest_history:     backtestHistory,
  };
}

export function rowToStoreSlice(row: UserStrategyRow) {
  // Merge DB {id, enabled, floor_weight} back into full Strategy objects
  // (display fields like name/description are not stored in DB — use defaults)
  const strategies = defaultStrategies.map((def) => {
    const entry = row.strategies.find((e) => e.id === def.id);
    return entry
      ? { ...def, enabled: entry.enabled, floor_weight: entry.floor_weight }
      : def;
  });

  return {
    savedStrategyId:   row.id,
    strategyName:      row.name,
    universe:          row.universe,
    strategies,
    risk: {
      riskPerTrade:   clampRisk(row.risk.risk_per_trade_pct,  'riskPerTrade'),
      maxPosition:    clampRisk(row.risk.max_position_pct,    'maxPosition'),
      pauseThreshold: clampRisk(row.risk.pause_threshold_pct, 'pauseThreshold'),
      capitalAmount:  row.risk.capital_amount,
    },
    lastBacktestRunId:  row.last_backtest_run_id,
    backtestHistory:    row.backtest_history,
    backtestStartYear:  row.backtest_start ? parseInt(row.backtest_start.slice(0, 4)) : 2019,
    backtestStartMonth: row.backtest_start ? parseInt(row.backtest_start.slice(5, 7)) : 1,
    backtestEndYear:    row.backtest_end   ? parseInt(row.backtest_end.slice(0, 4))   : new Date().getFullYear(),
    backtestEndMonth:   row.backtest_end   ? parseInt(row.backtest_end.slice(5, 7))   : new Date().getMonth() + 1,
  };
}
