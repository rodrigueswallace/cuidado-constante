import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

interface IngestBleBody {
  collar_id: string;
  rssi: number;
  battery?: number | null;
  ts: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'auth_obrigatorio' }), { status: 401, headers: corsHeaders });
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'usuario_invalido' }), { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as Partial<IngestBleBody>;

    if (!body.collar_id || typeof body.rssi !== 'number' || !body.ts || Number.isNaN(body.rssi)) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    const { data: collar, error: collarError } = await supabase
      .from('collars')
      .select('id, pets!inner(owner_user_id)')
      .eq('id', body.collar_id)
      .eq('pets.owner_user_id', user.id)
      .maybeSingle();

    if (collarError || !collar) {
      return new Response(JSON.stringify({ error: 'coleira_nao_autorizada' }), { status: 403, headers: corsHeaders });
    }

    const { error: insertError } = await supabase.from('ble_events').insert({
      collar_id: body.collar_id,
      rssi: body.rssi,
      battery: body.battery ?? null,
      ts: body.ts
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
