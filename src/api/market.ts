import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MarketRegime, UniverseStats, StrategyWeights } from './types';

// Regime / universe data refreshes every 60 minutes.
const REGIME_STALE_MS = 60 * 60 * 1000;
// Weights are rebalanced every 5 days — cache matches that window.
const WEIGHTS_STALE_MS = 5 * 24 * 60 * 60 * 1000;

export function useMarketRegime() {
  return useQuery<MarketRegime>({
    queryKey: ['market', 'regime'],
    queryFn: () => api.get<MarketRegime>('/market/regime'),
    staleTime: REGIME_STALE_MS,
  });
}

export function useUniverseStats() {
  return useQuery<UniverseStats>({
    queryKey: ['market', 'universe-stats'],
    queryFn: () => api.get<UniverseStats>('/market/universe-stats'),
    staleTime: REGIME_STALE_MS,
  });
}

export interface EnabledStrategyInput {
  id: string;
  floor_weight: number;
}

export function useStrategyWeights(enabledStrategies?: EnabledStrategyInput[]) {
  return useQuery<StrategyWeights>({
    queryKey: ['market', 'strategy-weights', enabledStrategies ?? []],
    queryFn: () =>
      enabledStrategies && enabledStrategies.length > 0
        ? api.post<StrategyWeights>('/market/strategy-weights', {
            enabled_strategies: enabledStrategies,
          })
        : api.get<StrategyWeights>('/market/strategy-weights'),
    staleTime: WEIGHTS_STALE_MS,
  });
}
