import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { useBleTracking } from '@/hooks/useBleTracking';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

const BLE_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_SERVICE_UUID ?? '';
const BLE_DEVICE_NAME_PREFIX = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX?.trim() ?? '';

export function BleScreen() {
  const insets = useSafeAreaInsets();
  const { activeCollarId } = useAppStore();
  const { devices, rssi, battery, estimatedDistance, scan, connect, isScanning, scanStatus } = useBleTracking(BLE_SERVICE_UUID);
  const isExpectedDevice = (device: Device) => {
    if (!BLE_DEVICE_NAME_PREFIX) return false;
    const name = (device.name || device.localName || '').toLowerCase();
    return name.includes(BLE_DEVICE_NAME_PREFIX.toLowerCase());
  };

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const aExpected = isExpectedDevice(a) ? 1 : 0;
      const bExpected = isExpectedDevice(b) ? 1 : 0;
      if (aExpected !== bExpected) return bExpected - aExpected;

      const aRssi = a.rssi ?? -999;
      const bRssi = b.rssi ?? -999;
      return bRssi - aRssi;
    });
  }, [devices]);

  const hintText = BLE_DEVICE_NAME_PREFIX
    ? `Priorizando dispositivos com nome contendo: ${BLE_DEVICE_NAME_PREFIX}`
    : 'Defina EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX para priorizar a coleira correta.';

  const scanButtonLabel = isScanning ? 'Escaneando...' : 'Escanear BLE';
  const scanInfo = !BLE_SERVICE_UUID
    ? 'UUID de servico nao configurado. Scan geral habilitado.'
    : `Filtro UUID ativo: ${BLE_SERVICE_UUID}`;

  return (
    <AppScreen>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Text style={styles.title}>BLE</Text>

        <AppCard>
          <Text style={styles.label}>Coleira ativa</Text>
          <Text style={styles.value}>{activeCollarId ?? '--'}</Text>
          {!activeCollarId ? <Text style={styles.warn}>Cadastre uma coleira para conectar BLE.</Text> : null}
          <Text style={styles.muted}>{scanInfo}</Text>
          {scanStatus ? <Text style={styles.status}>{scanStatus}</Text> : null}
          <View style={styles.actions}>
            <AppButton title={scanButtonLabel} onPress={scan} disabled={!activeCollarId || isScanning} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Sinal atual</Text>
          <Text style={styles.value}>RSSI: {rssi ?? '--'} dBm</Text>
          <Text style={styles.value}>Bateria: {battery ?? '--'}%</Text>
          <Text style={styles.value}>Proximidade estimada: {estimatedDistance ? `${estimatedDistance.toFixed(1)}m` : '--'}</Text>
          <Text style={styles.muted}>{hintText}</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Dispositivos encontrados</Text>
          <FlatList
            data={sortedDevices}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.muted}>Nenhum dispositivo encontrado no ultimo scan.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.deviceLabelWrap}>
                  <Text style={styles.deviceName}>{item.name || item.localName || item.id}</Text>
                  {isExpectedDevice(item) ? <Text style={styles.deviceHint}>Possivel coleira</Text> : null}
                </View>
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
  status: { color: colors.textMuted, marginTop: spacing.xs },
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
  deviceLabelWrap: { flex: 1, marginRight: spacing.sm },
  deviceName: { color: colors.text },
  deviceHint: { color: colors.primary, fontSize: 11, marginTop: 2, fontWeight: '600' }
});
