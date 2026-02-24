import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { authService } from '@/services/auth';

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
    <View style={styles.container}>
      <Text style={styles.title}>Cuidado Constante</Text>
      <TextInput placeholder="Email" style={styles.input} autoCapitalize="none" onChangeText={setEmail} value={email} />
      <TextInput placeholder="Senha" style={styles.input} secureTextEntry onChangeText={setPassword} value={password} />
      <Button title={isSignUp ? 'Cadastrar' : 'Entrar'} onPress={submit} />
      <Button title={isSignUp ? 'Já tenho conta' : 'Criar conta'} onPress={() => setIsSignUp((v) => !v)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }
});
