import { supabase } from '@/services/supabase';
import { PetSignUpPayload, TutorSignUpPayload } from '@/types/auth';

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
  signUp: (tutor: TutorSignUpPayload, pet: PetSignUpPayload) =>
    supabase.auth.signUp({
      email: tutor.email,
      password: tutor.password,
      options: {
        data: {
          full_name: tutor.fullName.trim(),
          phone: tutor.phone.trim(),
          pet_name: pet.name.trim(),
          pet_species: pet.species.trim() || null,
          pet_birth_date: pet.birthDate.trim() || null,
          pet_color: pet.color.trim() || null,
          pet_sex: pet.sex.trim() || null,
          pet_weight_kg: pet.weightKg.trim() || null,
          pet_size: pet.size.trim() || null,
          pet_microchip: pet.microchip.trim() || null,
          pet_breed: pet.breed.trim() || null,
          pet_notes: pet.notes.trim() || null
        }
      }
    }),
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
