import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { fetchPrimaryPetProfile, savePrimaryPetProfile } from '@/services/profile';
import { PetProfileForm } from '@/types/profile';
import { colors, spacing } from '@/theme/tokens';

const EMPTY_FORM: PetProfileForm = {
  id: null,
  name: '',
  species: '',
  birthDate: '',
  color: '',
  sex: '',
  weightKg: '',
  size: '',
  microchip: '',
  breed: '',
  notes: ''
};

export function EditPetScreen() {
  const navigation = useNavigation<any>();
  const [form, setForm] = useState<PetProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPrimaryPetProfile();
        setForm(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar dados do pet.';
        Alert.alert('Erro', message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateField = (field: keyof PetProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome do pet.');
      return;
    }

    if (form.birthDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) {
      Alert.alert('Erro', 'Use a data no formato AAAA-MM-DD.');
      return;
    }

    if (form.weightKg.trim() && Number.isNaN(Number(form.weightKg.replace(',', '.')))) {
      Alert.alert('Erro', 'Informe o peso usando apenas numeros.');
      return;
    }

    setSaving(true);
    try {
      await savePrimaryPetProfile({ ...form, weightKg: form.weightKg.replace(',', '.') });
      Alert.alert('Dados atualizados', 'Os dados do pet foram salvos com sucesso.');
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar dados do pet.';
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Alterar dados pet</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AppInput label="Nome" value={form.name} onChangeText={(value) => updateField('name', value)} editable={!saving} />
                <AppInput label="Especie" value={form.species} onChangeText={(value) => updateField('species', value)} editable={!saving} />
                <AppInput label="Data de nascimento" value={form.birthDate} onChangeText={(value) => updateField('birthDate', value)} placeholder="AAAA-MM-DD" editable={!saving} />
                <AppInput label="Cor" value={form.color} onChangeText={(value) => updateField('color', value)} editable={!saving} />
                <AppInput label="Sexo" value={form.sex} onChangeText={(value) => updateField('sex', value)} editable={!saving} />
                <AppInput label="Peso em kg" value={form.weightKg} onChangeText={(value) => updateField('weightKg', value)} keyboardType="numeric" editable={!saving} />
                <AppInput label="Tamanho" value={form.size} onChangeText={(value) => updateField('size', value)} editable={!saving} />
                <AppInput label="Microchip" value={form.microchip} onChangeText={(value) => updateField('microchip', value)} editable={!saving} />
                <AppInput label="Raca" value={form.breed} onChangeText={(value) => updateField('breed', value)} editable={!saving} />
                <AppInput label="Observacao" value={form.notes} onChangeText={(value) => updateField('notes', value)} editable={!saving} />
                <AppButton title="Salvar dados" onPress={handleSave} disabled={saving} />
                <AppButton title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" disabled={saving} />
              </>
            )}
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  form: { gap: spacing.sm }
});
