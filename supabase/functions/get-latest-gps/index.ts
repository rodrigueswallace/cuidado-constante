import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient } from '../_shared/supabase.ts';

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

    const supabase = createUserClient(authHeader);
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'token_invalido_ou_expirado' }), { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as { collar_id?: string };

    if (!body.collar_id) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('gps_events')
      .select('id, collar_id, lat, lng, battery, ts')
      .eq('collar_id', body.collar_id)
      .order('ts', { ascending: false })
      .limit(100);

    if (error) throw error;

    return new Response(JSON.stringify({ events: data ?? [] }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
