import { env } from '@/config/env';
import { DirectionsRoute } from '@/types/domain';

const decodePolyline = (encoded: string) => {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
};

export async function fetchDirections(origin: string, destination: string): Promise<DirectionsRoute | null> {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${env.googleMapsApiKey}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!json.routes?.length) return null;

  const route = json.routes[0];
  const leg = route.legs[0];

  return {
    polyline: decodePolyline(route.overview_polyline.points),
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value
  };
}
