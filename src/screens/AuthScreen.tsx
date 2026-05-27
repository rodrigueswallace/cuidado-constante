import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

interface AuthScreenProps {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

export function AuthScreen({ recoveryMode = false, onRecoveryComplete }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Preencha email e senha.');
      return;
    }

    setLoading(true);
    const fn = isSignUp ? authService.signUp : authService.signIn;
    const { error } = await fn(email.trim(), password);
    setLoading(false);

    if (error) Alert.alert('Erro', error.message);
  };

  const submitForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu email para recuperar a senha.');
      return;
    }

    setLoading(true);
    const { error } = await authService.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    Alert.alert('Email enviado', 'Enviamos um link para redefinir sua senha.');
    setIsForgotPassword(false);
  };

  const submitPasswordRecovery = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha e confirme a nova senha.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas nao conferem.');
      return;
    }

    setLoading(true);
    const { error } = await authService.updatePassword(password);
    if (!error) {
      await authService.signOut();
    }
    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    onRecoveryComplete?.();
    setPassword('');
    setConfirmPassword('');
    Alert.alert('Senha atualizada', 'Sua senha foi redefinida. Faça login com a nova senha.');
  };

  const isPasswordRecovery = recoveryMode;
  const isEmailRecoveryRequest = !isPasswordRecovery && isForgotPassword;
  const heading = isPasswordRecovery
    ? 'Redefinir senha'
    : isSignUp
      ? 'Criar conta'
      : isEmailRecoveryRequest
        ? 'Esqueci minha senha'
        : 'Entrar na conta';

  return (
    <AppScreen>
      <View style={styles.container}>
        <AppLogo />
        <AppCard>
          <View style={styles.form}>
            <Text style={styles.heading}>{heading}</Text>

            {!isPasswordRecovery ? (
              <AppInput label="Email" placeholder="voce@email.com" autoCapitalize="none" onChangeText={setEmail} value={email} />
            ) : null}

            {isPasswordRecovery ? (
              <>
                <Text style={styles.helper}>Digite sua nova senha para concluir a recuperacao.</Text>
                <AppInput label="Nova senha" placeholder="Nova senha" secureTextEntry onChangeText={setPassword} value={password} />
                <AppInput label="Confirmar senha" placeholder="Repita a nova senha" secureTextEntry onChangeText={setConfirmPassword} value={confirmPassword} />
                <AppButton title="Atualizar senha" onPress={submitPasswordRecovery} disabled={loading} />
                <AppButton
                  title="Cancelar"
                  onPress={async () => {
                    await authService.signOut();
                    onRecoveryComplete?.();
                  }}
                  variant="secondary"
                  disabled={loading}
                />
              </>
            ) : isEmailRecoveryRequest ? (
              <>
                <Text style={styles.helper}>Enviaremos um link para redefinir sua senha no email informado.</Text>
                <AppButton title="Enviar link de recuperacao" onPress={submitForgotPassword} disabled={loading} />
                <AppButton title="Voltar para login" onPress={() => setIsForgotPassword(false)} variant="secondary" />
              </>
            ) : (
              <>
                <AppInput label="Senha" placeholder="Sua senha" secureTextEntry onChangeText={setPassword} value={password} />
                <AppButton title={isSignUp ? 'Cadastrar' : 'Entrar'} onPress={submit} disabled={loading} />
                <AppButton
                  title={isSignUp ? 'Ja tenho conta' : 'Criar conta'}
                  onPress={() => setIsSignUp((v) => !v)}
                  variant="secondary"
                  disabled={loading}
                />
                {!isSignUp ? (
                  <Pressable onPress={() => setIsForgotPassword(true)} style={styles.linkWrapper}>
                    <Text style={styles.link}>Esqueci minha senha</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  form: { gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text },
  helper: { color: colors.textMuted, lineHeight: 20 },
  linkWrapper: { alignItems: 'center', paddingVertical: spacing.xs },
  link: { color: colors.primary, fontWeight: '700' }
});
