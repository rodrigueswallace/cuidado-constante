import { supabase } from '@/services/supabase';

export interface EditableDeviceProfile {
  id: string;
  petName: string;
  serial: string;
  activationCode: string;
  displayName: string;
  bleDeviceName: string;
}

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

export async function fetchEditableDeviceProfile(collarId: string): Promise<EditableDeviceProfile | null> {
  await getCurrentUserId();

  const { data, error } = await supabase
    .from('collars')
    .select('id, serial, activation_code, display_name, ble_device_name, pets(name)')
    .eq('id', collarId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const petName = Array.isArray(data.pets) ? data.pets[0]?.name : (data.pets as { name?: string } | null)?.name;

  return {
    id: data.id,
    petName: petName ?? '',
    serial: data.serial ?? '',
    activationCode: data.activation_code ?? '',
    displayName: data.display_name ?? '',
    bleDeviceName: data.ble_device_name ?? ''
  };
}

export async function saveEditableDeviceProfile(payload: EditableDeviceProfile) {
  await getCurrentUserId();

  const { error } = await supabase
    .from('collars')
    .update({
      display_name: payload.displayName.trim() || null,
      ble_device_name: payload.bleDeviceName.trim() || null
    })
    .eq('id', payload.id);

  if (error) throw error;
}

export async function saveBleDeviceName(collarId: string, bleDeviceName: string) {
  await getCurrentUserId();

  const { error } = await supabase
    .from('collars')
    .update({
      ble_device_name: bleDeviceName.trim() || null
    })
    .eq('id', collarId);

  if (error) throw error;
}
