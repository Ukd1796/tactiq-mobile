import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit2, BarChart2, Trash2, Globe, Shield, TrendingUp } from 'lucide-react-native';
import { useUserStrategies, useDeleteStrategy, useLoadStrategy } from '../../db/strategies';
import { useStrategyStore, defaultStrategies } from '../../stores/strategyStore';
import { Card, Badge, Label, Skeleton, Button } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';
import { RISK_CONFIG } from '../../lib/riskConfig';

const UNIVERSE_LABELS: Record<string, string> = {
  nifty50: 'Nifty 50', nifty100: 'Nifty 100', broad150: 'Broad 150',
};

function fmtINR(n: number) {
  return `₹${(n / 100000).toFixed(1)}L`;
}

export function MyStrategiesScreen({ navigation }: any) {
  const { data: strategies, isLoading } = useUserStrategies();
  const deleteStrategy = useDeleteStrategy();
  const loadStrategy   = useLoadStrategy();
  const store          = useStrategyStore();

  const handleNewStrategy = () => {
    store.setSavedStrategyId(null);
    store.hydrateFromDb({
      universe: 'nifty100',
      strategies: defaultStrategies,
      risk: {
        riskPerTrade: RISK_CONFIG.riskPerTrade.default,
        maxPosition: RISK_CONFIG.maxPosition.default,
        pauseThreshold: RISK_CONFIG.pauseThreshold.default,
        capitalAmount: 1000000,
      },
      strategyName: 'My Strategy',
    });
    navigation.navigate('Step1Universe');
  };

  const handleEdit = async (id: string) => {
    await loadStrategy.mutateAsync(id);
    navigation.navigate('StrategyBuilder');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete strategy?',
      `"${name}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStrategy.mutate(id) },
      ]
    );
  };

  const handleViewResults = async (id: string) => {
    await loadStrategy.mutateAsync(id);
    navigation.navigate('BacktestResults');
  };

  const handlePaperTrade = (id: string) => {
    navigation.getParent()?.navigate('PaperTrade', { strategyId: id });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 }}>
        <Button size="md" onPress={handleNewStrategy}>
          + New Strategy
        </Button>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {isLoading && [0,1].map(i => <Skeleton key={i} height={160} style={{ borderRadius: radius.xl }} />)}

        {!isLoading && strategies && strategies.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <BarChart2 size={32} color={colors.muted} />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 12 }}>
              No strategies saved yet
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 }}>
              Tap "New Strategy" above to build your first strategy.
            </Text>
          </Card>
        )}

        {strategies?.map(row => {
          const enabledCount = row.strategies.filter(s => s.enabled).length;
          const isDeleting   = deleteStrategy.isPending && deleteStrategy.variables === row.id;
          return (
            <Card key={row.id}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{row.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    Saved {new Date(row.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {row.last_backtest_run_id && (
                    <TouchableOpacity
                      onPress={() => handleViewResults(row.id)}
                      style={{ padding: 6, borderRadius: radius.md, backgroundColor: colors.secondary }}
                    >
                      <BarChart2 size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handlePaperTrade(row.id)}
                    style={{ padding: 6, borderRadius: radius.md, backgroundColor: colors.primary + '20' }}
                  >
                    <TrendingUp size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEdit(row.id)}
                    style={{ padding: 6, borderRadius: radius.md, backgroundColor: colors.secondary }}
                  >
                    <Edit2 size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(row.id, row.name)}
                    disabled={isDeleting}
                    style={{ padding: 6, borderRadius: radius.md, backgroundColor: colors.destructive + '15' }}
                  >
                    {isDeleting
                      ? <ActivityIndicator size={16} color={colors.destructive} />
                      : <Trash2 size={16} color={colors.destructive} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stat pills */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md, backgroundColor: colors.primary + '20' }}>
                  <Globe size={12} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'Inter_500Medium' }}>{UNIVERSE_LABELS[row.universe]}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md, backgroundColor: colors.success + '20' }}>
                  <TrendingUp size={12} color={colors.success} />
                  <Text style={{ fontSize: 11, color: colors.success, fontFamily: 'Inter_500Medium' }}>{enabledCount} strategies</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md, backgroundColor: colors.warning + '20' }}>
                  <Shield size={12} color={colors.warning} />
                  <Text style={{ fontSize: 11, color: colors.warning, fontFamily: 'Inter_500Medium' }}>{row.risk.risk_per_trade_pct}% risk</Text>
                </View>
              </View>

              {/* Footer row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>Capital: <Text style={{ color: colors.foreground }}>{fmtINR(row.risk.capital_amount)}</Text></Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Max pos: <Text style={{ color: colors.foreground }}>{row.risk.max_position_pct}%</Text></Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Pause: <Text style={{ color: colors.foreground }}>-{row.risk.pause_threshold_pct}%</Text></Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
