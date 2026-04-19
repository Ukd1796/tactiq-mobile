import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  PaperTradeSession,
  PaperDashboard,
  PaperPosition,
  PaperSignal,
  PaperWeeklyReport,
  PaperInsights,
} from './types';

export function useStartPaperTrade() {
  return useMutation<PaperTradeSession, Error, { strategy_id: string; starting_capital: number; strategy_name?: string; user_id?: string }>({
    mutationFn: (payload) => api.post<PaperTradeSession>('/paper-trade/start', payload),
  });
}

export function usePaperDashboard(sessionId: string | null) {
  return useQuery<PaperDashboard>({
    queryKey: ['paper-trade', sessionId, 'dashboard'],
    queryFn: () => api.get<PaperDashboard>(`/paper-trade/${sessionId}/dashboard`),
    enabled: !!sessionId,
    refetchInterval: 60_000,
  });
}

export function usePaperPositions(sessionId: string | null) {
  return useQuery<PaperPosition[]>({
    queryKey: ['paper-trade', sessionId, 'positions'],
    queryFn: () => api.get<PaperPosition[]>(`/paper-trade/${sessionId}/positions`),
    enabled: !!sessionId,
  });
}

export function usePaperSignals(sessionId: string | null) {
  return useQuery<PaperSignal[]>({
    queryKey: ['paper-trade', sessionId, 'signals'],
    queryFn: () => api.get<PaperSignal[]>(`/paper-trade/${sessionId}/signals`),
    enabled: !!sessionId,
  });
}

export function usePaperWeeklyReport(sessionId: string | null) {
  return useQuery<PaperWeeklyReport>({
    queryKey: ['paper-trade', sessionId, 'report', 'weekly'],
    queryFn: () => api.get<PaperWeeklyReport>(`/paper-trade/${sessionId}/report/weekly`),
    enabled: !!sessionId,
  });
}

export function usePaperInsights(sessionId: string | null) {
  return useQuery<PaperInsights>({
    queryKey: ['paper-trade', sessionId, 'insights'],
    queryFn: () => api.get<PaperInsights>(`/paper-trade/${sessionId}/insights`),
    enabled: !!sessionId,
    staleTime: 60 * 60 * 1000,  // 1 hour — matches backend cache TTL
    retry: 1,
  });
}
