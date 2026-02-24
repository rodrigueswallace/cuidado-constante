const EARTH_RADIUS_METERS = 6371000;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function estimateProximityFromRssi(rssi: number) {
  const txPower = -59;
  if (rssi === 0) return Infinity;
  const ratio = rssi / txPower;
  return ratio < 1 ? ratio ** 10 : 0.89976 * ratio ** 7.7095 + 0.111;
}
