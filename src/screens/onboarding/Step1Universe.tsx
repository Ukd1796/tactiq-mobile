import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStrategyStore } from '../../stores/strategyStore';
import { Button } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';

const UNIVERSES = [
  {
    id: 'nifty50' as const,
    name: 'Nifty 50',
    description: 'India\'s 50 largest companies. Highest quality, lowest volatility.',
    tag: 'Conservative',
    tagColor: colors.primary,
  },
  {
    id: 'nifty100' as const,
    name: 'Nifty 100',
    description: 'Top 100 stocks — the sweet spot of quality and opportunity.',
    tag: 'Recommended',
    tagColor: colors.success,
    recommended: true,
  },
  {
    id: 'broad150' as const,
    name: 'Broad 150',
    description: 'Nifty 100 + Midcap 50. More signals, more volatility.',
    tag: 'More active',
    tagColor: colors.warning,
  },
];

export function Step1Universe({ navigation }: any) {
  const { universe, setUniverse } = useStrategyStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <StepIndicator current={1} total={4} />

        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 6 }}>
          Pick your universe
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 24 }}>
          Which stocks should your strategy scan? You can change this later.
        </Text>

        <View style={{ gap: 12 }}>
          {UNIVERSES.map(u => {
            const selected = universe === u.id;
            return (
              <TouchableOpacity
                key={u.id}
                activeOpacity={0.8}
                onPress={() => setUniverse(u.id)}
                style={{
                  padding: 16,
                  borderRadius: radius.xl,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '0D' : colors.card,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{u.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {u.recommended && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.success + '20' }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.success }}>★ Recommended</Text>
                      </View>
                    )}
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: u.tagColor + '20' }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: u.tagColor }}>{u.tag}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>{u.description}</Text>
                {selected && (
                  <View style={{ marginTop: 10, height: 2, backgroundColor: colors.primary, borderRadius: 1, width: 32 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: spacing.lg, backgroundColor: colors.background,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Button size="lg" onPress={() => navigation.navigate('Step2Strategies')}>
          Next →
        </Button>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared step indicator ────────────────────────────────────────────────────

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            backgroundColor: i < current ? colors.primary : colors.secondary,
          }}
        />
      ))}
      <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4, fontFamily: 'Inter_500Medium' }}>
        {current}/{total}
      </Text>
    </View>
  );
}
