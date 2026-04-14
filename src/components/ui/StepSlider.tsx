/**
 * StepSlider — tap-based stepper that looks like a slider.
 * No native gesture libs needed; works across all Expo managed apps.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../../lib/theme';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel?: (v: number) => string;
}

export function StepSlider({ value, min, max, step, onChange, formatLabel }: Props) {
  // Snap persisted or stale values into the valid range on mount / when range changes.
  useEffect(() => {
    if (value < min) onChange(min);
    else if (value > max) onChange(max);
  }, [min, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const clamped = Math.min(max, Math.max(min, value));
  const pct = Math.min(100, Math.max(0, ((clamped - min) / (max - min)) * 100));

  const decrement = () => {
    const next = Math.max(min, parseFloat((clamped - step).toFixed(2)));
    onChange(next);
  };
  const increment = () => {
    const next = Math.min(max, parseFloat((clamped + step).toFixed(2)));
    onChange(next);
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={decrement} disabled={clamped <= min} style={[styles.btn, clamped <= min && styles.btnDisabled]}>
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any }]} />
      </View>

      <TouchableOpacity onPress={increment} disabled={clamped >= max} style={[styles.btn, clamped >= max && styles.btnDisabled]}>
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>

      <Text style={styles.valueLabel}>{formatLabel ? formatLabel(clamped) : String(clamped)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: {
    fontSize: 18,
    color: colors.foreground,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  valueLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    minWidth: 36,
    textAlign: 'right',
  },
});
