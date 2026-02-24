import { supabase } from '@/services/supabase';

export interface IngestBlePayload {
  collar_id: string;
  rssi: number;
  battery: number | null;
  ts: string;
}

export async function ingestBleEvent(payload: IngestBlePayload) {
  const { data, error } = await supabase.functions.invoke('ingest-ble', {
    body: payload
  });

  if (error) throw error;
  return data;
}

export async function fetchLatestGps(collarId: string) {
  const { data, error } = await supabase.functions.invoke('get-latest-gps', {
    body: { collar_id: collarId }
  });

  if (error) throw error;
  return data;
}
