import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, Link2, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useBrokerStatus, useConnectBroker, useDisconnectBroker } from '../../api/broker';
import { usePaperSession } from '../../db/paper_trade';
import { Button, Card, Label, Badge } from '../../components/ui';
import { colors, spacing, radius } from '../../lib/theme';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const [apiKey, setApiKey]       = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const { data: brokerStatus, isLoading } = useBrokerStatus(user?.id);
  const { data: paperSession }            = usePaperSession();
  const connectBroker    = useConnectBroker();
  const disconnectBroker = useDisconnectBroker();

  const handleConnect = () => {
    if (!user || !apiKey.trim() || !apiSecret.trim()) return;
    connectBroker.mutate(
      { broker: 'zerodha', api_key: apiKey.trim(), api_secret: apiSecret.trim(), user_id: user.id },
      { onError: (err) => console.warn(err.message) }
    );
  };

  const handleDisconnect = () => {
    if (!user) return;
    disconnectBroker.mutate({ user_id: user.id, broker: 'zerodha' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Live Trading</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>Connect your Zerodha account</Text>
          </View>

          {/* Connected state */}
          {!isLoading && brokerStatus?.connected && brokerStatus.token_valid && (
            <>
              <Card style={{ borderColor: colors.success + '40', backgroundColor: colors.success + '08' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <CheckCircle2 size={20} color={colors.success} />
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Zerodha Connected</Text>
                </View>
                {brokerStatus.broker_user_id && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Logged in as <Text style={{ color: colors.foreground }}>{brokerStatus.broker_user_id}</Text>
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  Token valid · authenticated {fmtDate(brokerStatus.token_fetched_at)} · expires midnight IST
                </Text>
              </Card>

              {paperSession ? (
                <Card>
                  <Label style={{ marginBottom: 8 }}>Active Session</Label>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{paperSession.strategy_name}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Started {fmtDate(paperSession.created_at)}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 18 }}>
                    Live order routing is coming soon. Your session is ready — signals will be wired to Zerodha in the next update.
                  </Text>
                </Card>
              ) : (
                <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
                    No active paper trading session. Start one from the Paper Trade tab.
                  </Text>
                </Card>
              )}

              <Button variant="destructive" onPress={handleDisconnect} loading={disconnectBroker.isPending}>
                Disconnect Zerodha
              </Button>
            </>
          )}

          {/* Token expired */}
          {!isLoading && brokerStatus?.connected && !brokerStatus.token_valid && (
            <Card style={{ borderColor: colors.warning + '40', backgroundColor: colors.warning + '08' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <AlertTriangle size={20} color={colors.warning} />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Token Expired</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
                Zerodha tokens expire at midnight IST. Re-enter your credentials to reconnect before 9:15 AM.
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                Last authenticated: {fmtDate(brokerStatus.token_fetched_at)}
              </Text>
            </Card>
          )}

          {/* Connect form */}
          {!isLoading && !brokerStatus?.connected && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Link2 size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Connect Zerodha</Text>
              </View>

              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 16, lineHeight: 18 }}>
                Create a Kite Connect app at developers.kite.trade, then enter your API credentials below.
              </Text>

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 5 }}>API Key</Text>
                  <TextInput value={apiKey} onChangeText={setApiKey} autoCapitalize="none" placeholder="e.g. kitexxx123" placeholderTextColor={colors.muted} style={inputStyle} />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 5 }}>API Secret</Text>
                  <TextInput value={apiSecret} onChangeText={setApiSecret} secureTextEntry placeholder="Your Kite Connect app secret" placeholderTextColor={colors.muted} style={inputStyle} />
                </View>
              </View>

              <Button
                onPress={handleConnect}
                loading={connectBroker.isPending}
                disabled={!apiKey.trim() || !apiSecret.trim()}
                style={{ marginTop: 14 }}
              >
                Connect & Authenticate →
              </Button>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <ShieldCheck size={13} color={colors.muted} />
                <Text style={{ fontSize: 11, color: colors.muted, flex: 1 }}>
                  Your API secret is encrypted at rest and never returned to the app.
                </Text>
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
