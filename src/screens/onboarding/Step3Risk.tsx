import React from 'react';
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrategyStore } from '../../stores/strategyStore';
import { Button } from '../../components/ui';
import { StepSlider } from '../../components/ui/StepSlider';
import { colors, spacing, radius } from '../../lib/theme';
import { StepIndicator } from './Step1Universe';

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function Step3Risk({ navigation }: any) {
  const { risk, setRisk } = useStrategyStore();

  const maxLossPerTrade = risk.capitalAmount * (risk.riskPerTrade / 100);
  const perStockAmount  = risk.capitalAmount * (risk.maxPosition / 100);
  const pauseAtAmount   = risk.capitalAmount * (risk.pauseThreshold / 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator current={3} total={4} />

          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 6 }}>
            Set your risk limits
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 24 }}>
            These limits cap your downside. Tighter = fewer trades.
          </Text>

          {/* Capital */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 8 }}>
              Capital amount
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
              borderRadius: radius.lg, backgroundColor: colors.card,
              paddingHorizontal: 14,
            }}>
              <Text style={{ fontSize: 16, color: colors.muted, fontFamily: 'Inter_500Medium', marginRight: 4 }}>₹</Text>
              <TextInput
                style={{
                  flex: 1, fontSize: 16, color: colors.foreground,
                  fontFamily: 'Inter_500Medium', paddingVertical: 13,
                }}
                keyboardType="numeric"
                value={String(risk.capitalAmount)}
                onChangeText={(v) => {
                  const n = parseInt(v.replace(/\D/g, ''), 10);
                  if (!isNaN(n) && n > 0) setRisk({ capitalAmount: n });
                }}
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Risk per trade */}
          <SliderRow
            label="Risk per trade"
            hint={`≈ ${fmtINR(maxLossPerTrade)} max loss per trade`}
            value={risk.riskPerTrade}
            min={0.1} max={2.0} step={0.1}
            formatLabel={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => setRisk({ riskPerTrade: v })}
          />

          {/* Max position */}
          <SliderRow
            label="Max single position"
            hint={`≈ ${fmtINR(perStockAmount)} per stock`}
            value={risk.maxPosition}
            min={5} max={20} step={1}
            formatLabel={(v) => `${v}%`}
            onChange={(v) => setRisk({ maxPosition: v })}
          />

          {/* Weekly pause */}
          <SliderRow
            label="Weekly pause threshold"
            hint={`Pause new buys if portfolio drops ${fmtINR(pauseAtAmount)}`}
            value={risk.pauseThreshold}
            min={2} max={10} step={1}
            formatLabel={(v) => `${v}%`}
            onChange={(v) => setRisk({ pauseThreshold: v })}
          />
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
        <Button size="lg" onPress={() => navigation.navigate('Step4Name')} style={{ flex: 2 }}>
          Next →
        </Button>
      </View>
    </SafeAreaView>
  );
}

function SliderRow({
  label, hint, value, min, max, step, formatLabel, onChange,
}: {
  label: string; hint: string;
  value: number; min: number; max: number; step: number;
  formatLabel: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 10 }}>{hint}</Text>
      <StepSlider value={value} min={min} max={max} step={step} onChange={onChange} formatLabel={formatLabel} />
    </View>
  );
}
