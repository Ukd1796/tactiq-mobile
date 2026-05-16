import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  CheckCircle2, AlertTriangle, Link2, ShieldCheck, RefreshCw, Zap,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useBrokerStatus, useConnectBroker, useDisconnectBroker } from '../../api/broker';
import { useLiveSession, useCreatePaperSession } from '../../db/paper_trade';
import { useStartPaperTrade } from '../../api/paper_trade';
import { useUserStrategies } from '../../db/strategies';
import { Button, Card, Label } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';
import type { UserStrategyRow } from '../../db/types';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const inputStyle = {
  backgroundColor: colors.secondary,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: colors.foreground,
  fontFamily: 'Inter_400Regular',
} as const;

export function LiveTradingScreen() {
  const { user } = useAuth();

  const { data: brokerStatus, isLoading, refetch: refetchStatus } = useBrokerStatus(user?.id);
  const { data: liveSession }   = useLiveSession();
  const { data: strategies = [] } = useUserStrategies();

  const connectBroker    = useConnectBroker();
  const disconnectBroker = useDisconnectBroker();
  const startTrade       = useStartPaperTrade();
  const createSession    = useCreatePaperSession();

  // OAuth polling state — auto-polls after browser opens
  const [isPolling, setIsPolling]   = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Live session creation form state
  const [selectedStrategy, setSelectedStrategy] = useState<UserStrategyRow | null>(null);
  const [capital, setCapital]   = useState('100000');
  const [startingSession, setStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Stop polling once broker reports connected
  useEffect(() => {
    if (brokerStatus?.connected && brokerStatus.token_valid) stopPolling();
  }, [brokerStatus, stopPolling]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
    let attempts = 0;
    pollingRef.current = setInterval(() => {
      attempts++;
      refetchStatus();
      if (attempts >= 30) stopPolling(); // 30 × 3s = 90s timeout
    }, 3000);
  }, [refetchStatus, stopPolling]);

  const handleConnect = useCallback(async () => {
    if (!user) return;
    setConnectError(null);
    try {
      const result = await connectBroker.mutateAsync({ broker: 'zerodha', user_id: user.id });
      await Linking.openURL(result.login_url);
      startPolling();
    } catch (err: any) {
      setConnectError(err?.message ?? 'Failed to reach the server. Check your connection.');
    }
  }, [user, connectBroker, startPolling]);

  const handleDisconnect = useCallback(() => {
    if (!user) return;
    disconnectBroker.mutate({ user_id: user.id, broker: 'zerodha' });
  }, [user, disconnectBroker]);

  const handleStartLiveSession = useCallback(async () => {
    if (!user || !selectedStrategy) return;
    const cap = parseFloat(capital);
    if (isNaN(cap) || cap < 10_000) return;

    setStartingSession(true);
    setSessionError(null);
    try {
      const session = await startTrade.mutateAsync({
        strategy_id:      selectedStrategy.id,
        strategy_name:    selectedStrategy.name,
        starting_capital: cap,
        user_id:          user.id,
        live_mode:        true,
        broker:           'zerodha',
      } as any);

      await createSession.mutateAsync({
        user_id:          user.id,
        session_id:       session.session_id,
        strategy_id:      selectedStrategy.id,
        strategy_name:    selectedStrategy.name,
        starting_capital: cap,
        status:           'active',
        live_mode:        true,
        broker:           'zerodha',
      });
    } catch (err: any) {
      setSessionError(err?.message ?? 'Failed to start live session.');
    } finally {
      setStartingSession(false);
    }
  }, [user, selectedStrategy, capital, startTrade, createSession]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>
              Live Trading
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              Connect your Zerodha account to trade with real money
            </Text>
          </View>

          {/* ── Not connected ─────────────────────────────────────────────── */}
          {!isLoading && !brokerStatus?.connected && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Link2 size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Connect Zerodha
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 16, lineHeight: 18 }}>
                Tap the button below to log in with your Zerodha account. Your browser will open — after
                authorizing, return here and we'll detect the connection automatically.
              </Text>

              {isPolling ? (
                <View style={{ alignItems: 'center', paddingVertical: 12, gap: 8 }}>
                  <RefreshCw size={20} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Waiting for Zerodha authorization…
                  </Text>
                  <TouchableOpacity onPress={stopPolling}>
                    <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Button
                    onPress={handleConnect}
                    loading={connectBroker.isPending}
                    style={{ marginBottom: 12 }}
                  >
                    Login with Zerodha →
                  </Button>

                  {connectError && (
                    <View style={{
                      backgroundColor: colors.destructive + '18',
                      borderRadius: radius.md,
                      padding: 10,
                      marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 12, color: colors.destructive, lineHeight: 17 }}>
                        {connectError}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={13} color={colors.muted} />
                    <Text style={{ fontSize: 11, color: colors.muted, flex: 1 }}>
                      Your Zerodha credentials are never shared with TacTiq — you log in directly on Zerodha's
                      secure site.
                    </Text>
                  </View>
                </>
              )}
            </Card>
          )}

          {/* ── Token expired ─────────────────────────────────────────────── */}
          {!isLoading && brokerStatus?.connected && !brokerStatus.token_valid && (
            <Card style={{ borderColor: colors.warning + '40', backgroundColor: colors.warning + '08' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={20} color={colors.warning} />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                  Re-authenticate Required
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                Zerodha tokens expire every midnight IST. Re-authenticate before 9:15 AM so today's orders
                go through.
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4, marginBottom: 14 }}>
                Last authenticated: {fmtDate(brokerStatus.token_fetched_at)}
              </Text>

              {isPolling ? (
                <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
                  <RefreshCw size={18} color={colors.warning} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>Waiting for re-authorization…</Text>
                  <TouchableOpacity onPress={stopPolling}>
                    <Text style={{ fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Button onPress={handleConnect} loading={connectBroker.isPending}>
                    Re-authenticate with Zerodha →
                  </Button>
                  {connectError && (
                    <Text style={{ fontSize: 12, color: colors.destructive, marginTop: 8 }}>
                      {connectError}
                    </Text>
                  )}
                </>
              )}
            </Card>
          )}

          {/* ── Connected ─────────────────────────────────────────────────── */}
          {!isLoading && brokerStatus?.connected && brokerStatus.token_valid && (
            <>
              <Card style={{ borderColor: colors.success + '40', backgroundColor: colors.success + '08' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={20} color={colors.success} />
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                    Zerodha Connected
                  </Text>
                </View>
                {brokerStatus.broker_user_id && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Logged in as{' '}
                    <Text style={{ color: colors.foreground }}>{brokerStatus.broker_user_id}</Text>
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  Token valid · authenticated {fmtDate(brokerStatus.token_fetched_at)} · expires midnight IST
                </Text>
              </Card>

              {/* Active live session dashboard */}
              {liveSession ? (
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={16} color={colors.primary} />
                    <Label>Live Session Active</Label>
                  </View>
                  <Text style={{
                    fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 2,
                  }}>
                    {liveSession.strategy_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    Started {fmtDate(liveSession.created_at)} ·{' '}
                    Capital ₹{liveSession.starting_capital.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 16 }}>
                    Orders execute automatically at 9:15 AM IST on trading days.
                  </Text>
                </Card>
              ) : (
                /* Start live session form */
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Zap size={16} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
                      Start Live Session
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 18 }}>
                    Live sessions are separate from your paper trades — real orders will be placed via Zerodha.
                  </Text>

                  {/* Strategy picker */}
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>
                    Strategy
                  </Text>
                  {strategies.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                      No saved strategies — create one in the Strategies tab first.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 14 }}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {strategies.map((s) => {
                        const active = selectedStrategy?.id === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => setSelectedStrategy(s)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: radius.md,
                              borderWidth: 1,
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active ? colors.primary + '18' : colors.secondary,
                            }}
                          >
                            <Text style={{
                              fontSize: 13,
                              fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                              color: active ? colors.primary : colors.foreground,
                            }}>
                              {s.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Capital input */}
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>
                    Starting Capital (₹)
                  </Text>
                  <TextInput
                    value={capital}
                    onChangeText={setCapital}
                    keyboardType="numeric"
                    placeholder="e.g. 100000"
                    placeholderTextColor={colors.muted}
                    style={{ ...inputStyle, marginBottom: 14 }}
                  />

                  {sessionError && (
                    <Text style={{ fontSize: 12, color: colors.destructive, marginBottom: 8 }}>
                      {sessionError}
                    </Text>
                  )}
                  <Button
                    onPress={handleStartLiveSession}
                    loading={startingSession}
                    disabled={!selectedStrategy || !capital || parseFloat(capital) < 10_000}
                  >
                    Start Live Session →
                  </Button>
                </Card>
              )}

              <Button
                variant="destructive"
                onPress={handleDisconnect}
                loading={disconnectBroker.isPending}
              >
                Disconnect Zerodha
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
