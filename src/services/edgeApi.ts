import { supabase, supabaseAnonKey, supabaseUrl } from '@/services/supabase';

export interface IngestBlePayload {
  collar_id: string;
  rssi: number;
  battery: number | null;
  ts: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(url: string) {
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

async function callEdgeFunction<T>(fn: string, payload: unknown): Promise<T> {
  const getValidAccessToken = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error('erro_ao_obter_sessao');

    let session = sessionData.session;
    const nearExpiry = !!session?.expires_at && session.expires_at * 1000 <= Date.now() + 60_000;
    if (!session || nearExpiry) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw new Error('token_invalido_ou_expirado');
      session = refreshData.session;
    }

    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('token_invalido_ou_expirado');

    const payloadClaims = decodeJwtPayload(accessToken);
    const tokenRef = typeof payloadClaims?.ref === 'string' ? payloadClaims.ref : null;
    const tokenIss = typeof payloadClaims?.iss === 'string' ? payloadClaims.iss : null;
    const expectedRef = getProjectRefFromUrl(supabaseUrl);

    console.log('EDGE JWT =>', {
      fn,
      tokenRef,
      tokenIss,
      expectedRef
    });

    if (expectedRef && tokenRef && tokenRef !== expectedRef) {
      throw new Error('token_de_outro_projeto');
    }

    return accessToken;
  };

  const doRequest = async (accessToken: string) => {
    console.log('EDGE CALL =>', { fn, hasToken: !!accessToken, tokenLen: accessToken.length });
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

    return { response, parsed };
  };

  let token = await getValidAccessToken();
  let { response, parsed } = await doRequest(token);

  if (response.status === 401) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const refreshedToken = refreshData.session?.access_token;
    if (!refreshedToken) throw new Error('token_invalido_ou_expirado');
    ({ response, parsed } = await doRequest(refreshedToken));
  }

  if (!response.ok) {
    console.log('EDGE ERROR =>', { status: response.status, body: parsed });

    if (response.status === 401) throw new Error('nao_autorizado');

    const message = parsed?.error || parsed?.message || `http_${response.status}`;
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
