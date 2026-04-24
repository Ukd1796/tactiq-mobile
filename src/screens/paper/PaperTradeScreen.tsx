import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StopCircle, TrendingUp, ArrowUpDown, CheckCircle2, TrendingDown, X, Info } from 'lucide-react-native';
import { usePaperSessions, useStopPaperSession, useCreatePaperSession, MAX_ACTIVE_SESSIONS } from '../../db/paper_trade';
import { usePaperDashboard, usePaperWeeklyReport, useStartPaperTrade, usePaperInsights } from '../../api/paper_trade';
import { useUserStrategies } from '../../db/strategies';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Label, Badge, Skeleton, Button } from '../../components/ui';
import { colors, spacing, radius, regimeColor } from '../../lib/theme';
import type { PaperPosition, PaperInsights } from '../../api/types';

function fmtINR(n: number) { return `₹${n.toLocaleString('en-IN')}`; }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Tab = 'positions' | 'signals' | 'report' | 'insights';

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

export function PaperTradeScreen({ route }: any) {
  const [tab,            setTab]            = useState<Tab>('positions');
  const [positionSort,   setPositionSort]   = useState<PositionSort>('default');
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [capital,        setCapital]        = useState('100000');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewForm,     setShowNewForm]     = useState(false);
  const [selectedSignal,  setSelectedSignal]  = useState<import('../../api/types').PaperSignal | null>(null);

  // Bottom tabs stay mounted — useState initializer only runs once, so sync
  // params via useEffect to catch navigations to an already-mounted tab.
  const incomingStrategyId = route?.params?.strategyId as string | undefined;
  React.useEffect(() => {
    if (incomingStrategyId) setSelectedId(incomingStrategyId);
  }, [incomingStrategyId]);

  const { user } = useAuth();
  const { data: sessions = [], isLoading: sessionLoading } = usePaperSessions();

  // Auto-select the newest session; respect manual selection
  React.useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
    // If the active session was stopped/removed, fall back to newest
    if (activeSessionId && !sessions.find(s => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0]?.id ?? null);
    }
  }, [sessions]);

  const sessionRow = sessions.find(s => s.id === activeSessionId) ?? null;

  const { data: dashboard, refetch, isRefetching } = usePaperDashboard(sessionRow?.session_id ?? null);
  const { data: weeklyReport } = usePaperWeeklyReport(sessionRow?.session_id ?? null);
  const { data: insights, isLoading: insightsLoading } = usePaperInsights(sessionRow?.session_id ?? null);
  const { data: strategies = [], isLoading: strategiesLoading } = useUserStrategies();
  const stopSession    = useStopPaperSession();
  const startBackend   = useStartPaperTrade();
  const createSession  = useCreatePaperSession();

  const handleStart = () => {
    const strat = strategies.find(s => s.id === selectedId);
    if (!strat || !user) return;
    const startingCapital = Math.max(10000, parseInt(capital, 10) || 100000);
    startBackend.mutate(
      { strategy_id: strat.id, starting_capital: startingCapital, strategy_name: strat.name, user_id: user.id },
      {
        onSuccess: (res) => {
          createSession.mutate(
            {
              user_id:          user.id,
              session_id:       res.session_id,
              strategy_id:      strat.id,
              strategy_name:    strat.name,
              starting_capital: startingCapital,
              status:           'active',
            },
            {
              onSuccess: (row) => {
                setActiveSessionId(row.id);
                setShowNewForm(false);
              },
            }
          );
        },
        onError: (err) => Alert.alert('Failed to start session', err.message),
      }
    );
  };

  const pnlPct = dashboard && sessionRow
    ? ((dashboard.portfolio_value - sessionRow.starting_capital) / sessionRow.starting_capital) * 100
    : null;

  const handleStop = () => {
    Alert.alert(
      'Stop paper trading?',
      'This will end your session. It cannot be resumed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => stopSession.mutate(sessionRow!.id) },
      ]
    );
  };

  const atSessionLimit = sessions.length >= MAX_ACTIVE_SESSIONS;

  // Must be declared before any early returns — Rules of Hooks
  const positions       = Array.isArray(dashboard?.open_positions) ? dashboard!.open_positions : [];
  const signals         = Array.isArray(dashboard?.todays_signals)  ? dashboard!.todays_signals  : [];
  const sortedPositions = useMemo(() => sortPositions(positions, positionSort), [positions, positionSort]);

  if (sessionLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0,1,2].map(i => <Skeleton key={i} height={80} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (sessions.length === 0 || showNewForm) {
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

    const isStarting = startBackend.isPending || createSession.isPending;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {sessions.length > 0 && (
            <TouchableOpacity onPress={() => setShowNewForm(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: colors.primary, fontFamily: 'Inter_500Medium' }}>← Back to sessions</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <TrendingUp size={22} color={colors.primary} />
            <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
              Start Paper Trading
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 4 }}>
            Pick a saved strategy and set your starting capital. Signals will be tracked automatically once the session begins.
          </Text>

          {/* Strategy picker */}
          <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 4 }}>
            Select Strategy
          </Text>
          {strategiesLoading ? (
            <>{[0,1,2].map(i => <Skeleton key={i} height={56} />)}</>
          ) : strategies.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 24 }}>
              No strategies saved yet. Build one in the Strategies tab first.
            </Text>
          ) : strategies.map(s => {
            const selected = selectedId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedId(s.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 14, borderRadius: radius.md, borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '15' : colors.secondary,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{s.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    {s.universe.toUpperCase()} · {s.strategies.length} sub-strateg{s.strategies.length === 1 ? 'y' : 'ies'}
                  </Text>
                </View>
                {selected && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          {/* Starting capital */}
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>
              Starting Capital (₹)
            </Text>
            <TextInput
              value={capital}
              onChangeText={setCapital}
              keyboardType="numeric"
              placeholder="100000"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </View>

          {atSessionLimit && (
            <Text style={{ fontSize: 12, color: colors.warning, textAlign: 'center', marginTop: 4 }}>
              You have {MAX_ACTIVE_SESSIONS} active sessions (the maximum). Stop one before starting another.
            </Text>
          )}
          <Button
            onPress={handleStart}
            loading={isStarting}
            disabled={!selectedId || isStarting || atSessionLimit}
            size="lg"
            style={{ marginTop: 4 }}
          >
            Start Session
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Paper Trading</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{sessionRow?.strategy_name}</Text>
          </View>
          <TouchableOpacity
            onPress={handleStop}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.destructive + '40' }}
          >
            <StopCircle size={14} color={colors.destructive} />
            <Text style={{ fontSize: 12, color: colors.destructive, fontFamily: 'Inter_500Medium' }}>Stop</Text>
          </TouchableOpacity>
        </View>

        {/* Session switcher — only shown when multiple sessions active */}
        {sessions.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {sessions.map(s => {
              const active = s.id === activeSessionId;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => { setActiveSessionId(s.id); setTab('positions'); }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: active ? '#fff' : colors.muted }}>
                    {s.strategy_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!atSessionLimit && (
              <TouchableOpacity
                onPress={() => setShowNewForm(true)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
                  backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>+ New</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Metric strip */}
        {dashboard ? (() => {
          const totalInvested = positions.reduce((sum, p) => sum + p.entry_price * p.quantity, 0);
          const estPnlAbs = positions.reduce((sum, p) => {
            if (p.unrealised_pnl_pct == null) return sum;
            return sum + (p.entry_price * p.quantity * p.unrealised_pnl_pct) / 100;
          }, 0);
          return (
            <View style={{ gap: spacing.sm }}>
              {/* Row 1 */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Card style={{ flex: 1, padding: 10 }}>
                  <Label>Portfolio</Label>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4 }}>
                    {fmtINR(dashboard.portfolio_value)}
                  </Text>
                </Card>
                <Card style={{ flex: 1, padding: 10 }}>
                  <Label>Total P&L</Label>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: pnlPct != null ? (pnlPct >= 0 ? colors.success : colors.destructive) : colors.foreground, marginTop: 4 }}>
                    {pnlPct != null ? fmtPct(pnlPct) : '—'}
                  </Text>
                </Card>
              </View>
              {/* Row 2 */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Card style={{ flex: 1, padding: 10 }}>
                  <Label>Invested</Label>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4 }}>
                    {fmtINR(totalInvested)}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 1 }}>{positions.length} position{positions.length !== 1 ? 's' : ''}</Text>
                </Card>
                <Card style={{ flex: 1, padding: 10 }}>
                  <Label>Unrealised P&L</Label>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: estPnlAbs >= 0 ? colors.success : colors.destructive, marginTop: 4 }}>
                    {estPnlAbs >= 0 ? '+' : ''}{fmtINR(Math.round(estPnlAbs))}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 1 }}>est. from open pos.</Text>
                </Card>
                <Card style={{ flex: 1, padding: 10 }}>
                  <Label>Day</Label>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4 }}>
                    {dashboard.day_count}
                  </Text>
                </Card>
              </View>
            </View>
          );
        })() : (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={64} />
            <Skeleton height={64} />
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
            { key: 'report',    label: 'Weekly',    count: null },
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

        {/* Sort strip — only when on positions tab and there's something to sort */}
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
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
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

        {/* Tab content */}
        {tab === 'positions' && (
          positions.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 32 }}>No open positions</Text>
          ) : sortedPositions.map((p, i) => {
            const invested   = p.entry_price * p.quantity;
            const pnlAbs     = p.unrealised_pnl_pct != null ? (invested * p.unrealised_pnl_pct) / 100 : null;
            // current_price will come from API once exposed; until then estimate it
            const estCurrent = p.unrealised_pnl_pct != null
              ? p.entry_price * (1 + p.unrealised_pnl_pct / 100)
              : null;
            const pnlColor   = p.unrealised_pnl_pct == null ? colors.muted
              : p.unrealised_pnl_pct >= 0 ? colors.success : colors.destructive;

            return (
              <Card key={`${p.symbol}-${p.strategy}-${i}`}>
                {/* Row 1: symbol + P&L % */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{p.symbol}</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: pnlColor }}>
                    {p.unrealised_pnl_pct != null ? fmtPct(p.unrealised_pnl_pct) : '—'}
                  </Text>
                </View>

                {/* Row 2: strategy + absolute P&L */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{p.strategy.replace(/-/g, ' ')} · {p.days_held}d held</Text>
                  {pnlAbs != null && (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: pnlColor }}>
                      {pnlAbs >= 0 ? '+' : ''}{fmtINR(Math.round(pnlAbs))}
                    </Text>
                  )}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 8 }} />

                {/* Row 3: price details */}
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
                    {/* Left: symbol + strategy */}
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
                        {execState && (
                          <Badge label={execState} color={
                            execState === 'FILLED' ? colors.primary :
                            execState === 'PENDING' ? colors.warning : colors.muted
                          } />
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                        {s.strategy.replace(/-/g, ' ')}
                      </Text>
                    </View>
                    {/* Right: price + tap hint */}
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                        {fmtINR(s.entry_price)}
                      </Text>
                      <Info size={14} color={colors.muted} />
                    </View>
                  </View>

                  {/* Detail row */}
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
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
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {/* Signal detail modal */}
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
                    {/* Handle */}
                    <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4 }} />

                    {/* Header */}
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

                    {/* Strategy section */}
                    <View style={{ backgroundColor: colors.secondary, borderRadius: radius.md, padding: 14, gap: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.muted, fontFamily: 'Inter_500Medium' }}>STRATEGY</Text>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                        {s.strategy.replace(/-/g, ' ')}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 18 }}>
                        {isBuy
                          ? `This strategy detected a buy opportunity in ${s.symbol}. The position will be sized according to your risk settings.`
                          : `This strategy triggered an exit signal for ${s.symbol}. The position is being closed to lock in results.`}
                      </Text>
                    </View>

                    {/* Stats grid */}
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {[
                        { label: 'Entry Price', value: fmtINR(s.entry_price) },
                        { label: 'Quantity',    value: s.quantity != null ? `${s.quantity} shares` : '—' },
                        { label: 'Signal Value', value: s.quantity != null ? fmtINR(Math.round(s.entry_price * s.quantity)) : '—' },
                      ].map(item => (
                        <View key={item.label} style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: radius.md, padding: 12, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: colors.muted, textAlign: 'center' }}>{item.label}</Text>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginTop: 4, textAlign: 'center' }}>{item.value}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: radius.md, padding: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Status</Text>
                      <Badge label={s.status} color={
                        s.status === 'BUY'    ? colors.success :
                        s.status === 'SELL'   ? colors.destructive :
                        s.status === 'FILLED' ? colors.primary :
                        s.status === 'PENDING' ? colors.warning : colors.muted
                      } />
                      {s.status === 'FILLED' && (
                        <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>· Order executed successfully</Text>
                      )}
                      {s.status === 'PENDING' && (
                        <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>· Waiting for next market open</Text>
                      )}
                    </View>

                    {/* Notes from backend if present */}
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

        {tab === 'report' && !weeklyReport && (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={80} />
            <Skeleton height={120} />
          </View>
        )}

        {tab === 'report' && weeklyReport && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  {fmtDate(weeklyReport.week_start)} — {fmtDate(weeklyReport.week_end)}
                </Text>
                <Badge label={weeklyReport.regime.replace(/_/g, ' ')} color={regimeColor[weeklyReport.regime] ?? colors.muted} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { l: 'Signals', v: weeklyReport.total_signals },
                  { l: 'Buys',    v: weeklyReport.filled_buys },
                  { l: 'Sells',   v: weeklyReport.filled_sells },
                  { l: 'Pending', v: weeklyReport.pending_signals },
                ].map(s => (
                  <View key={s.l} style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{s.v}</Text>
                    <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{s.l}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {weeklyReport.notable_trades.length > 0 && weeklyReport.notable_trades.map((t, i) => (
              <Card key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{t.symbol}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{t.strategy.replace(/-/g, ' ')} · {fmtDate(t.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Badge label={t.action} color={t.action === 'BUY' ? colors.success : colors.destructive} />
                    {t.pnl_pct != null && (
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: t.pnl_pct >= 0 ? colors.success : colors.destructive, marginTop: 4 }}>
                        {fmtPct(t.pnl_pct)}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ── Insights tab ──────────────────────────────────────────── */}
        {tab === 'insights' && (
          <>
            {/* Signal activity snapshot strip */}
            {insights?.meta && (
              <Card>
                <Label style={{ marginBottom: 12 }}>Signal Activity · 7 days</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    { label: 'Generated', value: insights.meta.signals_7d,      color: colors.foreground },
                    { label: 'Filled',    value: insights.meta.signals_filled,   color: colors.success },
                    { label: 'Blocked',   value: insights.meta.signals_blocked,  color: insights.meta.signals_blocked > 0 ? colors.warning : colors.muted },
                    { label: 'Pending',   value: insights.meta.signals_pending,  color: colors.muted },
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

            {/* AI narrative cards */}
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
                  { title: 'Signal Health',    body: insights.signal_health },
                  { title: 'Position Insight', body: insights.position_insight },
                  { title: 'Market Regime',    body: insights.regime_context },
                  { title: 'Strategy Tip',     body: insights.strategy_tip },
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
      </ScrollView>
    </SafeAreaView>
  );
}
