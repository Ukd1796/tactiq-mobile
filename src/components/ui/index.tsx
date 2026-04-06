import React from 'react';
import {
  TouchableOpacity, Text, View, ActivityIndicator,
  type TouchableOpacityProps, type ViewStyle, type TextStyle,
} from 'react-native';
import { colors, radius } from '../../lib/theme';

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, style, ...props }: ButtonProps) {
  const bg: Record<string, string> = {
    primary:     colors.primary,
    outline:     'transparent',
    ghost:       'transparent',
    destructive: colors.destructive,
  };
  const border: Record<string, string> = {
    primary:     colors.primary,
    outline:     colors.border,
    ghost:       'transparent',
    destructive: colors.destructive,
  };
  const textColor: Record<string, string> = {
    primary:     '#fff',
    outline:     colors.foreground,
    ghost:       colors.foreground,
    destructive: '#fff',
  };
  const pad = size === 'sm' ? { paddingHorizontal: 12, paddingVertical: 7 } :
              size === 'lg' ? { paddingHorizontal: 24, paddingVertical: 14 } :
                              { paddingHorizontal: 16, paddingVertical: 10 };
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[{
        backgroundColor: bg[variant],
        borderWidth: 1,
        borderColor: border[variant],
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: disabled || loading ? 0.5 : 1,
        ...pad,
      }, style as ViewStyle]}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={textColor[variant]} />}
      {typeof children === 'string' ? (
        <Text style={{ color: textColor[variant], fontSize, fontFamily: 'Inter_600SemiBold' }}>{children}</Text>
      ) : children}
    </TouchableOpacity>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    }, style]}>
      {children}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ label, color = colors.primary }: { label: string; color?: string }) {
  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: color + '22',
      borderWidth: 1,
      borderColor: color + '44',
      alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color }}>{label}</Text>
    </View>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Text style={[{
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.muted,
    }, style]}>
      {children}
    </Text>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, accent }: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <Label>{label}</Label>
      <Text style={{
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: accent ? colors.primary : colors.foreground,
        marginTop: 6,
      }}>
        {value}
      </Text>
      {sub && <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{sub}</Text>}
    </Card>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ width, height, style }: { width?: number | string; height: number; style?: ViewStyle }) {
  return (
    <View style={[{
      width: width ?? '100%',
      height,
      backgroundColor: colors.secondary,
      borderRadius: radius.md,
    }, style]} />
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />;
}
