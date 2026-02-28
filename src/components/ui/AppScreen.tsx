import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

interface AppScreenProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function AppScreen({ children, padded = true }: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, padded ? styles.padded : null]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
  padded: { padding: spacing.md }
});
