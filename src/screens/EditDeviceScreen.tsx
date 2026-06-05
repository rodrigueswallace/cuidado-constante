import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { EditableDeviceProfile, fetchEditableDeviceProfile } from '@/services/device';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

const EMPTY_FORM: EditableDeviceProfile = {
  id: '',
  petName: '',
  serial: '',
  activationCode: '',
  displayName: '',
  bleDeviceName: ''
};

export function EditDeviceScreen() {
  const { activeCollarId, connectedBleDeviceName } = useAppStore();
  const [form, setForm] = useState<EditableDeviceProfile>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!activeCollarId) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchEditableDeviceProfile(activeCollarId);
        if (!data) {
          Alert.alert('Dispositivo não encontrado', 'Não foi possível localizar a coleira ativa.');
          openConfigTab();
          return;
        }

        setForm({
          ...data,
          displayName: data.displayName || data.petName,
          bleDeviceName: data.bleDeviceName || connectedBleDeviceName || ''
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar os dados do dispositivo.';
        Alert.alert('Erro', message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeCollarId, connectedBleDeviceName]);

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Dados do dispositivo</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : !activeCollarId ? (
              <Text style={styles.helper}>Nenhuma coleira ativa foi encontrada para visualização.</Text>
            ) : (
              <>
                <AppInput label="Nome do pet" value={form.petName} editable={false} />
                <AppInput label="Nome da coleira" value={form.displayName} editable={false} />
                <AppInput label="Serial" value={form.serial} editable={false} autoCapitalize="characters" />
                <AppInput label="Código de ativação" value={form.activationCode} editable={false} />
                <AppInput label="Nome do dispositivo Bluetooth" value={form.bleDeviceName || '--'} editable={false} />
                <Text style={styles.helper}>Esses dados são apenas para consulta. Serial e código de ativação vêm de coleiras pré-cadastradas pelo administrador.</Text>
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
  form: { gap: spacing.sm },
  helper: { color: colors.textMuted, lineHeight: 19 }
});
