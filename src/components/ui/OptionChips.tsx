import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

interface OptionChipsProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OptionChips({ label, options, value, onChange, disabled = false }: OptionChipsProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => !disabled && onChange(option)}
              style={({ pressed }) => [
                styles.chip,
                selected ? styles.chipSelected : null,
                disabled ? styles.disabled : null,
                pressed && !disabled ? styles.pressed : null
              ]}
            >
              <Text style={[styles.text, selected ? styles.textSelected : null]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    alignItems: 'center'
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF6FF'
  },
  text: { color: colors.text, fontWeight: '600' },
  textSelected: { color: colors.primaryDark },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 }
});
