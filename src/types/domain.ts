export interface GpsEvent {
  id: string;
  collar_id: string;
  lat: number;
  lng: number;
  battery: number | null;
  ts: string;
}

export interface Collar {
  id: string;
  pet_id: string;
  serial: string;
  ble_service_uuid: string;
  last_seen: string | null;
  battery: number | null;
}

export interface DirectionsRoute {
  polyline: { latitude: number; longitude: number }[];
  distanceMeters: number;
  durationSeconds: number;
}
