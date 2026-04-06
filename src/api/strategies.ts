import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { StrategyConfigPayload, SaveStrategyResponse, SavedStrategy } from './types';

export function useSaveStrategy() {
  return useMutation<SaveStrategyResponse, Error, StrategyConfigPayload>({
    mutationFn: (payload) => api.post<SaveStrategyResponse>('/strategies', payload),
  });
}

export function useStrategy(id: string | null) {
  return useQuery<SavedStrategy>({
    queryKey: ['strategies', id],
    queryFn: () => api.get<SavedStrategy>(`/strategies/${id}`),
    enabled: !!id,
  });
}
