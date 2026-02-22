import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'auth obrigatório' }), { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: userError
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'usuário inválido' }), { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const { collar_id, rssi, battery, ts } = payload;

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: collar, error: collarError } = await supabaseAdmin
      .from('collars')
      .select('id, pets!inner(owner_user_id)')
      .eq('id', collar_id)
      .eq('pets.owner_user_id', user.id)
      .maybeSingle();

    if (collarError || !collar) {
      return new Response(JSON.stringify({ error: 'coleira não autorizada' }), { status: 403, headers: corsHeaders });
    }

    const { error } = await supabaseAdmin.from('ble_events').insert({ collar_id, rssi, battery: battery ?? null, ts });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
