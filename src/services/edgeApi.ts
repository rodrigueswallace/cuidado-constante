import { supabase, supabaseAnonKey, supabaseUrl } from '@/services/supabase';

export interface IngestBlePayload {
  collar_id: string;
  rssi: number;
  battery: number | null;
  ts: string;
}

async function callEdgeFunction<T>(fn: string, payload: unknown): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('erro_ao_obter_sessao');
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('token_invalido_ou_expirado');
  }

  console.log('EDGE CALL =>', {
    fn,
    hasToken: !!accessToken,
    tokenLen: accessToken.length
  });

  const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();

  let parsed: any = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = { raw: rawText };
  }

  if (!response.ok) {
    console.log('EDGE ERROR =>', {
      status: response.status,
      body: parsed
    });

    if (response.status === 401) {
      throw new Error('nao_autorizado');
    }

    const message =
      parsed?.error ||
      parsed?.message ||
      `http_${response.status}`;

    throw new Error(String(message));
  }

  return parsed as T;
}

/* ===============================
   BLE
================================= */

export async function ingestBleEvent(payload: IngestBlePayload) {
  return callEdgeFunction('ingest-ble', payload);
}

/* ===============================
   GPS
================================= */

export async function fetchLatestGps(collarId: string) {
  return callEdgeFunction<{ events: unknown[] }>(
    'get-latest-gps',
    { collar_id: collarId }
  );
}

/* ===============================
   PROFILE / ACTIVE COLLAR
================================= */

export async function fetchActiveCollarId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error('usuario_nao_autenticado');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('active_collar')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.log('PROFILE ERROR =>', error);
    throw error;
  }

  return typeof data?.active_collar === 'string'
    ? data.active_collar
    : null;
}

export async function saveActiveCollarId(activeCollarId: string | null) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error('usuario_nao_autenticado');
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        active_collar: activeCollarId
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.log('UPSERT PROFILE ERROR =>', error);
    throw error;
  }
}

/* ===============================
   REGISTER COLLAR
================================= */

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
  return callEdgeFunction<RegisterCollarResponse>(
    'register-collar',
    payload
  );
}