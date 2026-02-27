// src/services/supabase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

function clean(value: string | undefined) {
  // remove espaços/quebras e aspas no começo/fim (muito comum em Secrets colados com "...")
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function required(value: string | undefined, key: string) {
  const v = clean(value);
  if (!v) throw new Error(`Variável ${key} não configurada.`);
  return v;
}

const supabaseUrl = required(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  "EXPO_PUBLIC_SUPABASE_URL"
);

const supabaseAnonKey = required(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
);

// Log “seguro” (não imprime a key)
console.log("ENV CHECK", {
  urlPrefix: supabaseUrl.slice(0, 20), // só o começo
  urlLen: supabaseUrl.length,
  hasAnonKey: !!supabaseAnonKey,
});

if (!/^https?:\/\/.+/i.test(supabaseUrl)) {
  throw new Error(`Supabase URL inválida (após limpar): ${JSON.stringify(supabaseUrl)}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});