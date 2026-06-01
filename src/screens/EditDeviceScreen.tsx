import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { writeBleDeviceName } from '@/services/bleDeviceConfig';
import { EditableDeviceProfile, fetchEditableDeviceProfile, saveEditableDeviceProfile } from '@/services/device';
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
  const { activeCollarId, connectedBleDeviceId, connectedBleDeviceName } = useAppStore();
  const [form, setForm] = useState<EditableDeviceProfile>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const updateField = (field: keyof EditableDeviceProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.id) {
      Alert.alert('Erro', 'Cadastre uma coleira antes de editar o dispositivo.');
      return;
    }

    if (!form.displayName.trim()) {
      Alert.alert('Erro', 'Preencha o nome da coleira.');
      return;
    }

    setSaving(true);
    try {
      await saveEditableDeviceProfile(form);

      if (connectedBleDeviceId && form.bleDeviceName.trim()) {
        await writeBleDeviceName(connectedBleDeviceId, form.bleDeviceName);
      }

      Alert.alert('Dados atualizados', 'Os dados do dispositivo foram salvos com sucesso.');
      openConfigTab();
    } catch (error) {
      let message = 'Falha ao salvar os dados do dispositivo.';

      if (error instanceof Error) {
        if (error.message.includes('configuracao_ble_nome_ausente')) {
          message = 'Os UUIDs de configuração do nome BLE ainda não foram definidos no app.';
        } else if (error.message.includes('dispositivo_ble_nao_conectado')) {
          message = 'Conecte o dispositivo na tela Bluetooth antes de enviar o novo nome para a coleira.';
        } else if (error.message.includes('nome_ble_invalido')) {
          message = 'Informe um nome válido para o dispositivo Bluetooth.';
        } else {
          message = error.message;
        }
      }

      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Alterar dados do dispositivo</Text>
        <AppCard>
          <View style={styles.form}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : !activeCollarId ? (
              <>
                <Text style={styles.helper}>Nenhuma coleira ativa foi encontrada para edição.</Text>
                <AppButton title="Voltar" onPress={openConfigTab} variant="secondary" />
              </>
            ) : (
              <>
                <AppInput label="Nome do pet" value={form.petName} editable={false} />
                <AppInput label="Nome da coleira" value={form.displayName} onChangeText={(value) => updateField('displayName', value)} editable={!saving} />
                <AppInput label="Serial" value={form.serial} editable={false} autoCapitalize="characters" />
                <AppInput label="Código de ativação" value={form.activationCode} editable={false} />
                <Text style={styles.helper}>Serial e código de ativação só podem vir de coleiras pré-cadastradas pelo administrador.</Text>
                <AppInput label="Nome do dispositivo Bluetooth" value={form.bleDeviceName} onChangeText={(value) => updateField('bleDeviceName', value)} editable={!saving} />
                <Text style={styles.helper}>
                  {connectedBleDeviceId
                    ? 'Ao salvar, o app também enviará esse nome para o ESP32 pelo Bluetooth.'
                    : 'Conecte a coleira na tela Bluetooth para enviar o novo nome físico ao ESP32.'}
                </Text>
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
  form: { gap: spacing.sm },
  helper: { color: colors.textMuted, lineHeight: 19 }
});
