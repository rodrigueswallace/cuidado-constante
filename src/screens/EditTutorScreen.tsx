import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { fetchTutorProfile, saveTutorProfile } from '@/services/profile';
import { colors, spacing } from '@/theme/tokens';
import { formatPhone, isoDateToDashedDisplay } from '@/utils/formats';

export function EditTutorScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTutorProfile();
        setFullName(data.fullName);
        setPhone(formatPhone(data.phone));
        setCreatedAt(isoDateToDashedDisplay(data.createdAt));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar dados do tutor.';
        Alert.alert('Erro', message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erro', 'Informe o nome do tutor.');
      return;
    }

    setSaving(true);
    try {
      await saveTutorProfile({ fullName, phone, createdAt });
      Alert.alert('Dados atualizados', 'Os dados do tutor foram salvos com sucesso.');
      openConfigTab();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar dados do tutor.';
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Alterar dados do tutor</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AppInput label="Nome completo" value={fullName} onChangeText={setFullName} editable={!saving} autoCapitalize="words" />
                <AppInput label="Número de telefone" value={phone} onChangeText={(value) => setPhone(formatPhone(value))} keyboardType="phone-pad" editable={!saving} />
                <AppInput label="Data de cadastro" value={createdAt} editable={false} />
                <AppButton title="Salvar dados" onPress={handleSave} disabled={saving} />
                <AppButton title="Cancelar" onPress={openConfigTab} variant="secondary" disabled={saving} />
              </>
            )}
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
