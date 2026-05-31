import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { registerCollar } from '@/services/edgeApi';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

interface PetOption {
  id: string;
  name: string;
}

function getFriendlyRegisterError(errorMessage: string) {
  if (errorMessage.includes('serial_ou_codigo_invalido')) {
    return 'Serial ou código de ativação inválido. Confira os dados e tente novamente.';
  }

  if (errorMessage.includes('coleira_ja_vinculada')) {
    return 'Essa coleira já está vinculada a outro pet.';
  }

  if (errorMessage.includes('pet_nao_autorizado')) {
    return 'Pet inválido para este usuário. Atualize o app e tente novamente.';
  }

  if (
    errorMessage.includes('token_invalido_ou_expirado') ||
    errorMessage.includes('usuario_invalido') ||
    errorMessage.includes('auth_obrigatorio') ||
    errorMessage.includes('nao_autorizado') ||
    errorMessage.includes('token_de_outro_projeto')
  ) {
    return 'Sessão expirada. Faça login novamente e tente ativar a coleira.';
  }

  if (errorMessage.includes('Failed to send a request to the Edge Function')) {
    return 'Não foi possível conectar ao servidor de cadastro da coleira.';
  }

  return 'Não foi possível ativar a coleira agora. Tente novamente em instantes.';
}

export function AddCollarScreen() {
  const navigation = useNavigation<any>();
  const { setActiveCollarId } = useAppStore();
  const [serial, setSerial] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [petName, setPetName] = useState('Meu pet');
  const [pets, setPets] = useState<PetOption[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => serial.trim().length > 0 && activationCode.trim().length > 0 && petName.trim().length > 0,
    [serial, activationCode, petName]
  );

  useEffect(() => {
    const loadPets = async () => {
      setLoadingPets(true);
      try {
        const { data, error } = await supabase.from('pets').select('id, name').order('created_at', { ascending: true });

        if (error) throw error;

        const fetchedPets = (data || []).map((pet) => ({ id: pet.id, name: pet.name }));
        setPets(fetchedPets);
        if (fetchedPets.length > 0) setPetName(fetchedPets[0].name);
      } catch {
        setPets([]);
      } finally {
        setLoadingPets(false);
      }
    };

    loadPets();
  }, []);

  const ensurePetId = async () => {
    const existingPet = pets.find((pet) => pet.name === petName.trim());
    if (existingPet) return { petId: existingPet.id, createdNow: false };

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário inválido. Faça login novamente.');
    }

    const { data, error } = await supabase
      .from('pets')
      .insert({ owner_user_id: user.id, name: petName.trim() })
      .select('id, name')
      .single();

    if (error) throw error;

    setPets((prev) => [...prev, data]);
    return { petId: data.id, createdNow: true };
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    let createdPetId: string | null = null;
    try {
      const petRef = await ensurePetId();
      if (petRef.createdNow) createdPetId = petRef.petId;

      const result = await registerCollar({
        pet_id: petRef.petId,
        serial: serial.trim().toUpperCase(),
        activation_code: activationCode.trim()
      });

      if (!result?.collar_id) {
        throw new Error('Resposta inválida ao cadastrar coleira.');
      }

      await setActiveCollarId(result.collar_id);
      Alert.alert('Coleira ativada', `Coleira ${result.serial} vinculada com sucesso.`);
      navigation.goBack();
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const shouldRollbackNewPet =
        !!createdPetId &&
        (rawMessage.includes('serial_ou_codigo_invalido') ||
          rawMessage.includes('coleira_ja_vinculada') ||
          rawMessage.includes('pet_nao_autorizado'));

      if (shouldRollbackNewPet && createdPetId) {
        try {
          await supabase.from('pets').delete().eq('id', createdPetId);
          setPets((prev) => prev.filter((pet) => pet.id !== createdPetId));
        } catch {
          // Keep UX stable even if rollback fails.
        }
      }

      const message = err instanceof Error ? getFriendlyRegisterError(err.message) : 'Não foi possível ativar a coleira.';
      Alert.alert('Erro ao ativar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Adicionar coleira</Text>
        <AppCard>
          <View style={styles.form}>
            <AppInput value={petName} onChangeText={setPetName} label="Nome do pet" editable={!submitting && !loadingPets} />
            <AppInput value={serial} onChangeText={setSerial} label="Serial" autoCapitalize="characters" editable={!submitting} />
            <AppInput
              value={activationCode}
              onChangeText={setActivationCode}
              label="Código de ativação"
              autoCapitalize="none"
              editable={!submitting}
            />

            {loadingPets || submitting ? <ActivityIndicator color={colors.primary} /> : <AppButton title="Ativar coleira" onPress={handleSubmit} disabled={!canSubmit} />}
            <AppButton title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" disabled={submitting} />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  form: { gap: spacing.sm }
});
