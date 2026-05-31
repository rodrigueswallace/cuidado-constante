import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { useBleTracking } from '@/hooks/useBleTracking';
import { startBleAlarm, stopBleAlarm } from '@/services/bleAlarm';
import { useAppStore } from '@/store/appStore';
import { colors, radius, spacing } from '@/theme/tokens';

const BLE_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_SERVICE_UUID ?? '';
const BLE_DEVICE_NAME_PREFIX = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX?.trim() ?? '';
const bluetoothConnectedImage = require('../../assets/ble/bluetooth-connected.jpeg');
const bluetoothDisconnectedImage = require('../../assets/ble/bluetooth-disconnected.jpeg');

const ALARM_OPTIONS = [
  { value: 'very_far', label: 'Muito distante' },
  { value: 'disconnected', label: 'Desconectado' }
] as const;

function getProximityLabel(rssi: number | null) {
  if (rssi === null) return 'Desconectado';
  if (rssi >= -58) return 'Muito próximo';
  if (rssi >= -70) return 'Próximo';
  if (rssi >= -82) return 'Distante';
  return 'Muito distante';
}

function normalizeAlarmLevel(label: string) {
  switch (label) {
    case 'Muito próximo':
      return 'very_near';
    case 'Próximo':
      return 'near';
    case 'Distante':
      return 'far';
    case 'Muito distante':
      return 'very_far';
    default:
      return 'disconnected';
  }
}

export function BleScreen() {
  const insets = useSafeAreaInsets();
  const { activeCollarId, bleAlarmLevel, isBleAlarmPlaying, silencedBleAlarmKey, setBleAlarmLevel, setSilencedBleAlarmKey } = useAppStore();
  const { devices, rssi, battery, connectedDevice, scan, connect, disconnect, isScanning, isConnecting, connectingDeviceId, scanStatus, hasConnectedOnce, lastDisconnectUnexpected } =
    useBleTracking(BLE_SERVICE_UUID);
  const alarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const scanButtonLabel = isScanning ? 'Parar escanear' : 'Escanear BLE';
  const isConnected = !!connectedDevice;
  const proximityLabel = getProximityLabel(rssi);
  const currentAlarmLevel = normalizeAlarmLevel(proximityLabel);
  const effectiveAlarmLevel = isConnected ? currentAlarmLevel : lastDisconnectUnexpected && hasConnectedOnce ? 'disconnected' : null;
  const currentAlarmKey = `${connectedDevice?.id ?? 'none'}:${effectiveAlarmLevel}`;
  const shouldTriggerAlarm = !!effectiveAlarmLevel && bleAlarmLevel === effectiveAlarmLevel;

  useEffect(() => {
    if (silencedBleAlarmKey && silencedBleAlarmKey !== currentAlarmKey) {
      setSilencedBleAlarmKey(null);
    }
  }, [currentAlarmKey, setSilencedBleAlarmKey, silencedBleAlarmKey]);

  useEffect(() => {
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }

    if (!shouldTriggerAlarm || silencedBleAlarmKey === currentAlarmKey || isBleAlarmPlaying) {
      return;
    }

    alarmTimerRef.current = setTimeout(() => {
      const deviceName = connectedDevice?.name || connectedDevice?.localName || 'Dispositivo';
      startBleAlarm(currentAlarmKey, `${deviceName} (${ALARM_OPTIONS.find((option) => option.value === effectiveAlarmLevel)?.label ?? 'Desconectado'}) atingido`);
    }, 2200);

    return () => {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
    };
  }, [connectedDevice?.localName, connectedDevice?.name, currentAlarmKey, effectiveAlarmLevel, isBleAlarmPlaying, shouldTriggerAlarm, silencedBleAlarmKey]);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Text style={styles.title}>Sensor de distância</Text>

        <AppCard>
          <View style={styles.hero}>
            <View style={[styles.heroIconWrap, isConnected ? styles.heroConnected : styles.heroDisconnected]}>
              <Image source={isConnected ? bluetoothConnectedImage : bluetoothDisconnectedImage} style={styles.heroImage} resizeMode="contain" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.connectionTitle}>{isConnected ? 'Bluetooth conectado' : 'Bluetooth desconectado'}</Text>
              <Text style={styles.connectionSubtitle}>
                {isConnected
                  ? connectedDevice?.name || connectedDevice?.localName || connectedDevice?.id || 'Dispositivo conectado'
                  : 'Conecte a coleira para atualizar o sinal e a proximidade.'}
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <AppButton title={scanButtonLabel} onPress={scan} disabled={!activeCollarId || isConnecting} />
            {isConnected ? <AppButton title="Desconectar" onPress={disconnect} variant="secondary" /> : null}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Coleira ativa</Text>
              <Text style={styles.infoValue}>{activeCollarId ?? '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status da conexão</Text>
              <Text style={styles.infoValue}>{scanStatus ?? (isConnected ? 'Conectado' : '--')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sinal RSSI</Text>
              <Text style={styles.infoValue}>{isConnected && rssi !== null ? `${rssi} dBm` : '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bateria</Text>
              <Text style={styles.infoValue}>{isConnected && battery !== null ? `${battery}%` : '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Proximidade atual</Text>
              <Text style={styles.infoValue}>{isConnected ? proximityLabel : '--'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dispositivo</Text>
              <Text style={styles.infoValue}>{isConnected ? connectedDevice?.name || connectedDevice?.localName || '--' : '--'}</Text>
            </View>
          </View>

          {scanStatus ? <Text style={styles.status}>{scanStatus}</Text> : null}
          {!activeCollarId ? <Text style={styles.warn}>Cadastre uma coleira para conectar ao Bluetooth.</Text> : null}
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Quando acionar o alarme</Text>
          <Text style={styles.sectionHint}>Escolha apenas uma regra. A opção selecionada será a usada no monitoramento.</Text>
          <View style={styles.alarmOptions}>
            {ALARM_OPTIONS.map((option) => {
              const selected = bleAlarmLevel === option.value;
              return (
                <Pressable key={option.value} style={[styles.alarmOption, selected ? styles.alarmOptionSelected : null]} onPress={() => setBleAlarmLevel(option.value)}>
                  <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={[styles.alarmLabel, selected ? styles.alarmLabelSelected : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.alarmFooter}>
            <View style={[styles.alarmBadge, isBleAlarmPlaying ? styles.alarmBadgeOn : styles.alarmBadgeOff]}>
              <View style={[styles.alarmDot, isBleAlarmPlaying ? styles.alarmDotOn : styles.alarmDotOff]} />
              <Text style={[styles.alarmBadgeText, isBleAlarmPlaying ? styles.alarmBadgeTextOn : null]}>
                {isBleAlarmPlaying ? 'Alarme em disparo' : 'Alarme em espera'}
              </Text>
            </View>
            <AppButton title="Parar som" onPress={() => stopBleAlarm({ silenceCurrent: true })} variant="secondary" disabled={!isBleAlarmPlaying} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Bluetooths encontrados</Text>
          <Text style={styles.sectionHint}>{isScanning ? 'Atualizando dispositivos encontrados...' : 'Escaneie para listar e conectar um dispositivo próximo.'}</Text>
          {sortedDevices.length === 0 ? (
            <Text style={styles.emptyState}>Nenhum dispositivo encontrado no último escaneamento.</Text>
          ) : (
            <View style={styles.deviceList}>
              {sortedDevices.map((item) => {
                const deviceName = item.name || item.localName || 'Dispositivo sem nome';
                const isCurrent = connectedDevice?.id === item.id;
                const isCurrentConnecting = connectingDeviceId === item.id;

                return (
                  <View key={item.id} style={styles.deviceRow}>
                    <View style={styles.deviceMain}>
                      <Text style={styles.deviceName}>{deviceName}</Text>
                      <Text style={styles.deviceMeta}>{item.id}</Text>
                      {isExpectedDevice(item) ? <Text style={styles.deviceHint}>Possível coleira</Text> : null}
                    </View>
                    <AppButton
                      title={isCurrent ? 'Conectado' : isCurrentConnecting ? 'Conectando...' : 'Conectar'}
                      onPress={() => activeCollarId && connect(item, activeCollarId)}
                      disabled={!activeCollarId || isCurrent || (isConnecting && !isCurrentConnecting)}
                      variant="secondary"
                    />
                  </View>
                );
              })}
            </View>
          )}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  heroIconWrap: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroImage: {
    width: 44,
    height: 44
  },
  heroConnected: { backgroundColor: '#EAF7F0' },
  heroDisconnected: { backgroundColor: '#FBEAEA' },
  heroCopy: { flex: 1, gap: spacing.xs },
  connectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  connectionSubtitle: { color: colors.textMuted, lineHeight: 20 },
  heroActions: { marginTop: spacing.md, gap: spacing.sm },
  infoGrid: { marginTop: spacing.md, gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7'
  },
  infoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  infoValue: { color: colors.text, flexShrink: 1, textAlign: 'right', fontWeight: '600' },
  status: { color: colors.textMuted, marginTop: spacing.sm },
  warn: { color: colors.danger, marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.xs },
  sectionHint: { color: colors.textMuted, lineHeight: 19, marginBottom: spacing.sm },
  alarmOptions: { gap: spacing.sm },
  alarmOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FBFCFE'
  },
  alarmOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF6FF'
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  alarmLabel: { color: colors.text, fontWeight: '600' },
  alarmLabelSelected: { color: colors.primaryDark },
  alarmFooter: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  alarmBadgeOn: { backgroundColor: '#FDECEC' },
  alarmBadgeOff: { backgroundColor: '#F3F6FA' },
  alarmBadgeText: { color: colors.textMuted, fontWeight: '700' },
  alarmBadgeTextOn: { color: colors.danger },
  alarmDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  alarmDotOn: { backgroundColor: colors.danger },
  alarmDotOff: { backgroundColor: colors.textMuted },
  emptyState: { color: colors.textMuted },
  deviceList: { gap: spacing.sm },
  deviceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: '#FBFCFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  deviceMain: { flex: 1, gap: 2 },
  deviceName: { color: colors.text, fontWeight: '700' },
  deviceMeta: { color: colors.textMuted, fontSize: 12 },
  deviceHint: { color: colors.primary, fontSize: 11, marginTop: 2, fontWeight: '700' }
});
