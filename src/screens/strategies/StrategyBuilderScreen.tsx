import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, Modal,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useStrategyStore } from '../../stores/strategyStore';
import { useUpsertStrategy } from '../../db/strategies';
import { useRunBacktest } from '../../api/backtest';
import { usePatchStrategy } from '../../db/strategies';
import { useMarketRegime, useUniverseStats } from '../../api/market';
import { Button, Card, Badge } from '../../components/ui';
import { StepSlider } from '../../components/ui/StepSlider';
import { colors, spacing, radius } from '../../lib/theme';
import type { StrategyConfigPayload } from '../../api/types';

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'bear-shield',
    name: 'Bear Shield',
    desc: 'Minimal exposure, capital preservation',
    accent: '#EF4444',
    risk: { riskPerTrade: 0.3, maxPosition: 5, pauseThreshold: 3, capitalAmount: 1000000 },
    enabled: { 'mean-reversion': true, 'trend-pullback': false, breakout: false, 'quiet-breakout': false, 'trend-follow': false },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    desc: 'All strategies, moderate risk',
    accent: colors.primary,
    risk: { riskPerTrade: 0.5, maxPosition: 10, pauseThreshold: 5, capitalAmount: 1000000 },
    enabled: { 'trend-follow': true, breakout: true, 'quiet-breakout': true, 'trend-pullback': true, 'mean-reversion': false },
  },
  {
    id: 'bull-rider',
    name: 'Bull Rider',
    desc: 'High conviction, trending markets',
    accent: '#22C55E',
    risk: { riskPerTrade: 1.0, maxPosition: 15, pauseThreshold: 7, capitalAmount: 1000000 },
    enabled: { 'trend-follow': true, breakout: true, 'quiet-breakout': true, 'trend-pullback': true, 'mean-reversion': false },
  },
  {
    id: 'recovery',
    name: 'Recovery',
    desc: 'Bounce plays after corrections',
    accent: '#F59E0B',
    risk: { riskPerTrade: 0.7, maxPosition: 12, pauseThreshold: 6, capitalAmount: 1000000 },
    enabled: { 'mean-reversion': true, 'trend-pullback': true, breakout: false, 'quiet-breakout': false, 'trend-follow': false },
  },
];

const UNIVERSE_LABELS: Record<string, string> = {
  nifty50: 'Nifty 50', nifty100: 'Nifty 100', broad150: 'Broad 150',
};

const UNIVERSES = [
  { id: 'nifty50' as const, name: 'Nifty 50' },
  { id: 'nifty100' as const, name: 'Nifty 100' },
  { id: 'broad150' as const, name: 'Broad 150' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function StrategyBuilderScreen({ navigation }: any) {
  const store = useStrategyStore();
  const upsert = useUpsertStrategy();
  const patchStrategy = usePatchStrategy();
  const runBacktest = useRunBacktest();
  const { data: regime } = useMarketRegime();
  const { data: universeStats } = useUniverseStats();

  const [savedTick, setSavedTick] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(store.strategyName);
  const [showDateModal, setShowDateModal] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);

  // Save handler
  const handleSave = async () => {
    const row = await upsert.mutateAsync();
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2500);
  };

  // Backtest handler
  const handleRunBacktest = async () => {
    setBacktestLoading(true);
    try {
      const config: StrategyConfigPayload = {
        name: store.strategyName,
        universe: store.universe,
        strategies: store.strategies.map(s => ({ id: s.id as any, enabled: s.enabled, floor_weight: s.floor_weight })),
        risk: {
          risk_per_trade_pct: store.risk.riskPerTrade,
          max_position_pct: store.risk.maxPosition,
          pause_threshold_pct: store.risk.pauseThreshold,
          capital_amount: store.risk.capitalAmount,
        },
        backtest_start: `${store.backtestStartYear}-${String(store.backtestStartMonth).padStart(2, '0')}-01`,
        backtest_end: `${store.backtestEndYear}-${String(store.backtestEndMonth).padStart(2, '0')}-01`,
      };
      const { run_id } = await runBacktest.mutateAsync({ config });
      store.setLastBacktestRunId(run_id);
      store.addToBacktestHistory({ runId: run_id, label: store.strategyName });
      if (store.savedStrategyId) {
        patchStrategy.mutate({ last_backtest_run_id: run_id });
      }
      navigation.navigate('BacktestResults');
    } finally {
      setBacktestLoading(false);
    }
  };

  // Apply template
  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    store.setStrategiesEnabled(t.enabled);
    store.setRisk(t.risk);
    store.setStrategyName(t.name);
  };

  const { backtestStartYear, backtestStartMonth, backtestEndYear, backtestEndMonth } = store;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => navigation.navigate('MyStrategies')} style={{ padding: 4 }}>
          <ChevronLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setTempName(store.strategyName); setEditingName(true); }} style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'center' }} numberOfLines={1}>
            {store.strategyName}
          </Text>
        </TouchableOpacity>
        <Button size="sm" onPress={handleSave} loading={upsert.isPending}>
          {savedTick ? 'Saved ✓' : 'Save'}
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>

        {/* Templates */}
        <View>
          <SectionTitle>Templates</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}>
            {TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.8}
                onPress={() => applyTemplate(t)}
                style={{
                  width: 130,
                  padding: 12,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: t.accent + '44',
                  backgroundColor: t.accent + '10',
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent, marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 4 }}>{t.name}</Text>
                <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 15 }}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Universe */}
        <View>
          <SectionTitle>Universe</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {UNIVERSES.map(u => {
              const selected = store.universe === u.id;
              const stats = universeStats?.[u.id];
              return (
                <TouchableOpacity
                  key={u.id}
                  activeOpacity={0.8}
                  onPress={() => store.setUniverse(u.id)}
                  style={{
                    flex: 1, padding: 12, borderRadius: radius.lg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary + '0D' : colors.card,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: selected ? colors.primary : colors.foreground }}>
                    {u.name}
                  </Text>
                  {stats && (
                    <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                      {stats.active}/{stats.total} active
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Strategies */}
        <View>
          <SectionTitle>Strategies</SectionTitle>
          <View style={{ gap: 10 }}>
            {store.strategies.map(s => (
              <Card key={s.id}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 16, marginTop: 2 }}>{s.description}</Text>
                  </View>
                  <Switch
                    value={s.enabled}
                    onValueChange={() => store.toggleStrategy(s.id)}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={s.enabled ? colors.primary : colors.muted}
                  />
                </View>
                {s.enabled && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
                      Floor weight: {s.floor_weight === 0 ? 'AI decides freely' : `Always at least ${s.floor_weight}%`}
                    </Text>
                    <StepSlider
                      value={s.floor_weight}
                      min={0} max={40} step={5}
                      onChange={(v) => store.setFloorWeight(s.id, v)}
                      formatLabel={(v) => v === 0 ? 'Auto' : `${v}%`}
                    />
                  </View>
                )}
              </Card>
            ))}
          </View>
        </View>

        {/* Risk */}
        <View>
          <SectionTitle>Risk</SectionTitle>
          <Card style={{ gap: 20 }}>
            <View>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 6 }}>Capital</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1, borderColor: colors.border,
                borderRadius: radius.md, paddingHorizontal: 12,
              }}>
                <Text style={{ color: colors.muted, marginRight: 4, fontSize: 15 }}>₹</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: colors.foreground, fontFamily: 'Inter_500Medium', paddingVertical: 10 }}
                  keyboardType="numeric"
                  value={String(store.risk.capitalAmount)}
                  onChangeText={(v) => {
                    const n = parseInt(v.replace(/\D/g, ''), 10);
                    if (!isNaN(n) && n > 0) store.setRisk({ capitalAmount: n });
                  }}
                />
              </View>
            </View>
            <RiskSliderRow
              label="Risk per trade"
              hint={`≈ ${fmtINR(store.risk.capitalAmount * store.risk.riskPerTrade / 100)} max loss`}
              value={store.risk.riskPerTrade} min={0.1} max={2.0} step={0.1}
              formatLabel={(v) => `${v.toFixed(1)}%`}
              onChange={(v) => store.setRisk({ riskPerTrade: v })}
            />
            <RiskSliderRow
              label="Max position"
              hint={`≈ ${fmtINR(store.risk.capitalAmount * store.risk.maxPosition / 100)} per stock`}
              value={store.risk.maxPosition} min={5} max={20} step={1}
              formatLabel={(v) => `${v}%`}
              onChange={(v) => store.setRisk({ maxPosition: v })}
            />
            <RiskSliderRow
              label="Pause threshold"
              hint={`Pause if down ${fmtINR(store.risk.capitalAmount * store.risk.pauseThreshold / 100)}`}
              value={store.risk.pauseThreshold} min={2} max={10} step={1}
              formatLabel={(v) => `${v}%`}
              onChange={(v) => store.setRisk({ pauseThreshold: v })}
            />
          </Card>
        </View>

        {/* Market context */}
        {regime && (
          <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '30' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.primary, letterSpacing: 0.8, marginBottom: 6 }}>
              CURRENT MARKET REGIME
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 4 }}>
              {regime.regime.replace(/_/g, ' ')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>{regime.note}</Text>
          </Card>
        )}

        {/* Backtest */}
        <View style={{ marginBottom: spacing.lg }}>
          <SectionTitle>Backtest</SectionTitle>
          <Card style={{ gap: 14 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDateModal(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 12, paddingVertical: 10,
                borderRadius: radius.md, backgroundColor: colors.secondary,
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.muted }}>Period</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                {MONTHS[backtestStartMonth - 1]} {backtestStartYear} – {MONTHS[backtestEndMonth - 1]} {backtestEndYear}
              </Text>
            </TouchableOpacity>
            <Button size="lg" onPress={handleRunBacktest} loading={backtestLoading}>
              Run Backtest
            </Button>
          </Card>
        </View>

      </ScrollView>

      {/* Rename modal */}
      <Modal visible={editingName} transparent animationType="fade">
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000088' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ margin: spacing.lg, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Rename strategy</Text>
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              autoFocus
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
                paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
                color: colors.foreground, fontFamily: 'Inter_500Medium',
                marginBottom: 16,
              }}
              value={tempName}
              onChangeText={setTempName}
              returnKeyType="done"
              onSubmitEditing={() => { store.setStrategyName(tempName.trim() || store.strategyName); setEditingName(false); }}
            />
            <Button size="lg" onPress={() => { store.setStrategyName(tempName.trim() || store.strategyName); setEditingName(false); }}>
              Save name
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date picker modal */}
      <DatePickerModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        startYear={backtestStartYear}
        startMonth={backtestStartMonth}
        endYear={backtestEndYear}
        endMonth={backtestEndMonth}
        onConfirm={(sy, sm, ey, em) => {
          store.setBacktestPeriod(sy, sm, ey, em);
          setShowDateModal(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function RiskSliderRow({ label, hint, value, min, max, step, formatLabel, onChange }: {
  label: string; hint: string;
  value: number; min: number; max: number; step: number;
  formatLabel: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{label}</Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>{hint}</Text>
      </View>
      <StepSlider value={value} min={min} max={max} step={step} onChange={onChange} formatLabel={formatLabel} />
    </View>
  );
}

function DatePickerModal({
  visible, onClose, startYear, startMonth, endYear, endMonth, onConfirm,
}: {
  visible: boolean; onClose: () => void;
  startYear: number; startMonth: number;
  endYear: number; endMonth: number;
  onConfirm: (sy: number, sm: number, ey: number, em: number) => void;
}) {
  const [sy, setSy] = useState(startYear);
  const [sm, setSm] = useState(startMonth);
  const [ey, setEy] = useState(endYear);
  const [em, setEm] = useState(endMonth);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 }, (_, i) => 2019 + i);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000077' }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Backtest period</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.muted} /></TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>START MONTH</Text>
              <PickerRow items={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))} value={sm} onChange={setSm} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>START YEAR</Text>
              <PickerRow items={years.map(y => ({ label: String(y), value: y }))} value={sy} onChange={setSy} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>END MONTH</Text>
              <PickerRow items={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))} value={em} onChange={setEm} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>END YEAR</Text>
              <PickerRow items={years.map(y => ({ label: String(y), value: y }))} value={ey} onChange={setEy} />
            </View>
          </View>

          <Button size="lg" onPress={() => onConfirm(sy, sm, ey, em)}>Confirm</Button>
        </View>
      </View>
    </Modal>
  );
}

function PickerRow({ items, value, onChange }: {
  items: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }} contentContainerStyle={{ gap: 6 }}>
      {items.map(item => (
        <TouchableOpacity
          key={item.value}
          activeOpacity={0.8}
          onPress={() => onChange(item.value)}
          style={{
            paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: value === item.value ? colors.primary : colors.secondary,
            borderWidth: 1,
            borderColor: value === item.value ? colors.primary : colors.border,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: value === item.value ? '#fff' : colors.foreground }}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
