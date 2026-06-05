const required = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Variável ${key} não configurada.`);
  }
  return value;
};

export const env = {
  supabaseUrl: required(process.env['EXPO_PUBLIC_SUPABASE_URL'], 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'], 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  googleMapsApiKey: required(process.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'], 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY')
};
