import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign'
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { collar_id, lat, lng, battery, ts, signature } = payload;

    if (!collar_id || typeof lat !== 'number' || typeof lng !== 'number' || !ts || !signature) {
      return new Response(JSON.stringify({ error: 'payload inválido' }), { status: 400, headers: corsHeaders });
    }

    const sharedSecret = Deno.env.get('COLLAR_SHARED_SECRET') ?? '';
    const expected = await hmacSha256Hex(sharedSecret, `${collar_id}|${lat}|${lng}|${ts}`);

    if (expected !== signature) {
      return new Response(JSON.stringify({ error: 'assinatura inválida' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: collar, error: collarError } = await supabase.from('collars').select('id').eq('id', collar_id).maybeSingle();

    if (collarError || !collar) {
      return new Response(JSON.stringify({ error: 'coleira não encontrada' }), { status: 404, headers: corsHeaders });
    }

    const { error: insertError } = await supabase.from('gps_events').insert({ collar_id, lat, lng, battery: battery ?? null, ts });

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('collars')
      .update({ last_seen: ts, battery: battery ?? null })
      .eq('id', collar_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
