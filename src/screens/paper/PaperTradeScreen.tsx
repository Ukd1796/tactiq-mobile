import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StopCircle, TrendingUp } from 'lucide-react-native';
import { usePaperSession, useStopPaperSession } from '../../db/paper_trade';
import { usePaperDashboard, usePaperWeeklyReport } from '../../api/paper_trade';
import { Card, Label, Badge, Skeleton } from '../../components/ui';
import { colors, spacing, regimeColor } from '../../lib/theme';

function fmtINR(n: number) { return `₹${n.toLocaleString('en-IN')}`; }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Tab = 'positions' | 'signals' | 'report';

export function PaperTradeScreen() {
  const [tab, setTab] = useState<Tab>('positions');

  const { data: sessionRow, isLoading: sessionLoading } = usePaperSession();
  const { data: dashboard, refetch, isRefetching } = usePaperDashboard(sessionRow?.session_id ?? null);
  const { data: weeklyReport } = usePaperWeeklyReport(sessionRow?.session_id ?? null);
  const stopSession = useStopPaperSession();

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

  if (sessionLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0,1,2].map(i => <Skeleton key={i} height={80} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionRow) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <TrendingUp size={40} color={colors.primary} />
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, textAlign: 'center', marginTop: 16 }}>
          No Active Session
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          Start a paper trading session from the web app to track live signals here.
        </Text>
      </SafeAreaView>
    );
  }

  const positions = Array.isArray(dashboard?.open_positions) ? dashboard!.open_positions : [];
  const signals   = Array.isArray(dashboard?.todays_signals)  ? dashboard!.todays_signals  : [];

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
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{sessionRow.strategy_name}</Text>
          </View>
          <TouchableOpacity
            onPress={handleStop}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.destructive + '40' }}
          >
            <StopCircle size={14} color={colors.destructive} />
            <Text style={{ fontSize: 12, color: colors.destructive, fontFamily: 'Inter_500Medium' }}>Stop</Text>
          </TouchableOpacity>
        </View>

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
        <View style={{ flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 10, padding: 3 }}>
          {([
            { key: 'positions', label: `Positions (${positions.length})` },
            { key: 'signals',   label: `Signals (${signals.length})` },
            { key: 'report',    label: 'Weekly' },
          ] as { key: Tab; label: string }[]).map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                backgroundColor: tab === t.key ? colors.card : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: tab === t.key ? colors.foreground : colors.muted }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {tab === 'positions' && (
          positions.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 32 }}>No open positions</Text>
          ) : positions.map((p, i) => {
            const invested   = p.entry_price * p.quantity;
            const pnlAbs     = p.unrealised_pnl_pct != null ? (invested * p.unrealised_pnl_pct) / 100 : null;
            // current_price will come from API once exposed; until then estimate it
            const estCurrent = p.unrealised_pnl_pct != null
              ? p.entry_price * (1 + p.unrealised_pnl_pct / 100)
              : null;
            const pnlColor   = p.unrealised_pnl_pct == null ? colors.muted
              : p.unrealised_pnl_pct >= 0 ? colors.success : colors.destructive;

            return (
              <Card key={`${p.symbol}-${i}`}>
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
          ) : signals.map(s => (
            <Card key={s.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground }}>{s.symbol}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{s.strategy.replace(/-/g, ' ')} · {fmtDate(s.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={s.status} color={
                    s.status === 'BUY' ? colors.success :
                    s.status === 'SELL' ? colors.destructive :
                    s.status === 'FILLED' ? colors.primary : colors.muted
                  } />
                  <Text style={{ fontSize: 11, color: colors.muted }}>{fmtINR(s.entry_price)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

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
      </ScrollView>
    </SafeAreaView>
  );
}
