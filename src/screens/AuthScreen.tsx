import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const submit = async () => {
    const fn = isSignUp ? authService.signUp : authService.signIn;
    const { error } = await fn(email.trim(), password);
    if (error) Alert.alert('Erro', error.message);
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <AppLogo />
        <AppCard>
          <View style={styles.form}>
            <Text style={styles.heading}>{isSignUp ? 'Criar conta' : 'Entrar na conta'}</Text>
            <AppInput label="Email" placeholder="voce@email.com" autoCapitalize="none" onChangeText={setEmail} value={email} />
            <AppInput label="Senha" placeholder="Sua senha" secureTextEntry onChangeText={setPassword} value={password} />
            <AppButton title={isSignUp ? 'Cadastrar' : 'Entrar'} onPress={submit} />
            <AppButton title={isSignUp ? 'Ja tenho conta' : 'Criar conta'} onPress={() => setIsSignUp((v) => !v)} variant="secondary" />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  form: { gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text }
});
