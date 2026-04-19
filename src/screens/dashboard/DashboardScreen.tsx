import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, Pressable, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, TrendingUp, Zap, LogOut, ChevronDown, Check, BookMarked } from 'lucide-react-native';
import { useMarketRegime, useUniverseStats, useStrategyWeights } from '../../api/market';
import { usePaperSession } from '../../db/paper_trade';
import { usePaperDashboard } from '../../api/paper_trade';
import { useUserStrategies, useLoadStrategy } from '../../db/strategies';
import { useStrategyStore } from '../../stores/strategyStore';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Badge, Label, StatCard, Skeleton } from '../../components/ui';
import { colors, regimeColor, spacing, radius } from '../../lib/theme';

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const UNIVERSE_LABELS: Record<string, string> = {
  nifty50: 'Nifty 50', nifty100: 'Nifty 100', broad150: 'Broad 150',
};

export function DashboardScreen({ navigation }: any) {
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const { user, signOut } = useAuth();

  const initials = (() => {
    const email = user?.email ?? '';
    const name  = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '';
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : '?';
  })();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { setProfileOpen(false); signOut(); } },
    ]);
  };

  const { data: savedStrategies, isLoading: strategiesLoading } = useUserStrategies();
  const loadStrategy = useLoadStrategy();

  const { data: regime,   isLoading: regimeLoading,   refetch: refetchRegime }   = useMarketRegime();
  const { data: universe, isLoading: universeLoading, refetch: refetchUniverse } = useUniverseStats();
  const { strategies, universe: selectedUniverse, savedStrategyId, strategyName } = useStrategyStore();

  const activeStrategy = savedStrategies?.find(s => s.id === savedStrategyId) ?? null;

  const handleSelectStrategy = async (id: string) => {
    setStrategyOpen(false);
    await loadStrategy.mutateAsync(id);
  };

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
      {/* Profile modal */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 80, paddingLeft: spacing.lg }}
          onPress={() => setProfileOpen(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              minWidth: 220,
            }}>
              {/* Avatar + email */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: colors.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {user?.user_metadata?.full_name || user?.user_metadata?.name ? (
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground }} numberOfLines={1}>
                      {user.user_metadata.full_name ?? user.user_metadata.name}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{user?.email ?? ''}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />

              {/* Sign out */}
              <TouchableOpacity
                onPress={handleSignOut}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
                activeOpacity={0.7}
              >
                <LogOut size={16} color={colors.destructive} />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.destructive }}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Strategy picker modal */}
      <Modal
        visible={strategyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStrategyOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setStrategyOpen(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              paddingTop: spacing.md,
              paddingBottom: spacing.xl,
              maxHeight: 480,
            }}>
              {/* Handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md }} />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                Select Active Strategy
              </Text>

              {strategiesLoading && (
                <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                  <Skeleton height={60} style={{ borderRadius: radius.lg }} />
                  <Skeleton height={60} style={{ borderRadius: radius.lg }} />
                </View>
              )}

              {!strategiesLoading && (!savedStrategies || savedStrategies.length === 0) && (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <BookMarked size={28} color={colors.muted} />
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 10, textAlign: 'center', paddingHorizontal: spacing.lg }}>
                    No saved strategies yet.{'\n'}Go to the Strategies tab to create one.
                  </Text>
                </View>
              )}

              <FlatList
                data={savedStrategies ?? []}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
                renderItem={({ item }) => {
                  const isActive = item.id === savedStrategyId;
                  const enabledCount = item.strategies.filter((s: any) => s.enabled).length;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectStrategy(item.id)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: isActive ? colors.primary + '18' : colors.secondary,
                        borderWidth: 1,
                        borderColor: isActive ? colors.primary + '60' : 'transparent',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                          {UNIVERSE_LABELS[item.universe]} · {enabledCount} strategies
                        </Text>
                      </View>
                      {loadStrategy.isPending && loadStrategy.variables === item.id ? (
                        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary, borderTopColor: 'transparent' }} />
                      ) : isActive ? (
                        <Check size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Dashboard</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>Live market conditions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setProfileOpen(true)}
            activeOpacity={0.8}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' }}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Active strategy selector */}
        <TouchableOpacity
          onPress={() => setStrategyOpen(true)}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: 10,
          }}
        >
          <BookMarked size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', color: colors.muted }}>
              Active Strategy
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 1 }} numberOfLines={1}>
              {activeStrategy ? activeStrategy.name : (savedStrategyId ? strategyName : 'Tap to select a strategy')}
            </Text>
          </View>
          {activeStrategy && (
            <Badge
              label={UNIVERSE_LABELS[activeStrategy.universe]}
              color={colors.primary}
            />
          )}
          <ChevronDown size={16} color={colors.muted} />
        </TouchableOpacity>

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
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PaperTrade')}>
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
          </TouchableOpacity>
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
