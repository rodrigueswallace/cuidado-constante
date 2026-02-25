import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

interface RegisterCollarBody {
  pet_id: string;
  serial: string;
  activation_code: string;
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

    const body = (await req.json()) as Partial<RegisterCollarBody>;

    if (!body.pet_id || !body.serial || !body.activation_code) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const serial = body.serial.trim().toUpperCase();
    const activationCode = body.activation_code.trim();

    if (!serial || !activationCode) {
      return new Response(JSON.stringify({ error: 'payload_invalido' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', body.pet_id)
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (petError) throw petError;

    if (!pet) {
      return new Response(JSON.stringify({ error: 'pet_nao_autorizado' }), { status: 403, headers: corsHeaders });
    }

    const { data: collar, error: collarError } = await supabase
      .from('collars')
      .select('id, serial, pet_id, ble_service_uuid')
      .eq('serial', serial)
      .eq('activation_code', activationCode)
      .maybeSingle();

    if (collarError) throw collarError;

    if (!collar) {
      return new Response(JSON.stringify({ error: 'serial_ou_codigo_invalido' }), { status: 400, headers: corsHeaders });
    }

    if (collar.pet_id && collar.pet_id !== body.pet_id) {
      return new Response(JSON.stringify({ error: 'coleira_ja_vinculada' }), { status: 409, headers: corsHeaders });
    }

    if (!collar.pet_id) {
      const { data: linkedCollar, error: linkError } = await supabase
        .from('collars')
        .update({ pet_id: body.pet_id })
        .eq('id', collar.id)
        .is('pet_id', null)
        .select('id, serial, ble_service_uuid')
        .maybeSingle();

      if (linkError) throw linkError;

      if (!linkedCollar) {
        return new Response(JSON.stringify({ error: 'coleira_ja_vinculada' }), { status: 409, headers: corsHeaders });
      }

      return new Response(
        JSON.stringify({
          collar_id: linkedCollar.id,
          serial: linkedCollar.serial,
          ble_service_uuid: linkedCollar.ble_service_uuid
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        collar_id: collar.id,
        serial: collar.serial,
        ble_service_uuid: collar.ble_service_uuid
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
  }
});
