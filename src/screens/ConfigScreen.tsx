import React, { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { authService } from '@/services/auth';
import { useAppStore } from '@/store/appStore';

export function ConfigScreen() {
  const { gpsPollSeconds, routeThrottleSeconds, setGpsPollSeconds, setRouteThrottleSeconds, hydrate, pendingBleEvents } =
    useAppStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const checkPerms = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    alert(`Localização: ${loc.status}`);
  };

  return (
    <View style={styles.container}>
      <Text>Permissões e ajustes</Text>
      <Button title="Verificar permissões" onPress={checkPerms} />
      <Text>Intervalo GPS: {gpsPollSeconds}s</Text>
      <Button title="GPS 15s" onPress={() => setGpsPollSeconds(15)} />
      <Button title="GPS 30s" onPress={() => setGpsPollSeconds(30)} />
      <Text>Throttle rota: {routeThrottleSeconds}s</Text>
      <Button title="Rota 120s" onPress={() => setRouteThrottleSeconds(120)} />
      <Button title="Rota 180s" onPress={() => setRouteThrottleSeconds(180)} />
      <Text>Fila offline BLE: {pendingBleEvents.length}</Text>
      <Button title="Logout" onPress={() => authService.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 }
});
