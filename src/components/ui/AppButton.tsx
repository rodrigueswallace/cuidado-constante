import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function AppButton({ title, onPress, disabled = false, variant = 'primary' }: AppButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null
      ]}
    >
      <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  label: {
    width: '100%',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false
  },
  labelPrimary: { color: '#FFFFFF' },
  labelSecondary: { color: colors.text },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 }
});
