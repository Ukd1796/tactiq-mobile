import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaperTradeSessionRow {
  id: string;
  user_id: string;
  session_id: string;        // backend-assigned opaque ID
  strategy_id: string;       // UserStrategyRow.id (soft FK)
  strategy_name: string;     // denormalized for display
  starting_capital: number;
  status: 'active' | 'stopped';
  created_at: string;
}

export type PaperTradeSessionInsert = Omit<PaperTradeSessionRow, 'id' | 'created_at'>;

// ─── Query keys ──────────────────────────────────────────────────────────────

const KEYS = {
  active: (uid: string) => ['db', 'paper-trade', 'active', uid] as const,
};

// ─── Fetch the user's active session (null if none) ──────────────────────────

export function usePaperSession() {
  const { user } = useAuth();
  return useQuery<PaperTradeSessionRow | null, Error>({
    queryKey: KEYS.active(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paper_trade_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PaperTradeSessionRow | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

// ─── Save a new session after the backend creates it ─────────────────────────

export function useCreatePaperSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<PaperTradeSessionRow, Error, PaperTradeSessionInsert>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('paper_trade_sessions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PaperTradeSessionRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.active(user!.id) });
    },
  });
}

// ─── Mark a session as stopped ───────────────────────────────────────────────

export function useStopPaperSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paper_trade_sessions')
        .update({ status: 'stopped' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.active(user!.id) });
    },
  });
}
