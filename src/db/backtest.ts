import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BacktestComplete } from '../api/types';
import type { BacktestResultRow, BacktestResultSummaryRow } from './types';

const KEYS = {
  byRunId:   (runId: string)                => ['db', 'backtest', runId]                           as const,
  summaries: (userId: string, ids: string[]) => ['db', 'backtest', 'summaries', userId, ...ids]    as const,
};

// ─── Read full result from Supabase (cache-first) ───────────────────────────
// Returns null when not yet cached (cache miss), undefined while loading.

export function useBacktestResultFromDb(runId: string | null) {
  const { user } = useAuth();
  return useQuery<BacktestResultRow | null, Error>({
    queryKey: KEYS.byRunId(runId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backtest_results')
        .select('*')
        .eq('run_id', runId!)
        .maybeSingle();   // returns null (not an error) when no row found
      if (error) throw error;
      return data as BacktestResultRow | null;
    },
    enabled: !!runId && !!user,
    staleTime: Infinity,  // results are immutable once written
    retry: 1,
  });
}

// ─── Save a completed Python result to Supabase (one-shot) ─────────────────

export function useSaveBacktestResult() {
  const { user } = useAuth();
  const qc       = useQueryClient();

  return useMutation<BacktestResultRow | null, Error, BacktestComplete>({
    mutationFn: async (result: BacktestComplete) => {
      const payload = {
        run_id:          result.run_id,
        user_id:         user!.id,
        strategy_id:     result.strategy_id,
        summary:         result.summary,
        config_snapshot: result.config_snapshot,
        ai_narrative:    result.ai_narrative,
        period_breakdown: result.period_breakdown,
        equity_curve:    result.equity_curve,
        trade_log:       result.trade_log,
      };

      const { data, error } = await supabase
        .from('backtest_results')
        .upsert(payload, { onConflict: 'run_id', ignoreDuplicates: true })
        .select()
        .maybeSingle();   // returns null when conflict was ignored (duplicate)

      if (error) throw error;
      return data as BacktestResultRow | null;
    },
    onSuccess: (row) => {
      if (!row) return;  // duplicate was ignored — cache already populated
      qc.setQueryData(KEYS.byRunId(row.run_id), row);
    },
  });
}

// ─── Fetch lightweight summaries for multiple run_ids (for strategy cards) ──
// Uses a column projection — equity_curve and trade_log are NOT fetched.

export function useBacktestSummaries(runIds: string[]) {
  const { user } = useAuth();
  return useQuery<BacktestResultSummaryRow[], Error>({
    queryKey: KEYS.summaries(user?.id ?? '', runIds),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backtest_results')
        .select('run_id, summary, created_at')
        .in('run_id', runIds);
      if (error) throw error;
      return (data ?? []) as BacktestResultSummaryRow[];
    },
    enabled: runIds.length > 0 && !!user,
    staleTime: Infinity,
  });
}
