import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { openConfigTab } from '@/navigation/navigationRef';
import { authService } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha a senha e a confirmação.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await authService.updatePassword(password);
      if (error) throw error;

      Alert.alert('Senha atualizada', 'Sua senha foi alterada com sucesso.');
      openConfigTab();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar a senha.';
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Redefinir senha</Text>
        <AppCard>
          <View style={styles.form}>
            <AppInput label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!saving} />
            <AppInput label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} editable={!saving} />
            <AppButton title={showPassword ? 'Ocultar senha' : 'Ver senha'} onPress={() => setShowPassword((prev) => !prev)} variant="secondary" disabled={saving} />
            <AppButton title="Salvar nova senha" onPress={handleSave} disabled={saving} />
            <AppButton title="Cancelar" onPress={openConfigTab} variant="secondary" disabled={saving} />
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
