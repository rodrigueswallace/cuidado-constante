import React, { useCallback, useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import MapView, { Marker, Polyline } from 'react-native-maps';

import { useGpsTracking } from '@/hooks/useGpsTracking';
import { useAppStore } from '@/store/appStore';
import { haversineMeters } from '@/utils/geo';

export function GpsScreen() {

  const navigation = useNavigation<any>();
  const { activeCollarId, routeThrottleSeconds, hydrate } = useAppStore();

  const { events, route, userLocation, recalcRoute, refresh } = useGpsTracking(activeCollarId, routeThrottleSeconds);
  const pet = events[0];

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAddCollar = () => {
    navigation.navigate('AddCollar');
  };

  const distance =
    userLocation && pet
      ? haversineMeters(
          { lat: userLocation.latitude, lng: userLocation.longitude },
          { lat: pet.lat, lng: pet.lng }
        )
      : null;

  return (
    <View style={styles.container}>
      {!activeCollarId ? (
        <View style={styles.emptyState}>
          <Text>Nenhuma coleira cadastrada</Text>
        </View>
      ) : (
      <MapView style={styles.map}>
        {pet && <Marker coordinate={{ latitude: pet.lat, longitude: pet.lng }} title="Coleira" />}
        {userLocation && (
          <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} title="Você" />
        )}
        {events.length > 1 && (
          <Polyline
            strokeColor="#1976D2"
            strokeWidth={3}
            coordinates={events.map((ev) => ({ latitude: ev.lat, longitude: ev.lng }))}
          />
        )}
        {route?.polyline && <Polyline coordinates={route.polyline} strokeColor="#E91E63" strokeWidth={4} />}
      </MapView>
      )}

      <View style={styles.footer}>
        <Button title="Adicionar coleira/dispositivo" onPress={handleAddCollar} />
        <Text>Distância pet-usuário: {distance ? `${Math.round(distance)}m` : '--'}</Text>
        <Button title="Atualizar posição" onPress={refresh} disabled={!activeCollarId} />
        <Button title="Recalcular rota" onPress={() => recalcRoute(true)} disabled={!activeCollarId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 12, gap: 8, backgroundColor: '#fff' }
});
