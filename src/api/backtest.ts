import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  BacktestStartResponse,
  BacktestResult,
  BacktestComplete,
  StrategyConfigPayload,
} from './types';

type RunBacktestPayload =
  | { strategy_id: string }
  | { config: StrategyConfigPayload };

export function useRunBacktest() {
  return useMutation<BacktestStartResponse, Error, RunBacktestPayload>({
    mutationFn: (payload) => api.post<BacktestStartResponse>('/backtest/run', payload),
  });
}

export function useBacktestResult(runId: string | null) {
  return useQuery<BacktestResult>({
    queryKey: ['backtest', runId],
    queryFn: () => api.get<BacktestResult>(`/backtest/${runId}`),
    enabled: !!runId,
    // Poll every 2 seconds until the run reaches a terminal state.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'complete' || status === 'failed') return false;
      return 2000;
    },
  });
}

// Type guard — narrows BacktestResult to the complete shape.
export function isComplete(r: BacktestResult | undefined): r is BacktestComplete {
  return r?.status === 'complete';
}
