import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';

export function AddCollarScreen() {
  const navigation = useNavigation<any>();
  const { setActiveCollarId } = useAppStore();
  const [serial, setSerial] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => serial.trim().length > 0 && activationCode.trim().length > 0, [serial, activationCode]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('collars')
        .select('id, serial')
        .eq('serial', serial.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Coleira não encontrada', 'Verifique o serial informado.');
        return;
      }

      await setActiveCollarId(data.id);
      Alert.alert('Coleira ativada', `Coleira ${data.serial} vinculada com sucesso.`);
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível ativar a coleira.';
      Alert.alert('Erro ao ativar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar coleira/dispositivo</Text>
      <TextInput
        value={serial}
        onChangeText={setSerial}
        style={styles.input}
        placeholder="Serial"
        autoCapitalize="characters"
      />
      <TextInput
        value={activationCode}
        onChangeText={setActivationCode}
        style={styles.input}
        placeholder="Código de ativação"
        autoCapitalize="none"
      />

      {submitting ? <ActivityIndicator /> : <Button title="Ativar coleira" onPress={handleSubmit} disabled={!canSubmit} />}
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
