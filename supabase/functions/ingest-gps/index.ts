import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

interface IngestGpsBody {
  collar_id: string;
  lat: number;
  lng: number;
  battery?: number | null;
  ts: string;
  signature: string;
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign'
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function invalid(body: Partial<IngestGpsBody>) {
  return (
    !body.collar_id ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number' ||
    !body.ts ||
    !body.signature ||
    Number.isNaN(body.lat) ||
    Number.isNaN(body.lng)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<IngestGpsBody>;

    if (invalid(body)) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const sharedSecret = Deno.env.get('COLLAR_SHARED_SECRET');
    if (!sharedSecret) {
      return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
    }

    const canonical = `${body.collar_id}|${body.lat}|${body.lng}|${body.ts}`;
    const expected = await hmacSha256Hex(sharedSecret, canonical);
    if (expected !== body.signature) {
      return new Response(JSON.stringify({ error: 'assinatura_invalida' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    const { data: collar, error: collarError } = await supabase
      .from('collars')
      .select('id')
      .eq('id', body.collar_id)
      .maybeSingle();

    if (collarError || !collar) {
      return new Response(JSON.stringify({ error: 'coleira_nao_encontrada' }), { status: 404, headers: corsHeaders });
    }

    const payload = {
      collar_id: body.collar_id,
      lat: body.lat,
      lng: body.lng,
      battery: body.battery ?? null,
      ts: body.ts
    };

    const { error: eventError } = await supabase.from('gps_events').insert(payload);
    if (eventError) throw eventError;

    const { error: updateError } = await supabase
      .from('collars')
      .update({
        last_seen: body.ts,
        battery: body.battery ?? null
      })
      .eq('id', body.collar_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
