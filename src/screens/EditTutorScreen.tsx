import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { fetchTutorProfile, saveTutorProfile } from '@/services/profile';
import { colors, spacing } from '@/theme/tokens';

export function EditTutorScreen() {
  const navigation = useNavigation<any>();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTutorProfile();
        setFullName(data.fullName);
        setPhone(data.phone);
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
      await saveTutorProfile({ fullName, phone });
      Alert.alert('Dados atualizados', 'Os dados do tutor foram salvos com sucesso.');
      navigation.goBack();
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
        <Text style={styles.title}>Alterar dados tutor</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AppInput label="Nome completo" value={fullName} onChangeText={setFullName} editable={!saving} />
                <AppInput label="Celular" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!saving} />
                <AppButton title="Salvar dados" onPress={handleSave} disabled={saving} />
                <AppButton title="Cancelar" onPress={() => navigation.goBack()} variant="secondary" disabled={saving} />
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
