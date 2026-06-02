import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

interface RequestGpsUpdateBody {
  collar_id: string;
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

    const body = (await req.json()) as Partial<RequestGpsUpdateBody>;
    if (!body.collar_id) {
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

    const { data: existing, error: existingError } = await supabase
      .from('gps_update_requests')
      .select('id, status, requested_at')
      .eq('collar_id', body.collar_id)
      .in('status', ['pending', 'processing'])
      .order('requested_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return new Response(JSON.stringify({ ok: true, request_id: existing.id, status: existing.status, already_pending: true }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const { data: requestRow, error: insertError } = await supabase
      .from('gps_update_requests')
      .insert({
        collar_id: body.collar_id,
        requested_by: user.id
      })
      .select('id, status, requested_at')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ ok: true, request_id: requestRow.id, status: requestRow.status, already_pending: false }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
