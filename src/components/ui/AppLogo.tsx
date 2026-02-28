import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { getBrandLogoUrl } from '@/services/branding';
import { colors, radius, spacing } from '@/theme/tokens';

export function AppLogo() {
  const [loadFailed, setLoadFailed] = useState(false);
  const remoteLogoUrl = useMemo(() => getBrandLogoUrl(), []);
  const shouldUseRemoteLogo = !!remoteLogoUrl && !loadFailed;

  return (
    <View style={styles.row}>
      {shouldUseRemoteLogo ? (
        <Image source={{ uri: remoteLogoUrl }} style={styles.logoImage} resizeMode="cover" onError={() => setLoadFailed(true)} />
      ) : (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CC</Text>
        </View>
      )}
      <View>
        <Text style={styles.title}>Cuidado Constante</Text>
        <Text style={styles.subtitle}>monitoramento pet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface
  },
  badgeText: { color: '#fff', fontWeight: '800', letterSpacing: 0.4 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12 }
});
