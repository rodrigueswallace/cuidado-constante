import { supabase } from '@/services/supabase';

function extractTokensFromUrl(url: string) {
  const normalized = url.replace('#', '?');
  const query = normalized.split('?')[1];
  if (!query) return null;

  const params = new URLSearchParams(query);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return null;

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}

export const authService = {
  signIn: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) => supabase.auth.signUp({ email, password }),
  resetPasswordForEmail: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'cuidado-constante://reset-password'
    }),
  updatePassword: (password: string) => supabase.auth.updateUser({ password }),
  setSessionFromUrl: async (url: string) => {
    const tokens = extractTokensFromUrl(url);
    if (!tokens) return { data: { session: null }, error: null };

    return supabase.auth.setSession(tokens);
  },
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession()
};
