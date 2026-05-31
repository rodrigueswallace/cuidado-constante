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
  const [selectedPet, setSelectedPet] = useState<PetOption | null>(null);
  const [loadingPet, setLoadingPet] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => serial.trim().length > 0 && activationCode.trim().length > 0 && !!selectedPet?.id,
    [activationCode, selectedPet?.id, serial]
  );

  useEffect(() => {
    const loadPrimaryPet = async () => {
      setLoadingPet(true);
      try {
        const { data, error } = await supabase
          .from('pets')
          .select('id, name')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSelectedPet({ id: data.id, name: data.name });
        } else {
          setSelectedPet(null);
        }
      } catch {
        setSelectedPet(null);
      } finally {
        setLoadingPet(false);
      }
    };

    loadPrimaryPet();
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !selectedPet) return;

    setSubmitting(true);
    try {
      const result = await registerCollar({
        pet_id: selectedPet.id,
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
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Adicionar dispositivo</Text>
        <AppCard>
          <View style={styles.form}>
            {loadingPet ? <ActivityIndicator color={colors.primary} /> : null}

            <AppInput value={selectedPet?.name ?? ''} label="Nome do pet" editable={false} />
            <AppInput value={serial} onChangeText={setSerial} label="Serial" autoCapitalize="characters" editable={!submitting && !loadingPet} />
            <AppInput value={activationCode} onChangeText={setActivationCode} label="Código de ativação" autoCapitalize="none" editable={!submitting && !loadingPet} />

            {!loadingPet && !selectedPet ? <Text style={styles.warn}>Cadastre um pet antes de adicionar um dispositivo.</Text> : null}

            {submitting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <AppButton title="Ativar dispositivo" onPress={handleSubmit} disabled={!canSubmit || loadingPet} />
            )}
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
  form: { gap: spacing.sm },
  warn: { color: colors.danger }
});
