import { supabase } from '@/services/supabase';
import { PetProfileForm, TutorProfileForm } from '@/types/profile';

async function getCurrentUserId() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('usuario_nao_autenticado');
  }

  return user.id;
}

export async function fetchTutorProfile(): Promise<TutorProfileForm> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  return {
    fullName: typeof data?.full_name === 'string' ? data.full_name : '',
    phone: typeof data?.phone === 'string' ? data.phone : ''
  };
}

export async function saveTutorProfile(payload: TutorProfileForm) {
  const userId = await getCurrentUserId();

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: payload.fullName.trim() || null,
      phone: payload.phone.trim() || null
    },
    { onConflict: 'id' }
  );

  if (error) throw error;
}

export async function fetchPrimaryPetProfile(): Promise<PetProfileForm> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('pets')
    .select('id, name, species, birth_date, color, sex, weight_kg, size, microchip, breed, notes')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    id: data?.id ?? null,
    name: data?.name ?? '',
    species: data?.species ?? '',
    birthDate: data?.birth_date ?? '',
    color: data?.color ?? '',
    sex: data?.sex ?? '',
    weightKg: data?.weight_kg != null ? String(data.weight_kg) : '',
    size: data?.size ?? '',
    microchip: data?.microchip ?? '',
    breed: data?.breed ?? '',
    notes: data?.notes ?? ''
  };
}

export async function savePrimaryPetProfile(payload: PetProfileForm) {
  const userId = await getCurrentUserId();
  const body = {
    owner_user_id: userId,
    name: payload.name.trim(),
    species: payload.species.trim() || null,
    birth_date: payload.birthDate.trim() || null,
    color: payload.color.trim() || null,
    sex: payload.sex.trim() || null,
    weight_kg: payload.weightKg.trim() ? Number(payload.weightKg.replace(',', '.')) : null,
    size: payload.size.trim() || null,
    microchip: payload.microchip.trim() || null,
    breed: payload.breed.trim() || null,
    notes: payload.notes.trim() || null
  };

  if (payload.id) {
    const { error } = await supabase
      .from('pets')
      .update(body)
      .eq('id', payload.id)
      .eq('owner_user_id', userId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('pets').insert(body);
  if (error) throw error;
}
