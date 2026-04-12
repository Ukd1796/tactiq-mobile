import React from 'react';
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrategyStore } from '../../stores/strategyStore';
import { Button, Card } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';
import { StepIndicator } from './Step1Universe';

const UNIVERSE_LABELS: Record<string, string> = {
  nifty50: 'Nifty 50', nifty100: 'Nifty 100', broad150: 'Broad 150',
};

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function Step4Name({ navigation }: any) {
  const { strategyName, setStrategyName, universe, strategies, risk, setSavedStrategyId } = useStrategyStore();
  const enabledStrategies = strategies.filter(s => s.enabled);

  const handleGotoBuilder = () => {
    setSavedStrategyId(null); // new strategy
    navigation.navigate('StrategyBuilder');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator current={4} total={4} />

          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 6 }}>
            Name your strategy
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 24 }}>
            Give it a memorable name — you can always rename it later.
          </Text>

          {/* Name input */}
          <TextInput
            style={{
              fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.foreground,
              borderWidth: 2, borderColor: colors.primary, borderRadius: radius.lg,
              backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14,
              marginBottom: 28,
            }}
            value={strategyName}
            onChangeText={setStrategyName}
            placeholder="My First Strategy"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />

          {/* Summary card */}
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.muted, marginBottom: 10, letterSpacing: 0.5 }}>
            SUMMARY
          </Text>
          <Card style={{ gap: 14 }}>
            <SummaryRow label="Universe" value={UNIVERSE_LABELS[universe] ?? universe} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow
              label="Strategies"
              value={`${enabledStrategies.length} enabled`}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -8 }}>
              {enabledStrategies.map(s => (
                <View key={s.id} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.primary + '20' }}>
                  <Text style={{ fontSize: 10, color: colors.primary, fontFamily: 'Inter_500Medium' }}>{s.name}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label="Capital" value={fmtINR(risk.capitalAmount)} />
            <SummaryRow label="Risk per trade" value={`${risk.riskPerTrade}%`} />
            <SummaryRow label="Max position" value={`${risk.maxPosition}%`} />
            <SummaryRow label="Pause at" value={`-${risk.pauseThreshold}%`} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: spacing.lg, backgroundColor: colors.background,
        borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        <Button size="lg" variant="outline" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
          ← Back
        </Button>
        <Button
          size="lg"
          onPress={handleGotoBuilder}
          disabled={!strategyName.trim()}
          style={{ flex: 2 }}
        >
          Go to Builder →
        </Button>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{value}</Text>
    </View>
  );
}
