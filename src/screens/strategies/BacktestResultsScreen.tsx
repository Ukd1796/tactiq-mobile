import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, TrendingUp } from 'lucide-react-native';
import { useStrategyStore } from '../../stores/strategyStore';
import { useBacktestResult, isComplete } from '../../api/backtest';
import { useBacktestResultFromDb, useSaveBacktestResult } from '../../db/backtest';
import { Card, Label, Skeleton } from '../../components/ui';
import { colors, spacing } from '../../lib/theme';
import type { BacktestComplete } from '../../api/types';
import type { BacktestResultRow } from '../../db/types';

function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

function rowToComplete(row: BacktestResultRow): BacktestComplete {
  return { ...row, status: 'complete' as const };
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ width: 220, gap: 8 }}>
      <View style={{
        height: 6, borderRadius: 3,
        backgroundColor: colors.secondary,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          height: '100%',
          borderRadius: 3,
          backgroundColor: colors.primary,
          width,
        }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>
        {pct}% complete
      </Text>
    </View>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ status, progressPct }: {
  status: 'starting' | 'queued' | 'running';
  progressPct?: number;
}) {
  const message = status === 'running' ? 'Running backtest…' : 'Starting backtest…';
  const sub = 'Simulating your strategy across historical market regimes';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: spacing.lg }}>
      <Spinner />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
          {message}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
          {sub}
        </Text>
      </View>
      {progressPct !== undefined && progressPct > 0 && (
        <ProgressBar pct={progressPct} />
      )}
    </View>
  );
}

// ─── Simple pulsing spinner ───────────────────────────────────────────────────

function Spinner() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        borderWidth: 3,
        borderColor: colors.primary + '30',
        borderTopColor: colors.primary,
      }} />
    </Animated.View>
  );
}

// ─── Failed state ─────────────────────────────────────────────────────────────

function FailedState({ error }: { error?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: spacing.lg }}>
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: colors.destructive + '1A',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={22} color={colors.destructive} />
      </View>
      <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
        Backtest failed
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18, maxWidth: 280 }}>
        {error ?? 'An unknown error occurred. Please try again.'}
      </Text>
    </View>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────

function ResultsView({ result, onStartPaperTrade }: { result: BacktestComplete; onStartPaperTrade: () => void }) {
  const s = result.summary;

  const summaryItems = [
    { label: 'Total Return',  value: fmtPct(s.total_return_pct),      vs: `Nifty: ${fmtPct(s.benchmark_return_pct)}`,  color: s.total_return_pct >= 0 ? colors.success : colors.destructive },
    { label: 'Max Drawdown',  value: fmtPct(s.max_drawdown_pct),      vs: `Nifty: ${fmtPct(s.benchmark_max_dd_pct)}`,  color: colors.destructive },
    { label: 'Sharpe Ratio',  value: s.sharpe_ratio.toFixed(2),       vs: `Nifty: ${s.benchmark_sharpe.toFixed(2)}`,   color: colors.foreground },
    { label: 'Win Rate',      value: `${s.win_rate_pct.toFixed(0)}%`, vs: `${s.total_trades} trades`,                   color: colors.foreground },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      {/* Summary grid */}
      <Card>
        <Label style={{ marginBottom: 12 }}>Performance Summary</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {summaryItems.map(item => (
            <View key={item.label} style={{
              width: '47%', backgroundColor: colors.secondary,
              borderRadius: 10, padding: 12,
            }}>
              <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: item.color }}>
                {item.value}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.foreground, marginTop: 2 }}>
                {item.label}
              </Text>
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
            { title: 'What Worked',     body: result.ai_narrative.what_worked },
            { title: 'What to Watch',   body: result.ai_narrative.what_to_watch },
            { title: 'Bear Behaviour',  body: result.ai_narrative.bear_behavior },
            { title: 'Improvement Tip', body: result.ai_narrative.improvement_tip },
          ].filter(n => !!n.body).map(n => (
            <View key={n.title} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary, marginBottom: 4 }}>
                {n.title}
              </Text>
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
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: i < result.period_breakdown.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
              <View>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.foreground }}>
                  {p.period}
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted }}>{p.regime.replace(/_/g, ' ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  fontSize: 13, fontFamily: 'Inter_700Bold',
                  color: p.return_pct >= 0 ? colors.success : colors.destructive,
                }}>
                  {fmtPct(p.return_pct)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted }}>Sharpe {p.sharpe.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
      {/* Paper trade CTA */}
      <TouchableOpacity
        onPress={onStartPaperTrade}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          margin: spacing.lg, marginTop: 4,
          paddingVertical: 14, borderRadius: 12,
          backgroundColor: colors.primary,
        }}
      >
        <TrendingUp size={16} color="#fff" />
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>
          Start Paper Trading
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function BacktestResultsScreen({ navigation }: any) {
  const { lastBacktestRunId, savedStrategyId } = useStrategyStore();

  // 1. Supabase cache — always fires when runId is set
  const { data: dbData, isLoading: dbLoading, isError: dbError } = useBacktestResultFromDb(lastBacktestRunId);

  // 2. Python polling — active only when Supabase returned null (cache miss) or errored
  const pythonEnabled = !!lastBacktestRunId && (dbData === null || dbError) && !dbLoading;
  const { data: pythonData } = useBacktestResult(pythonEnabled ? lastBacktestRunId : null);

  // 3. Resolve — prefer Supabase row, fall back to Python live data
  const dbAsComplete = dbData ? rowToComplete(dbData) : null;
  const data = dbAsComplete ?? pythonData;
  const isLoading = dbLoading || (pythonEnabled && !pythonData);

  // 4. One-shot save when Python polling completes
  const saveBacktest = useSaveBacktestResult();
  const hasSavedRef  = useRef(false);
  const prevRunIdRef = useRef<string | null>(null);
  if (prevRunIdRef.current !== lastBacktestRunId) {
    prevRunIdRef.current = lastBacktestRunId;
    hasSavedRef.current  = false;
  }
  useEffect(() => {
    if (!pythonData || pythonData.status !== 'complete') return;
    if (hasSavedRef.current || dbData !== null) return;
    hasSavedRef.current = true;
    saveBacktest.mutate(pythonData);
  }, [pythonData, dbData]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = isComplete(data) ? data : null;

  // ── Render ────────────────────────────────────────────────────────────────

  const renderBody = () => {
    // No run started yet
    if (!lastBacktestRunId) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
            No backtest has been run yet. Configure your strategy and tap Run Backtest.
          </Text>
        </View>
      );
    }

    // Loading DB or waiting for first Python response
    if (isLoading) {
      return <LoadingState status="starting" />;
    }

    // Python returned queued / running
    if (data && (data.status === 'queued' || data.status === 'running')) {
      const progressPct = 'progress_pct' in data ? data.progress_pct : undefined;
      return <LoadingState status={data.status} progressPct={progressPct} />;
    }

    // Failed
    if (data?.status === 'failed') {
      return <FailedState error={'error' in data ? data.error : undefined} />;
    }

    // Complete
    if (complete) {
      const handleStartPaperTrade = () => {
        navigation.getParent()?.navigate('PaperTrade', { strategyId: savedStrategyId });
      };
      return <ResultsView result={complete} onStartPaperTrade={handleStartPaperTrade} />;
    }

    // Skeleton fallback (DB loading first render)
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2].map(i => <Skeleton key={i} height={100} />)}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {renderBody()}
    </SafeAreaView>
  );
}
