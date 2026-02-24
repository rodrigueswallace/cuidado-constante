import React from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';

import { useBleTracking } from '@/hooks/useBleTracking';

const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const COLLAR_ID = '00000000-0000-0000-0000-000000000001';

export function BleScreen() {
  const { devices, rssi, battery, estimatedDistance, scan, connect } = useBleTracking(SERVICE_UUID);

  return (
    <View style={styles.container}>
      <Button title="Escanear BLE" onPress={scan} />
      <Text>RSSI: {rssi ?? '--'} dBm</Text>
      <Text>Bateria: {battery ?? '--'}%</Text>
      <Text>Proximidade estimada: {estimatedDistance ? `${estimatedDistance.toFixed(1)}m` : '--'}</Text>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.name || item.localName || item.id}</Text>
            <Button title="Conectar" onPress={() => connect(item, COLLAR_ID)} />
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
