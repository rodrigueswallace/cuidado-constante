import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { authService } from '@/services/auth';
import { deleteAccount } from '@/services/edgeApi';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

export function DeleteAccountScreen() {
  const [deleting, setDeleting] = useState(false);
  const { setActiveCollarId } = useAppStore();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await setActiveCollarId(null);
      await authService.signOut();
      Alert.alert('Conta excluída', 'Sua conta foi removida permanentemente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir a conta.';
      Alert.alert('Erro', message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Excluir conta</Text>
        <AppCard>
          <View style={styles.form}>
            <Text style={styles.warning}>
              Esta ação é permanente. Todos os dados do tutor, do pet, do e-mail e da senha serão excluídos. Não haverá opção de desfazer depois da confirmação.
            </Text>
            <Text style={styles.helper}>O serial e o código de ativação da coleira serão preservados no banco.</Text>
            <AppButton title="Excluir conta permanentemente" onPress={handleDelete} disabled={deleting} />
            <AppButton title="Cancelar" onPress={openConfigTab} variant="secondary" disabled={deleting} />
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
  warning: { color: colors.danger, fontWeight: '800', lineHeight: 22 },
  helper: { color: colors.textMuted, lineHeight: 19 }
});
