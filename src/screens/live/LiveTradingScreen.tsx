import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, Modal, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  CheckCircle2, AlertTriangle, Link2, ShieldCheck, RefreshCw, Zap,
  TrendingUp, TrendingDown, ArrowUpDown, StopCircle, X, Info,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useBrokerStatus, useConnectBroker, useDisconnectBroker } from '../../api/broker';
import { useLiveSession, useCreatePaperSession, useStopPaperSession } from '../../db/paper_trade';
import { useStartPaperTrade, usePaperDashboard, usePaperInsights } from '../../api/paper_trade';
import { useUserStrategies } from '../../db/strategies';
import { Button, Card, Label, Badge, Skeleton } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';
import type { UserStrategyRow } from '../../db/types';
import type { PaperPosition, PaperSignal } from '../../api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) { return `₹${n.toLocaleString('en-IN')}`; }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

type Tab = 'positions' | 'signals' | 'insights';

type PositionSort =
  | 'default'
  | 'pnl_desc'
  | 'pnl_asc'
  | 'invested_desc'
  | 'invested_asc'
  | 'held_desc';

const SORT_OPTIONS: { key: PositionSort; label: string }[] = [
  { key: 'default',       label: 'Default'       },
  { key: 'pnl_desc',      label: 'Best P&L'      },
  { key: 'pnl_asc',       label: 'Worst P&L'     },
  { key: 'invested_desc', label: 'Most Invested'  },
  { key: 'invested_asc',  label: 'Least Invested' },
  { key: 'held_desc',     label: 'Longest Held'   },
];

function sortPositions(positions: PaperPosition[], sort: PositionSort): PaperPosition[] {
  const arr = [...positions];
  switch (sort) {
    case 'pnl_desc':
      return arr.sort((a, b) => (b.unrealised_pnl_pct ?? -Infinity) - (a.unrealised_pnl_pct ?? -Infinity));
    case 'pnl_asc':
      return arr.sort((a, b) => (a.unrealised_pnl_pct ?? Infinity) - (b.unrealised_pnl_pct ?? Infinity));
    case 'invested_desc':
      return arr.sort((a, b) => (b.entry_price * b.quantity) - (a.entry_price * a.quantity));
    case 'invested_asc':
      return arr.sort((a, b) => (a.entry_price * a.quantity) - (b.entry_price * b.quantity));
    case 'held_desc':
      return arr.sort((a, b) => b.days_held - a.days_held);
    default:
      return arr;
  }
}

const inputStyle = {
  backgroundColor: colors.secondary,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: colors.foreground,
  fontFamily: 'Inter_400Regular',
} as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export function LiveTradingScreen() {
  const { user } = useAuth();

  const { data: brokerStatus, isLoading, refetch: refetchStatus } = useBrokerStatus(user?.id);
  const { data: liveSession, refetch: refetchSession }   = useLiveSession();
  const { data: strategies = [] } = useUserStrategies();

  const connectBroker    = useConnectBroker();
  const disconnectBroker = useDisconnectBroker();
  const startTrade       = useStartPaperTrade();
  const createSession    = useCreatePaperSession();
  const stopSession      = useStopPaperSession();

  // Dashboard data for the active live session
  const { data: dashboard, refetch: refetchDashboard, isRefetching } = usePaperDashboard(
    liveSession?.session_id ?? null,
  );
  const { data: insights, isLoading: insightsLoading } = usePaperInsights(
    liveSession?.session_id ?? null,
  );

  // Tab state
  const [tab,           setTab]           = useState<Tab>('positions');
  const [positionSort,  setPositionSort]  = useState<PositionSort>('default');
  const [selectedSignal, setSelectedSignal] = useState<PaperSignal | null>(null);

  // OAuth polling state
  const [isPolling,     setIsPolling]     = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connectError,  setConnectError]  = useState<string | null>(null);

  // Live session creation form state
  const [selectedStrategy, setSelectedStrategy] = useState<UserStrategyRow | null>(null);
  const [capital,           setCapital]           = useState('100000');
  const [startingSession,   setStartingSession]   = useState(false);
  const [sessionError,      setSessionError]      = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (brokerStatus?.connected && brokerStatus.token_valid) stopPolling();
  }, [brokerStatus, stopPolling]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
    let attempts = 0;
    pollingRef.current = setInterval(() => {
      attempts++;
      refetchStatus();
      if (attempts >= 30) stopPolling();
    }, 3000);
  }, [refetchStatus, stopPolling]);

  const handleConnect = useCallback(async () => {
    if (!user) return;
    setConnectError(null);
    try {
      const result = await connectBroker.mutateAsync({ broker: 'zerodha', user_id: user.id });
      await Linking.openURL(result.login_url);
      startPolling();
    } catch (err: any) {
      setConnectError(err?.message ?? 'Failed to reach the server. Check your connection.');
    }
  }, [user, connectBroker, startPolling]);

  const handleDisconnect = useCallback(() => {
    if (!user) return;
    disconnectBroker.mutate({ user_id: user.id, broker: 'zerodha' });
  }, [user, disconnectBroker]);

  const handleStartLiveSession = useCallback(async () => {
    if (!user || !selectedStrategy) return;
    const cap = parseFloat(capital);
    if (isNaN(cap) || cap < 10_000) return;

    setStartingSession(true);
    setSessionError(null);
    try {
      const session = await startTrade.mutateAsync({
        strategy_id:      selectedStrategy.id,
        strategy_name:    selectedStrategy.name,
        starting_capital: cap,
        user_id:          user.id,
        live_mode:        true,
        broker:           'zerodha',
      } as any);

      await createSession.mutateAsync({
        user_id:          user.id,
        session_id:       session.session_id,
        strategy_id:      selectedStrategy.id,
        strategy_name:    selectedStrategy.name,
        starting_capital: cap,
        status:           'active',
        live_mode:        true,
        broker:           'zerodha',
      });
      refetchSession();
    } catch (err: any) {
      setSessionError(err?.message ?? 'Failed to start live session.');
    } finally {
      setStartingSession(false);
    }
  }, [user, selectedStrategy, capital, startTrade, createSession, refetchSession]);

  const handleStopSession = useCallback(() => {
    if (!liveSession) return;
    Alert.alert(
      'Stop live trading?',
      'This will end your live session. Real orders already placed will not be cancelled — manage those directly in Zerodha.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => stopSession.mutate(liveSession.id) },
      ]
    );
  }, [liveSession, stopSession]);

  // Derived dashboard data
  const positions       = Array.isArray(dashboard?.open_positions) ? dashboard!.open_positions : [];
  const signals         = Array.isArray(dashboard?.todays_signals)  ? dashboard!.todays_signals  : [];
  const sortedPositions = useMemo(() => sortPositions(positions, positionSort), [positions, positionSort]);
  const totalPnlAbs     = dashboard?.total_pnl_abs ?? null;
  const pnlPct          = dashboard?.total_pnl_pct ?? null;
  const investedPnlPct  = dashboard?.invested_pnl_pct ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            liveSession
              ? <RefreshControl refreshing={isRefetching} onRefresh={refetchDashboard} tintColor={colors.primary} />
              : undefined
          }
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          {liveSession ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                  Live Trading
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {liveSession.strategy_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleStopSession}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  borderWidth: 1, borderColor: colors.destructive + '40',
                }}
              >
                <StopCircle size={14} color={colors.destructive} />
                <Text style={{ fontSize: 12, color: colors.destructive, fontFamily: 'Inter_500Medium' }}>Stop</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                Live Trading
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                Connect your Zerodha account to trade with real money
              </Text>
            </View>
          )}

          {/* ── Broker status strip (always visible) ───────────────────── */}
          {!isLoading && brokerStatus?.connected && brokerStatus.token_valid && (
            <Card style={{ borderColor: colors.success + '40', backgroundColor: colors.success + '08', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Zerodha Connected
                </Text>
                {brokerStatus.broker_user_id && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    · {brokerStatus.broker_user_id}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                Token valid · expires midnight IST ·{' '}
                <Text
                  style={{ color: colors.destructive, textDecorationLine: 'underline' }}
                  onPress={handleDisconnect}
                >
                  Disconnect
                </Text>
              </Text>
            </Card>
          )}

          {/* ── Not connected ─────────────────────────────────────────────── */}
          {!isLoading && !brokerStatus?.connected && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Link2 size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Connect Zerodha
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 16, lineHeight: 18 }}>
                Tap the button below to log in with your Zerodha account. Your browser will open — after
                authorizing, return here and we'll detect the connection automatically.
              </Text>

              {isPolling ? (
                <View style={{ alignItems: 'center', paddingVertical: 12, gap: 8 }}>
                  <RefreshCw size={20} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Waiting for Zerodha authorization…
                  </Text>
                  <TouchableOpacity onPress={stopPolling}>
                    <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Button
                    onPress={handleConnect}
                    loading={connectBroker.isPending}
                    style={{ marginBottom: 12 }}
                  >
                    Login with Zerodha →
                  </Button>

                  {connectError && (
                    <View style={{
                      backgroundColor: colors.destructive + '18',
                      borderRadius: radius.md,
                      padding: 10,
                      marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 12, color: colors.destructive, lineHeight: 17 }}>
                        {connectError}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={13} color={colors.muted} />
                    <Text style={{ fontSize: 11, color: colors.muted, flex: 1 }}>
                      Your Zerodha credentials are never shared with TacTiq — you log in directly on Zerodha's
                      secure site.
                    </Text>
                  </View>
                </>
              )}
            </Card>
          )}

          {/* ── Token expired ─────────────────────────────────────────────── */}
          {!isLoading && brokerStatus?.connected && !brokerStatus.token_valid && (
            <Card style={{ borderColor: colors.warning + '40', backgroundColor: colors.warning + '08' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={20} color={colors.warning} />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Re-authenticate Required
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                Zerodha tokens expire every midnight IST. Re-authenticate before 9:15 AM so today's orders
                go through.
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4, marginBottom: 14 }}>
                Last authenticated: {fmtDate(brokerStatus.token_fetched_at)}
              </Text>

              {isPolling ? (
                <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
                  <RefreshCw size={18} color={colors.warning} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>Waiting for re-authorization…</Text>
                  <TouchableOpacity onPress={stopPolling}>
                    <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Button onPress={handleConnect} loading={connectBroker.isPending}>
                    Re-authenticate with Zerodha →
                  </Button>
                  {connectError && (
                    <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 8 }}>
                      {connectError}
                    </Text>
                  )}
                </>
              )}
            </Card>
          )}

          {/* ── Connected: session creation form ──────────────────────────── */}
          {!isLoading && brokerStatus?.connected && brokerStatus.token_valid && !liveSession && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Zap size={16} color={colors.primary} />
                <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Start Live Session
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 18 }}>
                Live sessions are separate from your paper trades — real orders will be placed via Zerodha.
                Starting capital is used for position sizing only; actual orders draw from your Zerodha account balance.
              </Text>

              {/* Strategy picker */}
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>
                Strategy
              </Text>
              {strategies.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                  No saved strategies — create one in the Strategies tab first.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {strategies.map((s) => {
                    const active = selectedStrategy?.id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedStrategy(s)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary + '18' : colors.secondary,
                        }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                          color: active ? colors.primary : colors.foreground,
                        }}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Capital input */}
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>
                Sizing Capital (₹) — used for position sizing math only
              </Text>
              <TextInput
                value={capital}
                onChangeText={setCapital}
                keyboardType="numeric"
                placeholder="e.g. 100000"
                placeholderTextColor={colors.muted}
                style={{ ...inputStyle, marginBottom: 14 }}
              />

              {sessionError && (
                <Text style={{ fontSize: 12, color: colors.destructive, marginBottom: 8 }}>
                  {sessionError}
                </Text>
              )}
              <Button
                onPress={handleStartLiveSession}
                loading={startingSession}
                disabled={!selectedStrategy || !capital || parseFloat(capital) < 10_000}
              >
                Start Live Session →
              </Button>
            </Card>
          )}

          {/* ── Connected: live session dashboard ─────────────────────────── */}
          {liveSession && (
            <>
              {/* Metric strip */}
              {dashboard ? (() => {
                const totalPnlColor    = totalPnlAbs != null ? (totalPnlAbs >= 0 ? colors.success : colors.destructive) : colors.foreground;
                const investedPnlColor = investedPnlPct != null ? (investedPnlPct >= 0 ? colors.success : colors.destructive) : colors.foreground;
                const dayColor         = dashboard.one_day_pnl_abs != null ? (dashboard.one_day_pnl_abs >= 0 ? colors.success : colors.destructive) : colors.foreground;
                const unrealisedAbs    = dashboard.unrealised_pnl_abs;
                return (
                  <View style={{ gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Card style={{ flex: 1, padding: 12 }}>
                        <Label>Open Positions</Label>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: investedPnlColor, marginTop: 4 }}>
                          {unrealisedAbs != null
                            ? `${unrealisedAbs >= 0 ? '+' : ''}${fmtINR(Math.round(unrealisedAbs))}`
                            : '—'}
                        </Text>
                        {investedPnlPct != null && (
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: investedPnlColor, marginTop: 2 }}>
                            {fmtPct(investedPnlPct)}
                          </Text>
                        )}
                        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                          of {fmtINR(Math.round(dashboard.total_invested))} deployed
                        </Text>
                      </Card>
                      <Card style={{ flex: 1, padding: 12 }}>
                        <Label>Total P&L</Label>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: totalPnlColor, marginTop: 4 }}>
                          {totalPnlAbs != null ? `${totalPnlAbs >= 0 ? '+' : ''}${fmtINR(Math.round(totalPnlAbs))}` : '—'}
                        </Text>
                        {pnlPct != null && (
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: totalPnlColor, marginTop: 2 }}>
                            {fmtPct(pnlPct)}
                          </Text>
                        )}
                        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                          of {fmtINR(Math.round(dashboard.starting_capital))} capital
                        </Text>
                      </Card>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Card style={{ flex: 1, padding: 12 }}>
                        <Label>1-Day P&L</Label>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: dayColor, marginTop: 4 }}>
                          {dashboard.one_day_pnl_abs != null
                            ? `${dashboard.one_day_pnl_abs >= 0 ? '+' : ''}${fmtINR(Math.round(dashboard.one_day_pnl_abs))}`
                            : '—'}
                        </Text>
                        {dashboard.one_day_pnl_pct != null && (
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: dayColor, marginTop: 2 }}>
                            {fmtPct(dashboard.one_day_pnl_pct)}
                          </Text>
                        )}
                      </Card>
                      <Card style={{ flex: 1, padding: 12 }}>
                        <Label>Deployed</Label>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4 }}>
                          {fmtINR(Math.round(dashboard.total_invested))}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                          {positions.length} position{positions.length !== 1 ? 's' : ''} · day {dashboard.day_count}
                        </Text>
                      </Card>
                    </View>
                  </View>
                );
              })() : (
                <View style={{ gap: spacing.sm }}>
                  <Skeleton height={72} />
                  <Skeleton height={72} />
                </View>
              )}

              {/* Tab bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {([
                  { key: 'positions', label: 'Positions', count: positions.length },
                  { key: 'signals',   label: 'Signals',   count: signals.length },
                  { key: 'insights',  label: 'Insights',  count: null },
                ] as { key: Tab; label: string; count: number | null }[]).map(t => {
                  const active = tab === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setTab(t.key)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
                        backgroundColor: active ? colors.primary : colors.secondary,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: active ? '#fff' : colors.muted }}>
                        {t.label}
                      </Text>
                      {t.count !== null && (
                        <View style={{
                          backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.border,
                          borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                        }}>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: active ? '#fff' : colors.muted }}>
                            {t.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sort strip */}
              {tab === 'positions' && positions.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 }}>
                    <ArrowUpDown size={12} color={colors.muted} />
                  </View>
                  {SORT_OPTIONS.map(opt => {
                    const active = positionSort === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setPositionSort(opt.key)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
                          backgroundColor: active ? colors.primary : colors.secondary,
                          borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontFamily: active ? 'Inter_600SemiBold' : 'Inter_500Medium',
                          color: active ? '#fff' : colors.muted,
                        }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* ── Positions tab ──────────────────────────────────────── */}
              {tab === 'positions' && (
                sortedPositions.length === 0 ? (
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 32 }}>
                    No open positions yet — orders execute at 9:15 AM on the next trading day.
                  </Text>
                ) : sortedPositions.map((p, i) => {
                  const invested   = p.entry_price * p.quantity;
                  const pnlAbs     = p.unrealised_pnl_pct != null ? (invested * p.unrealised_pnl_pct) / 100 : null;
                  const estCurrent = p.unrealised_pnl_pct != null
                    ? p.entry_price * (1 + p.unrealised_pnl_pct / 100)
                    : null;
                  const pnlColor   = p.unrealised_pnl_pct == null ? colors.muted
                    : p.unrealised_pnl_pct >= 0 ? colors.success : colors.destructive;

                  return (
                    <Card key={`${p.symbol}-${p.strategy}-${i}`}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{p.symbol}</Text>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: pnlColor }}>
                          {p.unrealised_pnl_pct != null ? fmtPct(p.unrealised_pnl_pct) : '—'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>{p.strategy.replace(/-/g, ' ')} · {p.days_held}d held</Text>
                        {pnlAbs != null && (
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: pnlColor }}>
                            {pnlAbs >= 0 ? '+' : ''}{fmtINR(Math.round(pnlAbs))}
                          </Text>
                        )}
                      </View>
                      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 8 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ fontSize: 10, color: colors.muted }}>Entry price</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>{fmtINR(p.entry_price)}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: colors.muted }}>Current price</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: estCurrent != null ? pnlColor : colors.muted, marginTop: 2 }}>
                            {estCurrent != null ? `~${fmtINR(Math.round(estCurrent))}` : '—'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: colors.muted }}>Invested ({p.quantity} qty)</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>{fmtINR(invested)}</Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              )}

              {/* ── Signals tab ────────────────────────────────────────── */}
              {tab === 'signals' && (
                signals.length === 0 ? (
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 32 }}>No signals today</Text>
                ) : signals.map(s => {
                  const direction = s.action ?? (s.status === 'BUY' || s.status === 'SELL' ? s.status : null);
                  const isBuy     = direction === 'BUY';
                  const dirColor  = isBuy ? colors.success : colors.destructive;
                  const execState = s.status === 'FILLED' || s.status === 'PENDING' || s.status === 'CANCELLED' ? s.status : null;
                  return (
                    <TouchableOpacity key={s.id} activeOpacity={0.75} onPress={() => setSelectedSignal(s)}>
                      <Card style={{ borderLeftWidth: 3, borderLeftColor: dirColor }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{s.symbol}</Text>
                              {direction && (
                                <View style={{
                                  flexDirection: 'row', alignItems: 'center', gap: 3,
                                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
                                  backgroundColor: dirColor + '20',
                                }}>
                                  {isBuy
                                    ? <TrendingUp  size={11} color={dirColor} />
                                    : <TrendingDown size={11} color={dirColor} />}
                                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: dirColor }}>{direction}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                              {s.strategy.replace(/-/g, ' ')}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                              {fmtINR(s.entry_price)}
                            </Text>
                            <Info size={14} color={colors.muted} />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                            {s.quantity != null && (
                              <View>
                                <Text style={{ fontSize: 10, color: colors.muted }}>Quantity</Text>
                                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>{s.quantity}</Text>
                              </View>
                            )}
                            {s.quantity != null && (
                              <View>
                                <Text style={{ fontSize: 10, color: colors.muted }}>Value</Text>
                                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>
                                  {fmtINR(Math.round(s.entry_price * s.quantity))}
                                </Text>
                              </View>
                            )}
                            <View>
                              <Text style={{ fontSize: 10, color: colors.muted }}>Date</Text>
                              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 2 }}>{fmtDate(s.date)}</Text>
                            </View>
                          </View>
                          {execState && (
                            <Badge label={execState} color={
                              execState === 'FILLED'  ? colors.primary :
                              execState === 'PENDING' ? colors.warning : colors.muted
                            } />
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* ── Insights tab ───────────────────────────────────────── */}
              {tab === 'insights' && (
                <>
                  {insights?.meta && (
                    <Card>
                      <Label style={{ marginBottom: 12 }}>Signal Activity · 7 days</Label>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {([
                          { label: 'Generated', value: insights.meta.signals_7d,     color: colors.foreground },
                          { label: 'Filled',    value: insights.meta.signals_filled,  color: colors.success },
                          { label: 'Skipped',   value: insights.meta.signals_blocked, color: insights.meta.signals_blocked > 0 ? colors.warning : colors.muted },
                          { label: 'Waiting',   value: insights.meta.signals_pending, color: colors.muted },
                        ] as { label: string; value: number; color: string }[]).map(item => (
                          <View key={item.label} style={{ width: '47%', backgroundColor: colors.secondary, borderRadius: radius.lg, padding: 12 }}>
                            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: item.color }}>{item.value}</Text>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.foreground, marginTop: 2 }}>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                      {insights.meta.positions_at_risk.length > 0 && (
                        <View style={{ marginTop: 12, backgroundColor: colors.destructive + '22', borderRadius: radius.md, padding: 10 }}>
                          <Text style={{ fontSize: 12, color: colors.destructive, fontFamily: 'Inter_600SemiBold' }}>
                            At risk: {insights.meta.positions_at_risk.join(', ')}
                          </Text>
                        </View>
                      )}
                    </Card>
                  )}

                  <Card>
                    <Label style={{ marginBottom: 12 }}>AI Insights</Label>
                    {insightsLoading ? (
                      [1, 2, 3, 4].map(i => (
                        <View key={i} style={{ marginBottom: 14 }}>
                          <Skeleton height={12} style={{ width: '40%', marginBottom: 6 }} />
                          <Skeleton height={13} />
                          <Skeleton height={13} style={{ marginTop: 4, width: '80%' }} />
                        </View>
                      ))
                    ) : insights ? (
                      ([
                        { title: 'What Happened',  body: insights.signal_health },
                        { title: 'Your Portfolio', body: insights.position_insight },
                        { title: 'Market Mood',    body: insights.regime_context },
                        { title: 'What to Watch',  body: insights.strategy_tip },
                      ] as { title: string; body: string }[]).filter(n => !!n.body).map(n => (
                        <View key={n.title} style={{ marginBottom: 14 }}>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary, marginBottom: 4 }}>
                            {n.title}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>{n.body}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: colors.muted, fontSize: 13 }}>
                        Insights are generated after your first signals. Check back after market close.
                      </Text>
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Signal detail modal ─────────────────────────────────────────── */}
      {selectedSignal && (() => {
        const s         = selectedSignal;
        const direction = s.action ?? (s.status === 'BUY' || s.status === 'SELL' ? s.status : null);
        const isBuy     = direction === 'BUY';
        const dirColor  = isBuy ? colors.success : colors.destructive;
        return (
          <Modal transparent animationType="slide" visible onRequestClose={() => setSelectedSignal(null)}>
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
              onPress={() => setSelectedSignal(null)}
            >
              <Pressable onPress={() => {}}>
                <View style={{
                  backgroundColor: colors.background,
                  borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
                  padding: spacing.lg, gap: spacing.md,
                }}>
                  <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{s.symbol}</Text>
                        {direction && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
                            backgroundColor: dirColor + '20',
                          }}>
                            {isBuy
                              ? <TrendingUp  size={13} color={dirColor} />
                              : <TrendingDown size={13} color={dirColor} />}
                            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: dirColor }}>{direction}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{fmtDate(s.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSignal(null)} style={{ padding: 4 }}>
                      <X size={20} color={colors.muted} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ backgroundColor: colors.secondary, borderRadius: radius.md, padding: 14, gap: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.muted, fontFamily: 'Inter_500Medium' }}>STRATEGY</Text>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                      {s.strategy.replace(/-/g, ' ')}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 18 }}>
                      {isBuy
                        ? `This strategy detected a buy opportunity in ${s.symbol}. The position is sized by your risk settings and placed via Zerodha.`
                        : `This strategy triggered an exit signal for ${s.symbol}. The position is being closed via Zerodha.`}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {[
                      { label: 'Entry Price',  value: fmtINR(s.entry_price) },
                      { label: 'Quantity',     value: s.quantity != null ? `${s.quantity} shares` : '—' },
                      { label: 'Signal Value', value: s.quantity != null ? fmtINR(Math.round(s.entry_price * s.quantity)) : '—' },
                    ].map(item => (
                      <View key={item.label} style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: radius.md, padding: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center' }}>{item.label}</Text>
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4, textAlign: 'center' }}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: radius.md, padding: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.muted }}>Status</Text>
                    <Badge label={s.status} color={
                      s.status === 'BUY'     ? colors.success :
                      s.status === 'SELL'    ? colors.destructive :
                      s.status === 'FILLED'  ? colors.primary :
                      s.status === 'PENDING' ? colors.warning : colors.muted
                    } />
                    {s.status === 'FILLED' && (
                      <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>· Order placed via Zerodha</Text>
                    )}
                    {s.status === 'PENDING' && (
                      <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>· Will be placed at next market open</Text>
                    )}
                  </View>

                  {s.notes && (
                    <View style={{ backgroundColor: colors.primary + '15', borderRadius: radius.md, padding: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>Note</Text>
                      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>{s.notes}</Text>
                    </View>
                  )}

                  <View style={{ height: spacing.md }} />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );
}
