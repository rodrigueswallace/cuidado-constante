import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { registerCollar } from '@/services/edgeApi';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';

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

        const fetchedPets = (data || []).map((pet) => ({
          id: pet.id,
          name: pet.name
        }));

        setPets(fetchedPets);
        if (fetchedPets.length > 0) {
          setPetName(fetchedPets[0].name);
        }
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
    if (existingPet) return existingPet.id;

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário inválido. Faça login novamente.');
    }

    const { data, error } = await supabase
      .from('pets')
      .insert({
        owner_user_id: user.id,
        name: petName.trim()
      })
      .select('id, name')
      .single();

    if (error) {
      throw error;
    }

    setPets((prev) => [...prev, data]);
    return data.id;
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const petId = await ensurePetId();

      const result = await registerCollar({
        pet_id: petId,
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
      const message = err instanceof Error ? getFriendlyRegisterError(err.message) : 'Não foi possível ativar a coleira.';
      Alert.alert('Erro ao ativar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar coleira/dispositivo</Text>
      <TextInput
        value={petName}
        onChangeText={setPetName}
        style={styles.input}
        placeholder="Nome do pet"
        editable={!submitting && !loadingPets}
      />
      <TextInput
        value={serial}
        onChangeText={setSerial}
        style={styles.input}
        placeholder="Serial"
        autoCapitalize="characters"
        editable={!submitting}
      />
      <TextInput
        value={activationCode}
        onChangeText={setActivationCode}
        style={styles.input}
        placeholder="Código de ativação"
        autoCapitalize="none"
        editable={!submitting}
      />

      {loadingPets || submitting ? <ActivityIndicator /> : <Button title="Ativar coleira" onPress={handleSubmit} disabled={!canSubmit} />}
      <Button title="Cancelar" onPress={() => navigation.goBack()} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
