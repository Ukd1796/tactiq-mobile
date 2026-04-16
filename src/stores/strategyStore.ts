import { create } from 'zustand';
import { RISK_CONFIG } from '../lib/riskConfig';

export type Universe = 'nifty50' | 'nifty100' | 'broad150';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  bestIn: string;
  holdPeriod: string;
  enabled: boolean;
  floor_weight: number;
}

export interface RiskConfig {
  riskPerTrade: number;
  maxPosition: number;
  pauseThreshold: number;
  capitalAmount: number;
}

export interface StrategyConfig {
  universe: Universe;
  strategies: Strategy[];
  risk: RiskConfig;
  strategyName: string;
  wizardStep: number;
  backtestStartYear: number;
  backtestStartMonth: number;
  backtestEndYear: number;
  backtestEndMonth: number;
}

export const defaultStrategies: Strategy[] = [
  { id: 'trend-follow',   name: 'Trend Follow',    description: 'Buys when the 20-day average crosses above the 50-day average.', bestIn: 'Sustained bull markets',      holdPeriod: '3-8 weeks',  enabled: true,  floor_weight: 0 },
  { id: 'breakout',       name: 'Breakout',         description: 'Buys stocks making new 10-day highs with above-average volume.',  bestIn: 'Recovery, early bull',         holdPeriod: '1-3 weeks',  enabled: true,  floor_weight: 0 },
  { id: 'quiet-breakout', name: 'Quiet Breakout',   description: 'Buys stocks breaking out after a period of low volatility.',      bestIn: 'Sideways → bull transitions',  holdPeriod: '2-4 weeks',  enabled: true,  floor_weight: 0 },
  { id: 'trend-pullback', name: 'Trend Pullback',   description: 'Buys 5% dips within confirmed uptrends.',                        bestIn: 'Strong trending markets',      holdPeriod: '1-3 weeks',  enabled: true,  floor_weight: 0 },
  { id: 'mean-reversion', name: 'Mean Reversion',   description: 'Buys short-term oversold stocks that are still in healthy uptrends.', bestIn: 'Recovery periods',         holdPeriod: '3-10 days',  enabled: false, floor_weight: 0 },
];

export interface BacktestHistoryEntry {
  runId: string;
  label: string; // strategy name at time of run
}

export type DbSlice = Partial<StrategyConfig & {
  savedStrategyId: string | null;
  lastBacktestRunId: string | null;
  backtestHistory: BacktestHistoryEntry[];
}>;

export interface StrategyStore extends StrategyConfig {
  savedStrategyId: string | null;
  lastBacktestRunId: string | null;
  backtestHistory: BacktestHistoryEntry[];
  setUniverse: (u: Universe) => void;
  toggleStrategy: (id: string) => void;
  setStrategiesEnabled: (map: Record<string, boolean>) => void;
  setFloorWeight: (id: string, weight: number) => void;
  setRisk: (r: Partial<RiskConfig>) => void;
  setStrategyName: (name: string) => void;
  setWizardStep: (step: number) => void;
  setBacktestPeriod: (startYear: number, startMonth: number, endYear: number, endMonth: number) => void;
  setLastBacktestRunId: (id: string) => void;
  addToBacktestHistory: (entry: BacktestHistoryEntry) => void;
  setSavedStrategyId: (id: string | null) => void;
  hydrateFromDb: (slice: DbSlice) => void;
  reset: () => void;
}

export const useStrategyStore = create<StrategyStore>((set) => ({
  universe: 'nifty100',
  strategies: defaultStrategies,
  risk: {
    riskPerTrade: RISK_CONFIG.riskPerTrade.default,
    maxPosition: RISK_CONFIG.maxPosition.default,
    pauseThreshold: RISK_CONFIG.pauseThreshold.default,
    capitalAmount: 1000000,
  },
  strategyName: 'My First Strategy',
  wizardStep: 1,
  backtestStartYear: 2019,
  backtestStartMonth: 1,
  backtestEndYear: new Date().getFullYear(),
  backtestEndMonth: new Date().getMonth() + 1,
  savedStrategyId: null,
  lastBacktestRunId: null,
  backtestHistory: [],
  setUniverse: (universe) => set({ universe }),
  toggleStrategy: (id) => set((s) => ({
    strategies: s.strategies.map((st) => st.id === id ? { ...st, enabled: !st.enabled } : st),
  })),
  setStrategiesEnabled: (map) => set((s) => ({
    strategies: s.strategies.map((st) => map[st.id] !== undefined ? { ...st, enabled: map[st.id] } : st),
  })),
  setFloorWeight: (id, weight) => set((s) => ({
    strategies: s.strategies.map((st) => st.id === id ? { ...st, floor_weight: weight } : st),
  })),
  setRisk: (r) => set((s) => ({ risk: { ...s.risk, ...r } })),
  setStrategyName: (strategyName) => set({ strategyName }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  setBacktestPeriod: (backtestStartYear, backtestStartMonth, backtestEndYear, backtestEndMonth) => set({ backtestStartYear, backtestStartMonth, backtestEndYear, backtestEndMonth }),
  setLastBacktestRunId: (lastBacktestRunId) => set({ lastBacktestRunId }),
  addToBacktestHistory: (entry) => set((s) => ({
    backtestHistory: [entry, ...s.backtestHistory.filter((e) => e.runId !== entry.runId)].slice(0, 5),
  })),
  setSavedStrategyId: (savedStrategyId) => set({ savedStrategyId }),
  hydrateFromDb: (slice) => set(slice),
  reset: () => set({
    universe: 'nifty100',
    strategies: defaultStrategies,
    risk: {
      riskPerTrade: RISK_CONFIG.riskPerTrade.default,
      maxPosition: RISK_CONFIG.maxPosition.default,
      pauseThreshold: RISK_CONFIG.pauseThreshold.default,
      capitalAmount: 1000000,
    },
    strategyName: 'My First Strategy',
    wizardStep: 1,
    backtestStartYear: 2019,
    backtestStartMonth: 1,
    backtestEndYear: new Date().getFullYear(),
    backtestEndMonth: new Date().getMonth() + 1,
    savedStrategyId: null,
    lastBacktestRunId: null,
    backtestHistory: [],
  }),
}));
