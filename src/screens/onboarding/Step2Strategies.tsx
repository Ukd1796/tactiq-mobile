import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrategyStore } from '../../stores/strategyStore';
import { Button } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';
import { StepIndicator } from './Step1Universe';

export function Step2Strategies({ navigation }: any) {
  const { strategies, toggleStrategy } = useStrategyStore();
  const enabledCount = strategies.filter(s => s.enabled).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <StepIndicator current={2} total={4} />

        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 6 }}>
          Choose your strategies
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 24 }}>
          Enable the patterns you want to scan for. Each runs independently.
        </Text>

        <View style={{ gap: 12 }}>
          {strategies.map(s => (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.85}
              onPress={() => toggleStrategy(s.id)}
              style={{
                padding: 16,
                borderRadius: radius.xl,
                borderWidth: s.enabled ? 2 : 1,
                borderColor: s.enabled ? colors.primary : colors.border,
                backgroundColor: s.enabled ? colors.primary + '0D' : colors.card,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 4 }}>
                    {s.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 10 }}>
                    {s.description}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.secondary }}>
                      <Text style={{ fontSize: 10, color: colors.muted, fontFamily: 'Inter_500Medium' }}>
                        Best in: {s.bestIn}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.secondary }}>
                      <Text style={{ fontSize: 10, color: colors.muted, fontFamily: 'Inter_500Medium' }}>
                        Hold: {s.holdPeriod}
                      </Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={() => toggleStrategy(s.id)}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={s.enabled ? colors.primary : colors.muted}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: spacing.lg, backgroundColor: colors.background,
        borderTopWidth: 1, borderTopColor: colors.border,
        flexDirection: 'row', gap: 12,
      }}>
        <Button
          size="lg"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ flex: 1 }}
        >
          ← Back
        </Button>
        <Button
          size="lg"
          onPress={() => navigation.navigate('Step3Risk')}
          disabled={enabledCount === 0}
          style={{ flex: 2 }}
        >
          Next →
        </Button>
      </View>
    </SafeAreaView>
  );
}
