import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { fetchLatestGps, requestGpsUpdate } from '@/services/edgeApi';
import { supabase } from '@/services/supabase';
import { GpsEvent } from '@/types/domain';
import { fetchDirections } from '@/utils/directions';
import { haversineMeters } from '@/utils/geo';

export function useGpsTracking(collarId: string | null, throttleSeconds = 120) {
  const [events, setEvents] = useState<GpsEvent[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [requestingUpdate, setRequestingUpdate] = useState(false);
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

  const refresh = useCallback(async (collarIdOverride?: string | null) => {
    const targetCollarId = collarIdOverride ?? collarId;

    if (!targetCollarId) {
      setEvents([]);
      setError('Nenhuma coleira ativa vinculada.');
      console.log('GPS INFO => sem coleira ativa para consultar');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('GPS FETCH =>', { collarId: targetCollarId });
      const data = await fetchLatestGps(targetCollarId);
      const nextEvents = data?.events ?? [];
      setEvents(nextEvents);
      console.log('GPS FETCH OK =>', { collarId: targetCollarId, count: nextEvents.length });
    } catch (unknownError) {
      setEvents([]);
      setError(getFriendlyGpsError(unknownError));
      const rawMessage = unknownError instanceof Error ? unknownError.message : String(unknownError);
      console.log('GPS FETCH ERROR =>', { collarId: targetCollarId, error: rawMessage });
    } finally {
      setLoading(false);
    }
  }, [collarId]);

  const requestPositionUpdate = useCallback(async (collarIdOverride?: string | null) => {
    const targetCollarId = collarIdOverride ?? collarId;

    if (!targetCollarId) {
      setError('Nenhuma coleira ativa vinculada.');
      return;
    }

    if (requestingUpdate) return;

    const previousLatestId = events[0]?.id ?? null;
    const previousLatestTs = events[0]?.ts ?? null;

    setRequestingUpdate(true);
    setLoading(true);
    setError(null);

    try {
      await requestGpsUpdate(targetCollarId);

      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const data = await fetchLatestGps(targetCollarId);
        const nextEvents = data?.events ?? [];
        setEvents(nextEvents);

        const latestId = nextEvents[0]?.id ?? null;
        const latestTs = nextEvents[0]?.ts ?? null;
        if ((latestId && latestId !== previousLatestId) || (latestTs && latestTs !== previousLatestTs)) {
          return;
        }
      }

      setError('Pedido enviado, mas a coleira ainda nao respondeu. Mostrando a ultima localizacao.');
    } catch (unknownError) {
      setError(getFriendlyGpsError(unknownError));
      const rawMessage = unknownError instanceof Error ? unknownError.message : String(unknownError);
      console.log('GPS REQUEST ERROR =>', { collarId: targetCollarId, error: rawMessage });
    } finally {
      setRequestingUpdate(false);
      setLoading(false);
    }
  }, [collarId, events, requestingUpdate]);

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
    requestingUpdate,
    error,
    refresh,
    requestPositionUpdate,
    recalcRoute
  };
}
