import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, TrendingUp, BarChart3, Zap } from 'lucide-react-native';
import { useMarketRegime, useUniverseStats, useStrategyWeights } from '../../api/market';
import { usePaperSession } from '../../db/paper_trade';
import { usePaperDashboard } from '../../api/paper_trade';
import { useStrategyStore } from '../../stores/strategyStore';
import { Card, Badge, Label, StatCard, Skeleton } from '../../components/ui';
import { colors, regimeColor, spacing } from '../../lib/theme';

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function DashboardScreen() {
  const { data: regime,   isLoading: regimeLoading,   refetch: refetchRegime }   = useMarketRegime();
  const { data: universe, isLoading: universeLoading, refetch: refetchUniverse } = useUniverseStats();
  const { strategies, universe: selectedUniverse } = useStrategyStore();

  const enabledInputs = strategies
    .filter(s => s.enabled)
    .map(s => ({ id: s.id, floor_weight: s.floor_weight ?? 0 }));

  const { data: weights } = useStrategyWeights(enabledInputs);
  const { data: paperSession } = usePaperSession();
  const { data: paperDashboard } = usePaperDashboard(paperSession?.session_id ?? null);

  const isRefreshing = regimeLoading || universeLoading;
  const onRefresh = () => { refetchRegime(); refetchUniverse(); };

  const pnlPct = paperDashboard && paperSession
    ? ((paperDashboard.portfolio_value - paperSession.starting_capital) / paperSession.starting_capital) * 100
    : null;

  const regimeClr = regime ? (regimeColor[regime.regime] ?? colors.muted) : colors.muted;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Dashboard</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>Live market conditions</Text>
        </View>

        {/* Regime card */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Shield size={16} color={colors.muted} />
            <Label>Market Regime</Label>
          </View>
          {regimeLoading ? (
            <Skeleton height={28} width="60%" />
          ) : regime ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: regimeClr }} />
                <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                  {regime.regime.replace(/_/g, ' ')}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>as of {regime.as_of_date}</Text>
              {/* Breadth bars */}
              <View style={{ marginTop: 16, gap: 10 }}>
                {[
                  { label: 'Uptrend', pct: regime.breadth_pct_uptrend, clr: colors.success },
                  { label: 'Downtrend', pct: regime.breadth_pct_downtrend, clr: colors.destructive },
                ].map(b => (
                  <View key={b.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>{b.label}</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: b.clr }}>{b.pct.toFixed(1)}%</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: colors.secondary, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${b.pct}%` as any, backgroundColor: b.clr, borderRadius: 2 }} />
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ fontSize: 13, color: colors.muted }}>API offline</Text>
          )}
        </Card>

        {/* Stat row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard
            label="Active Stocks"
            value={universe ? universe[selectedUniverse].active : '—'}
            sub={`of ${universe ? universe[selectedUniverse].total : '—'} today`}
            accent
          />
          <StatCard
            label="Active Strategies"
            value={strategies.filter(s => s.enabled).length}
            sub="of 5 selected"
          />
        </View>

        {/* AI weights */}
        {weights && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Label>AI Capital Weights</Label>
              <Badge
                label={weights.source === 'llm' ? 'Live' : 'Fallback'}
                color={weights.source === 'llm' ? colors.success : colors.warning}
              />
            </View>
            {(Object.entries(weights.weights) as [string, number][])
              .filter(([id]) => strategies.find(s => s.id === id)?.enabled)
              .sort(([, a], [, b]) => b - a)
              .map(([id, w]) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.muted, width: 90 }}>
                    {id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${w * 100}%` as any, backgroundColor: colors.primary, borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.foreground, width: 30, textAlign: 'right' }}>
                    {Math.round(w * 100)}%
                  </Text>
                </View>
              ))
            }
          </Card>
        )}

        {/* Paper trade widget */}
        {paperSession ? (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Label>Paper Trading</Label>
                <Badge label="Live" color={colors.success} />
              </View>
              <TrendingUp size={16} color={colors.muted} />
            </View>
            {paperDashboard ? (
              <>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
                  {fmtINR(paperDashboard.portfolio_value)}
                  {pnlPct != null && (
                    <Text style={{ fontSize: 14, color: pnlPct >= 0 ? colors.success : colors.destructive }}>
                      {'  '}{fmtPct(pnlPct)}
                    </Text>
                  )}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                  Day {paperDashboard.day_count} · {paperDashboard.open_positions.length} positions · {paperDashboard.todays_signals.length} signals today
                </Text>
              </>
            ) : (
              <Skeleton height={24} />
            )}
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Zap size={24} color={colors.primary} />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 10 }}>Paper Trading</Text>
            <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
              Run your strategy on live signals — no real money needed.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
