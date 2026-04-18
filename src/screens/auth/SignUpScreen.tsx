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

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  };

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

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] }}>
        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground, textAlign: 'center', marginBottom: 12 }}>Check your inbox</Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 }}>
          We sent a confirmation link to{'\n'}<Text style={{ color: colors.foreground }}>{email}</Text>.{'\n'}Click it to activate your account.
        </Text>
        <Button variant="outline" onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 32 }}>Back to Sign In</Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ height: 48, width: 48, borderRadius: radius.lg, backgroundColor: colors.primary, marginBottom: 12 }} />
          <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.foreground }}>Create account</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>Full Name</Text>
            <TextInput value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your name" placeholderTextColor={colors.muted} style={inputStyle} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} style={inputStyle} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.muted, marginBottom: 6 }}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 6 characters" placeholderTextColor={colors.muted} style={inputStyle} />
          </View>
          {error && <Text style={{ fontSize: 12, color: colors.destructive, textAlign: 'center' }}>{error}</Text>}
          <Button loading={loading} onPress={handleSignUp} size="lg" style={{ marginTop: 8 }}>Create Account</Button>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Already have an account?{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
