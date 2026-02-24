import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const createAdminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export const createUserClient = (authorization: string) =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });
