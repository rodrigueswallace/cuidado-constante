import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

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

    const supabase = createAdminClient();

    const { data: pets, error: petsError } = await supabase.from('pets').select('id').eq('owner_user_id', user.id);
    if (petsError) throw petsError;

    const petIds = (pets ?? []).map((pet) => pet.id);

    if (petIds.length > 0) {
      const { error: unlinkError } = await supabase.from('collars').update({ pet_id: null }).in('pet_id', petIds);
      if (unlinkError) throw unlinkError;

      const { error: deletePetsError } = await supabase.from('pets').delete().eq('owner_user_id', user.id);
      if (deletePetsError) throw deletePetsError;
    }

    const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', user.id);
    if (deleteProfileError) throw deleteProfileError;

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
