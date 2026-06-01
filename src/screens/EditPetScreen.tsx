import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { fetchPrimaryPetProfile, savePrimaryPetProfile } from '@/services/profile';
import { PetProfileForm } from '@/types/profile';
import { colors, radius, spacing } from '@/theme/tokens';
import { cmInputToNumberString, displayDateToIso, formatCmInput, formatDateDigits, formatWeightInput, weightInputToNumberString } from '@/utils/formats';

const EMPTY_FORM: PetProfileForm = {
  id: null,
  name: '',
  species: 'cachorro',
  birthDate: '',
  color: '',
  sex: '',
  weightKg: '',
  size: '',
  microchip: '',
  breed: '',
  notes: ''
};

const SPECIES_OPTIONS = [
  { value: 'cachorro', label: 'Cachorro' },
  { value: 'gato', label: 'Gato' }
] as const;

const SEX_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'femea', label: 'Fêmea' }
] as const;

export function EditPetScreen() {
  const [form, setForm] = useState<PetProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPrimaryPetProfile();
        setForm({
          ...data,
          species: data.species === 'gato' ? 'gato' : 'cachorro',
          weightKg: data.weightKg ? formatWeightInput(data.weightKg) : '',
          size: data.size ? formatCmInput(data.size) : ''
        });
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

    const birthDateIso = form.birthDate.trim() ? displayDateToIso(form.birthDate.trim()) : null;
    if (form.birthDate.trim() && !birthDateIso) {
      Alert.alert('Erro', 'Use a data no formato DD/MM/AAAA.');
      return;
    }

    setSaving(true);
    try {
      await savePrimaryPetProfile({
        ...form,
        birthDate: birthDateIso ?? '',
        weightKg: weightInputToNumberString(form.weightKg),
        size: cmInputToNumberString(form.size)
      });
      Alert.alert('Dados atualizados', 'Os dados do pet foram salvos com sucesso.');
      openConfigTab();
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
        <Text style={styles.title}>Alterar dados do pet</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AppInput label="Nome" value={form.name} onChangeText={(value) => updateField('name', value)} editable={!saving} autoCapitalize="words" />
                <View style={styles.selectorBlock}>
                  <Text style={styles.selectorLabel}>Espécie</Text>
                  <View style={styles.selectorRow}>
                    {SPECIES_OPTIONS.map((option) => {
                      const selected = form.species === option.value;
                      return (
                        <Pressable key={option.value} style={[styles.selectorOption, selected ? styles.selectorOptionSelected : null]} onPress={() => updateField('species', option.value)}>
                          <Text style={[styles.selectorText, selected ? styles.selectorTextSelected : null]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <AppInput label="Data de nascimento" value={form.birthDate} onChangeText={(value) => updateField('birthDate', formatDateDigits(value))} placeholder="DD/MM/AAAA" keyboardType="number-pad" editable={!saving} />
                <AppInput label="Cor" value={form.color} onChangeText={(value) => updateField('color', value)} editable={!saving} autoCapitalize="words" />
                <View style={styles.selectorBlock}>
                  <Text style={styles.selectorLabel}>Sexo</Text>
                  <View style={styles.selectorRow}>
                    {SEX_OPTIONS.map((option) => {
                      const selected = form.sex === option.value;
                      return (
                        <Pressable key={option.value} style={[styles.selectorOption, selected ? styles.selectorOptionSelected : null]} onPress={() => updateField('sex', option.value)}>
                          <Text style={[styles.selectorText, selected ? styles.selectorTextSelected : null]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <AppInput
                  label="Peso"
                  value={form.weightKg}
                  onChangeText={(value) => updateField('weightKg', formatWeightInput(value))}
                  keyboardType="number-pad"
                  editable={!saving}
                  placeholder="00.0"
                  selection={{ start: form.weightKg.length, end: form.weightKg.length }}
                />
                <View style={styles.unitRow}>
                  <View style={styles.unitInput}>
                    <AppInput
                      label="Tamanho"
                      value={form.size}
                      onChangeText={(value) => updateField('size', formatCmInput(value))}
                      keyboardType="number-pad"
                      editable={!saving}
                      placeholder="00"
                      selection={{ start: form.size.length, end: form.size.length }}
                    />
                  </View>
                  <Text style={styles.unitText}>cm</Text>
                </View>
                <AppInput label="Microchip" value={form.microchip} onChangeText={(value) => updateField('microchip', value)} editable={!saving} autoCapitalize="characters" />
                <AppInput label="Raça" value={form.breed} onChangeText={(value) => updateField('breed', value)} editable={!saving} autoCapitalize="words" />
                <AppInput label="Observação" value={form.notes} onChangeText={(value) => updateField('notes', value)} editable={!saving} />
                <AppButton title="Salvar dados" onPress={handleSave} disabled={saving} />
                <AppButton title="Cancelar" onPress={openConfigTab} variant="secondary" disabled={saving} />
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
  form: { gap: spacing.sm },
  selectorBlock: { gap: spacing.xs },
  selectorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  selectorRow: { flexDirection: 'row', gap: spacing.sm },
  selectorOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  selectorOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF6FF'
  },
  selectorText: { color: colors.text, fontWeight: '600' },
  selectorTextSelected: { color: colors.primaryDark },
  unitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  unitInput: { flex: 1 },
  unitText: {
    color: colors.textMuted,
    fontWeight: '700',
    paddingBottom: spacing.sm + 5
  }
});
