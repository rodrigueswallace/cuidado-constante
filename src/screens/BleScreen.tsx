import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { useBleTracking } from '@/hooks/useBleTracking';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';
import { describeBleProximity } from '@/utils/geo';

const BLE_DEVICE_NAME_PREFIX = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX?.trim() ?? '';

interface ActiveCollarMeta {
  serial: string;
  ble_service_uuid: string;
}

export function BleScreen() {
  const insets = useSafeAreaInsets();
  const { activeCollarId } = useAppStore();
  const [activeCollarMeta, setActiveCollarMeta] = useState<ActiveCollarMeta | null>(null);
  const resolvedServiceUuid = activeCollarMeta?.ble_service_uuid?.trim() || process.env.EXPO_PUBLIC_BLE_SERVICE_UUID?.trim() || '';
  const expectedNameParts = useMemo(
    () => [activeCollarMeta?.serial?.trim(), BLE_DEVICE_NAME_PREFIX].filter((value): value is string => !!value),
    [activeCollarMeta?.serial]
  );
  const { devices, rssi, battery, scan, connect, isScanning, isConnecting, connectedDeviceId, scanStatus } = useBleTracking(resolvedServiceUuid);

  useEffect(() => {
    let mounted = true;

    const loadActiveCollarMeta = async () => {
      if (!activeCollarId) {
        if (mounted) setActiveCollarMeta(null);
        return;
      }

      const { data, error } = await supabase
        .from('collars')
        .select('serial, ble_service_uuid')
        .eq('id', activeCollarId)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setActiveCollarMeta(null);
        return;
      }

      setActiveCollarMeta({
        serial: data.serial,
        ble_service_uuid: data.ble_service_uuid
      });
    };

    loadActiveCollarMeta();

    return () => {
      mounted = false;
    };
  }, [activeCollarId]);

  const isExpectedDevice = (device: Device) => {
    const name = (device.name || device.localName || '').toLowerCase();
    if (!name) return false;
    return expectedNameParts.some((part) => name.includes(part.toLowerCase()));
  };
  const getDeviceName = (device: Device) => {
    const resolvedName = device.name?.trim() || device.localName?.trim();
    return resolvedName || 'Dispositivo sem nome';
  };

  const sortedDevices = useMemo(() => {
    const filtered = devices.filter((device) => {
      if (connectedDeviceId === device.id) return true;
      if (expectedNameParts.length === 0) return true;
      return isExpectedDevice(device);
    });

    return filtered.sort((a, b) => {
      const aRssi = a.rssi ?? -999;
      const bRssi = b.rssi ?? -999;
      return bRssi - aRssi;
    });
  }, [connectedDeviceId, devices, expectedNameParts]);

  const hintText = expectedNameParts.length > 0
    ? `Mostrando apenas dispositivos com nome compativel com a coleira: ${expectedNameParts.join(', ')}`
    : 'Nenhum identificador de nome da coleira foi configurado; o filtro depende do UUID BLE.';

  const scanButtonLabel = isScanning ? 'Escaneando...' : 'Escanear BLE';
  const scanInfo = !resolvedServiceUuid
    ? 'UUID de servico nao configurado para a coleira ativa. Scan geral habilitado.'
    : `Filtro UUID ativo: ${resolvedServiceUuid}`;
  const proximityText = describeBleProximity(rssi);

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
          <Text style={styles.value}>Proximidade estimada: {proximityText}</Text>
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
                  <Text style={styles.deviceName}>{getDeviceName(item)}</Text>
                  {isExpectedDevice(item) ? <Text style={styles.deviceHint}>Possivel coleira</Text> : null}
                </View>
                <AppButton
                  title={connectedDeviceId === item.id ? 'Conectado' : isConnecting ? 'Conectando...' : 'Conectar'}
                  onPress={() => activeCollarId && connect(item, activeCollarId)}
                  disabled={!activeCollarId || isConnecting || connectedDeviceId === item.id}
                  variant="secondary"
                />
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
