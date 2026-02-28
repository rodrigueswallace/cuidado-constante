import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import MapView, { Marker, Polyline } from 'react-native-maps';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';
import { haversineMeters } from '@/utils/geo';

export function GpsScreen() {
  const navigation = useNavigation<any>();
  const { activeCollarId, routeThrottleSeconds, hydrate, refreshActiveCollar } = useAppStore();
  const mapRef = useRef<MapView | null>(null);

  const { events, route, userLocation, recalcRoute, refresh, loading, error } = useGpsTracking(activeCollarId, routeThrottleSeconds);
  const pet = events[0];

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const syncAndRefresh = useCallback(async () => {
    let syncedCollarId: string | null = activeCollarId;
    try {
      syncedCollarId = await refreshActiveCollar();
    } catch {
      // Keep local active collar if profile sync fails.
    }
    await refresh(syncedCollarId ?? null);
  }, [activeCollarId, refresh, refreshActiveCollar]);

  useFocusEffect(
    useCallback(() => {
      syncAndRefresh();
    }, [syncAndRefresh])
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

  useEffect(() => {
    if (!mapRef.current || !userLocation || !pet) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: pet.lat, longitude: pet.lng }
      ],
      {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true
      }
    );
  }, [pet, userLocation]);

  return (
    <View style={styles.container}>
      {!activeCollarId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma coleira cadastrada</Text>
          <View style={styles.emptyAction}>
            <AppButton title="Adicionar coleira/dispositivo" onPress={handleAddCollar} />
          </View>
        </View>
      ) : (
        <MapView ref={mapRef} style={styles.map}>
          {pet && <Marker coordinate={{ latitude: pet.lat, longitude: pet.lng }} title="Coleira" />}
          {userLocation && <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} title="Voce" />}
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

      <View style={styles.footerWrap}>
        <AppCard>
          <View style={styles.footer}>
            <AppButton title="Adicionar coleira/dispositivo" onPress={handleAddCollar} variant="secondary" />
            <Text style={styles.item}>Coleira ativa: {activeCollarId ?? '--'}</Text>
            <Text style={styles.item}>Eventos GPS recebidos: {events.length}</Text>
            <Text style={styles.item}>Ultimo ponto da coleira: {pet ? `${pet.lat.toFixed(6)}, ${pet.lng.toFixed(6)}` : '--'}</Text>
            <Text style={styles.item}>Distancia pet-usuario: {distance ? `${Math.round(distance)}m` : '--'}</Text>
            {loading && <Text style={styles.info}>Atualizando localizacao...</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
            <AppButton title="Atualizar posicao" onPress={syncAndRefresh} disabled={!activeCollarId} />
            <AppButton title="Recalcular rota" onPress={() => recalcRoute(true)} disabled={!activeCollarId} variant="secondary" />
          </View>
        </AppCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  emptyText: { color: colors.text, fontWeight: '700' },
  emptyAction: { marginTop: spacing.sm, width: '100%' },
  footerWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.xs, backgroundColor: colors.bg },
  footer: { gap: spacing.xs },
  item: { color: colors.text },
  info: { color: colors.textMuted },
  errorText: { color: colors.danger }
});
