/**
 * StepSlider — tap-based stepper that looks like a slider.
 * No native gesture libs needed; works across all Expo managed apps.
 */
import React from 'react';
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
  const pct = ((value - min) / (max - min)) * 100;

  const decrement = () => {
    const next = Math.max(min, parseFloat((value - step).toFixed(2)));
    onChange(next);
  };
  const increment = () => {
    const next = Math.min(max, parseFloat((value + step).toFixed(2)));
    onChange(next);
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={decrement} disabled={value <= min} style={[styles.btn, value <= min && styles.btnDisabled]}>
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any }]} />
      </View>

      <TouchableOpacity onPress={increment} disabled={value >= max} style={[styles.btn, value >= max && styles.btnDisabled]}>
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>

      <Text style={styles.valueLabel}>{formatLabel ? formatLabel(value) : String(value)}</Text>
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
