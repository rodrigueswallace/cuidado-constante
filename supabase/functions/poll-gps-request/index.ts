import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

interface PollGpsRequestBody {
  collar_id: string;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<PollGpsRequestBody>;
    if (!body.collar_id || !body.ts || !body.signature) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const sharedSecret = Deno.env.get('COLLAR_SHARED_SECRET');
    if (!sharedSecret) {
      return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
    }

    const canonical = `${body.collar_id}|${body.ts}|poll`;
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

    await supabase
      .from('gps_update_requests')
      .update({ status: 'pending', processing_at: null, error: null })
      .eq('collar_id', body.collar_id)
      .eq('status', 'processing')
      .lt('processing_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    const { data: pending, error: pendingError } = await supabase
      .from('gps_update_requests')
      .select('id')
      .eq('collar_id', body.collar_id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (pendingError) throw pendingError;

    if (!pending) {
      return new Response(JSON.stringify({ ok: true, has_request: false }), { status: 200, headers: corsHeaders });
    }

    const { data: claimed, error: claimError } = await supabase
      .from('gps_update_requests')
      .update({
        status: 'processing',
        processing_at: new Date().toISOString()
      })
      .eq('id', pending.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (claimError) throw claimError;

    if (!claimed) {
      return new Response(JSON.stringify({ ok: true, has_request: false }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, has_request: true, request_id: claimed.id }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
