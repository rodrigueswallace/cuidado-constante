import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';


function required(value: string | undefined, key: string) {
  if (!value) throw new Error(`Variável ${key} não configurada.`);
  return value;
}

const supabaseUrl = required(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  'EXPO_PUBLIC_SUPABASE_URL'
);

const supabaseAnonKey = required(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {

  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,

    detectSessionInUrl: false,
  },
});

