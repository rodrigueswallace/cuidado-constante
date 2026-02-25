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

export async function fetchActiveCollarId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('active_collar')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table 'public.profiles'")) {
      return null;
    }

    throw error;
  }

  const activeCollar = data?.active_collar;
  return typeof activeCollar === 'string' ? activeCollar : null;
}

interface RegisterCollarPayload {
  pet_id: string;
  serial: string;
  activation_code: string;
}

interface RegisterCollarResponse {
  collar_id: string;
  serial: string;
  ble_service_uuid: string;
}

export async function registerCollar(payload: RegisterCollarPayload) {
  const { data, error } = await supabase.functions.invoke<RegisterCollarResponse>('register-collar', {
    body: payload
  });

  if (error) throw error;
  return data;
}
