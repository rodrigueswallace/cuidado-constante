import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { brandConfig } from '@/services/branding';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

export function ConfigScreen() {
  const { gpsPollSeconds, routeThrottleSeconds, setGpsPollSeconds, setRouteThrottleSeconds, hydrate, pendingBleEvents } = useAppStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const checkPerms = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    Alert.alert('Permissao de localizacao', loc.status);
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Configuracoes</Text>

        <AppCard>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.muted}>Perfil e troca de senha entram na proxima etapa.</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Branding remoto</Text>
          <Text style={styles.value}>Bucket: {brandConfig.bucket}</Text>
          <Text style={styles.value}>Arquivo: {brandConfig.logoPath}</Text>
          <Text style={styles.muted}>Substitua esse arquivo no Supabase Storage para trocar o logo sem novo APK.</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Permissoes</Text>
          <AppButton title="Verificar localizacao" onPress={checkPerms} variant="secondary" />
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Rastreamento GPS</Text>
          <Text style={styles.value}>Intervalo atual: {gpsPollSeconds}s</Text>
          <View style={styles.row}>
            <AppButton title="15s" onPress={() => setGpsPollSeconds(15)} variant="secondary" />
            <AppButton title="30s" onPress={() => setGpsPollSeconds(30)} variant="secondary" />
          </View>
          <Text style={styles.value}>Recalcular rota: {routeThrottleSeconds}s</Text>
          <View style={styles.row}>
            <AppButton title="120s" onPress={() => setRouteThrottleSeconds(120)} variant="secondary" />
            <AppButton title="180s" onPress={() => setRouteThrottleSeconds(180)} variant="secondary" />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Fila BLE offline</Text>
          <Text style={styles.value}>{pendingBleEvents.length} evento(s)</Text>
        </AppCard>

        <AppButton title="Sair da conta" onPress={() => authService.signOut()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textMuted },
  value: { color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm }
});
