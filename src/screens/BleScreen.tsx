import React from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';

import { useBleTracking } from '@/hooks/useBleTracking';
import { useAppStore } from '@/store/appStore';

const BLE_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_SERVICE_UUID ?? '';

export function BleScreen() {
  const { activeCollarId } = useAppStore();
  const { devices, rssi, battery, estimatedDistance, scan, connect } = useBleTracking(BLE_SERVICE_UUID);

  return (
    <View style={styles.container}>
      {!activeCollarId ? <Text>Nenhuma coleira cadastrada</Text> : null}
      <Button title="Escanear BLE" onPress={scan} disabled={!activeCollarId || !BLE_SERVICE_UUID} />
      <Text>RSSI: {rssi ?? '--'} dBm</Text>
      <Text>Bateria: {battery ?? '--'}%</Text>
      <Text>Proximidade estimada: {estimatedDistance ? `${estimatedDistance.toFixed(1)}m` : '--'}</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.name || item.localName || item.id}</Text>
            <Button title="Conectar" onPress={() => activeCollarId && connect(item, activeCollarId)} disabled={!activeCollarId} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }
});
