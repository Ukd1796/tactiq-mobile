import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrategyStore } from '../../stores/strategyStore';
import { useBacktestResultFromDb } from '../../db/backtest';
import { Card, Label, Badge, Skeleton } from '../../components/ui';
import { colors, spacing } from '../../lib/theme';

function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

export function BacktestResultsScreen() {
  const { lastBacktestRunId } = useStrategyStore();
  const { data: result, isLoading } = useBacktestResultFromDb(lastBacktestRunId);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {[0,1,2].map(i => <Skeleton key={i} height={100} />)}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>No backtest results available. Run a backtest from the web app first.</Text>
      </SafeAreaView>
    );
  }

  const s = result.summary;

  const summaryItems = [
    { label: 'Total Return',    value: fmtPct(s.total_return_pct),      vs: `Nifty: ${fmtPct(s.benchmark_return_pct)}`,  color: s.total_return_pct >= 0 ? colors.success : colors.destructive },
    { label: 'Max Drawdown',    value: fmtPct(s.max_drawdown_pct),      vs: `Nifty: ${fmtPct(s.benchmark_max_dd_pct)}`,  color: colors.destructive },
    { label: 'Sharpe Ratio',    value: s.sharpe_ratio.toFixed(2),       vs: `Nifty: ${s.benchmark_sharpe.toFixed(2)}`,   color: colors.foreground },
    { label: 'Win Rate',        value: `${s.win_rate_pct.toFixed(0)}%`, vs: `${s.total_trades} trades`,                   color: colors.foreground },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Summary grid */}
        <Card>
          <Label style={{ marginBottom: 12 }}>Performance Summary</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {summaryItems.map(item => (
              <View key={item.label} style={{ width: '47%', backgroundColor: colors.secondary, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.foreground, marginTop: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 10, color: colors.muted, marginTop: 1 }}>{item.vs}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* AI narrative */}
        {result.ai_narrative && (
          <Card>
            <Label style={{ marginBottom: 12 }}>AI Analysis</Label>
            {[
              { title: 'What Worked',    body: result.ai_narrative.what_worked },
              { title: 'What to Watch',  body: result.ai_narrative.what_to_watch },
              { title: 'Bear Behaviour', body: result.ai_narrative.bear_behavior },
              { title: 'Improvement Tip', body: result.ai_narrative.improvement_tip },
            ].map(n => (
              <View key={n.title} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary, marginBottom: 4 }}>{n.title}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>{n.body}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Period breakdown */}
        {result.period_breakdown && result.period_breakdown.length > 0 && (
          <Card>
            <Label style={{ marginBottom: 12 }}>Period Breakdown</Label>
            {result.period_breakdown.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < result.period_breakdown.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.foreground }}>{p.period}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>{p.regime.replace(/_/g, ' ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: p.return_pct >= 0 ? colors.success : colors.destructive }}>
                    {fmtPct(p.return_pct)}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.muted }}>Sharpe {p.sharpe.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
