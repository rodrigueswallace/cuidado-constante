import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { fetchLatestGps } from '@/services/edgeApi';
import { supabase } from '@/services/supabase';
import { GpsEvent } from '@/types/domain';
import { fetchDirections } from '@/utils/directions';
import { haversineMeters } from '@/utils/geo';

export function useGpsTracking(collarId: string | null, throttleSeconds = 120) {
  const [events, setEvents] = useState<GpsEvent[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastRouteAt = useRef(0);
  const lastRouteDistance = useRef(0);

  const getFriendlyGpsError = (unknownError: unknown) => {
    const message = unknownError instanceof Error ? unknownError.message : String(unknownError);

    if (
      message.includes('JWT') ||
      message.includes('Invalid JWT') ||
      message.includes('auth_obrigatorio') ||
      message.includes('401')
    ) {
      return 'Sessão expirada. Faça login novamente para carregar a localização da coleira.';
    }

    if (message.includes('Failed to send a request to the Edge Function')) {
      return 'Não foi possível conectar ao servidor de GPS. Verifique a internet e tente novamente.';
    }

    return 'Não foi possível carregar a localização da coleira agora.';
  };

  const refresh = useCallback(async () => {
    if (!collarId) {
      setEvents([]);
      setError('Nenhuma coleira ativa vinculada.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchLatestGps(collarId);
      setEvents(data.events ?? []);
    } catch (unknownError) {
      setEvents([]);
      setError(getFriendlyGpsError(unknownError));
    } finally {
      setLoading(false);
    }
  }, [collarId]);

  const recalcRoute = useCallback(async (force = false) => {
    if (!userLocation || events.length === 0) return;
    const pet = events[0];
    const distance = haversineMeters(
      { lat: userLocation.latitude, lng: userLocation.longitude },
      { lat: pet.lat, lng: pet.lng }
    );
    const elapsed = Date.now() - lastRouteAt.current;

    const shouldRecalc =
      force || distance > 50 || Math.abs(distance - lastRouteDistance.current) > 25 || elapsed > throttleSeconds * 1000;

    if (!shouldRecalc) return;

    const routeData = await fetchDirections(
      `${userLocation.latitude},${userLocation.longitude}`,
      `${pet.lat},${pet.lng}`
    );

    setRoute(routeData);
    lastRouteAt.current = Date.now();
    lastRouteDistance.current = distance;
  }, [events, throttleSeconds, userLocation]);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
    Location.getCurrentPositionAsync({}).then((position) => setUserLocation(position.coords));
  }, []);

  useEffect(() => {
    refresh();
    if (!collarId) return;

    const interval = setInterval(refresh, 30000);
    const channel = supabase
      .channel(`gps-${collarId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_events', filter: `collar_id=eq.${collarId}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [collarId, refresh]);

  useEffect(() => {
    recalcRoute(false);
  }, [events, userLocation, recalcRoute]);

  return {
    events,
    userLocation,
    route,
    loading,
    error,
    refresh,
    recalcRoute
  };
}
