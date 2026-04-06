import React, { useState } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';
import { colors, radius, spacing } from '../../lib/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // On success, AuthContext updates → RootNavigator switches to MainTabs automatically
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ height: 48, width: 48, borderRadius: radius.lg, backgroundColor: colors.primary, marginBottom: 12 }} />
          <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.foreground }}>TacTiq</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Systematic trading, automated.</Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.secondary,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: colors.foreground,
                fontFamily: 'Inter_400Regular',
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.secondary,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: colors.foreground,
                fontFamily: 'Inter_400Regular',
              }}
            />
          </View>

          {error && (
            <Text style={{ fontSize: 12, color: colors.destructive, textAlign: 'center' }}>{error}</Text>
          )}

          <Button loading={loading} onPress={handleSignIn} size="lg" style={{ marginTop: 8 }}>
            Sign In
          </Button>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('SignUp')}
          style={{ marginTop: 24, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Don't have an account?{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
