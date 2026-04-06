import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { BrokerStatusResponse, ConnectBrokerResponse, BrokerName } from './types';

const KEYS = {
  status: (userId: string | undefined) => ['broker', 'status', userId] as const,
};

// ─── GET /broker/status ───────────────────────────────────────────────────────

export function useBrokerStatus(userId: string | undefined, broker: BrokerName = 'zerodha') {
  return useQuery<BrokerStatusResponse>({
    queryKey: KEYS.status(userId),
    queryFn: () =>
      api.get<BrokerStatusResponse>(`/broker/status?user_id=${userId}&broker=${broker}`),
    enabled: !!userId,
    staleTime: 30_000,
    // Refetch on window focus so token expiry is caught when user returns to tab
    refetchOnWindowFocus: true,
  });
}

// ─── POST /broker/connect/{broker} ───────────────────────────────────────────
// Platform api_key/secret live in backend env vars — frontend only sends user_id.

interface ConnectPayload {
  broker: BrokerName;
  user_id: string;
}

export function useConnectBroker() {
  return useMutation<ConnectBrokerResponse, Error, ConnectPayload>({
    mutationFn: ({ broker, user_id }) =>
      api.post<ConnectBrokerResponse>(`/broker/connect/${broker}`, { user_id }),
  });
}

// ─── DELETE /broker/disconnect ────────────────────────────────────────────────

interface DisconnectPayload {
  user_id: string;
  broker: BrokerName;
}

export function useDisconnectBroker() {
  const qc = useQueryClient();
  return useMutation<{ disconnected: boolean; broker: string }, Error, DisconnectPayload>({
    mutationFn: ({ user_id, broker }) =>
      api.delete(`/broker/disconnect?user_id=${user_id}&broker=${broker}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.status(vars.user_id) });
    },
  });
}
