import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { useBleTracking } from '@/hooks/useBleTracking';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

const BLE_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_SERVICE_UUID ?? '';

export function BleScreen() {
  const { activeCollarId } = useAppStore();
  const { devices, rssi, battery, estimatedDistance, scan, connect } = useBleTracking(BLE_SERVICE_UUID);

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>BLE</Text>

        <AppCard>
          <Text style={styles.label}>Coleira ativa</Text>
          <Text style={styles.value}>{activeCollarId ?? '--'}</Text>
          {!activeCollarId ? <Text style={styles.warn}>Cadastre uma coleira para conectar BLE.</Text> : null}
          <View style={styles.actions}>
            <AppButton title="Escanear BLE" onPress={scan} disabled={!activeCollarId || !BLE_SERVICE_UUID} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Sinal atual</Text>
          <Text style={styles.value}>RSSI: {rssi ?? '--'} dBm</Text>
          <Text style={styles.value}>Bateria: {battery ?? '--'}%</Text>
          <Text style={styles.value}>Proximidade estimada: {estimatedDistance ? `${estimatedDistance.toFixed(1)}m` : '--'}</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Dispositivos encontrados</Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.muted}>Nenhum dispositivo encontrado no ultimo scan.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.deviceName}>{item.name || item.localName || item.id}</Text>
                <AppButton title="Conectar" onPress={() => activeCollarId && connect(item, activeCollarId)} disabled={!activeCollarId} variant="secondary" />
              </View>
            )}
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, marginBottom: spacing.xs },
  warn: { color: colors.danger, marginTop: spacing.xs },
  muted: { color: colors.textMuted },
  actions: { marginTop: spacing.xs },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  deviceName: { color: colors.text, flex: 1, marginRight: spacing.sm }
});
