import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStrategyStore } from '../stores/strategyStore';
import { storeToInsert, rowToStoreSlice } from './types';
import type { UserStrategyRow, UserStrategyUpdate } from './types';
import { api } from '../lib/api';

const KEYS = {
  list:   (uid: string) => ['db', 'strategies', uid]        as const,
  detail: (id: string)  => ['db', 'strategies', 'row', id]  as const,
};

// ─── List all strategies for the current user ───────────────────────────────

export function useUserStrategies() {
  const { user } = useAuth();
  return useQuery<UserStrategyRow[], Error>({
    queryKey: KEYS.list(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_strategies')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as UserStrategyRow[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── Upsert (INSERT if new, UPDATE if savedStrategyId exists) ───────────────

export function useUpsertStrategy() {
  const { user }  = useAuth();
  const store     = useStrategyStore();
  const qc        = useQueryClient();

  return useMutation<UserStrategyRow, Error, void>({
    mutationFn: async () => {
      const { savedStrategyId } = store;
      const payload = storeToInsert(store, user!.id);

      if (!savedStrategyId) {
        const { data, error } = await supabase
          .from('user_strategies')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as UserStrategyRow;
      } else {
        const { data, error } = await supabase
          .from('user_strategies')
          .update(payload as UserStrategyUpdate)
          .eq('id', savedStrategyId)
          .select()
          .maybeSingle();
        if (error) throw error;
        // Row was deleted externally — fall back to insert
        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from('user_strategies')
            .insert(payload)
            .select()
            .single();
          if (insertError) throw insertError;
          return inserted as UserStrategyRow;
        }
        return data as UserStrategyRow;
      }
    },
    onSuccess: (row) => {
      store.setSavedStrategyId(row.id);
      qc.invalidateQueries({ queryKey: KEYS.list(user!.id) });
      qc.setQueryData(KEYS.detail(row.id), row);
    },
  });
}

// ─── Delete a strategy by id ────────────────────────────────────────────────

export function useDeleteStrategy() {
  const { user } = useAuth();
  const store    = useStrategyStore();
  const qc       = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      // Backend cascade: cleans SQLite (backtest_runs, llm_decisions, paper_sessions, strategies)
      // and Supabase B related rows (backtest_results, paper_trade_sessions).
      await api.delete(`/strategies/${id}`).catch(() => {
        // Non-fatal if the strategy was never saved to the backend (UUID-only strategies).
      });

      // Delete the Supabase user_strategies row last (RLS-protected, requires user JWT).
      const { error } = await supabase
        .from('user_strategies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, id) => {
      if (store.savedStrategyId === id) store.setSavedStrategyId(null);
      qc.invalidateQueries({ queryKey: KEYS.list(user!.id) });
      qc.removeQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

// ─── Load a strategy into the Zustand store ─────────────────────────────────

export function useLoadStrategy() {
  const store = useStrategyStore();

  return useMutation<UserStrategyRow, Error, string>({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('user_strategies')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`Strategy ${id} not found`);
      return data as UserStrategyRow;
    },
    onSuccess: (row) => {
      store.hydrateFromDb(rowToStoreSlice(row));
    },
  });
}

// ─── Patch a single field on the currently-loaded strategy ──────────────────
// Usage: patchStrategy.mutate({ last_backtest_run_id: runId })

export function usePatchStrategy() {
  const { user } = useAuth();
  const store    = useStrategyStore();
  const qc       = useQueryClient();

  return useMutation<UserStrategyRow, Error, UserStrategyUpdate>({
    mutationFn: async (patch) => {
      const { savedStrategyId } = store;
      if (!savedStrategyId) throw new Error('No strategy saved yet — save before patching');
      const { data, error } = await supabase
        .from('user_strategies')
        .update(patch)
        .eq('id', savedStrategyId)
        .select()
        .single();
      if (error) throw error;
      return data as UserStrategyRow;
    },
    onSuccess: (row) => {
      if (user) qc.invalidateQueries({ queryKey: KEYS.list(user.id) });
      qc.setQueryData(KEYS.detail(row.id), row);
    },
  });
}
