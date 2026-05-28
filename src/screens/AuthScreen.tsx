import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppLogo } from '@/components/ui/AppLogo';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { PetSignUpPayload, TutorSignUpPayload } from '@/types/auth';
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
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);
  const [tutorForm, setTutorForm] = useState<TutorSignUpPayload>({
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [petForm, setPetForm] = useState<PetSignUpPayload>({
    name: '',
    species: '',
    birthDate: '',
    color: '',
    sex: '',
    weightKg: '',
    size: '',
    microchip: '',
    breed: '',
    notes: ''
  });

  const updateTutor = (field: keyof TutorSignUpPayload, value: string) => {
    setTutorForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
  };

  const updatePet = (field: keyof PetSignUpPayload, value: string) => {
    setPetForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Preencha email e senha.');
      return;
    }

    setLoading(true);
    const { error } = await authService.signIn(email.trim(), password);
    setLoading(false);

    if (error) Alert.alert('Erro', error.message);
  };

  const validateTutorStep = () => {
    if (!tutorForm.fullName.trim() || !tutorForm.email.trim() || !tutorForm.phone.trim() || !tutorForm.password) {
      Alert.alert('Erro', 'Preencha nome, email, celular e senha.');
      return false;
    }

    if (tutorForm.password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas nao conferem.');
      return false;
    }

    return true;
  };

  const submitSignUp = async () => {
    if (!validateTutorStep()) return;

    if (!petForm.name.trim()) {
      Alert.alert('Erro', 'Preencha ao menos o nome do pet.');
      return;
    }

    if (petForm.birthDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(petForm.birthDate.trim())) {
      Alert.alert('Erro', 'Use a data no formato AAAA-MM-DD.');
      return;
    }

    if (petForm.weightKg.trim() && Number.isNaN(Number(petForm.weightKg.replace(',', '.')))) {
      Alert.alert('Erro', 'Informe o peso usando apenas numeros.');
      return;
    }

    setLoading(true);
    const { data, error } = await authService.signUp(tutorForm, {
      ...petForm,
      weightKg: petForm.weightKg.replace(',', '.')
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    if (!data.session) {
      Alert.alert('Conta criada', 'Verifique seu email para confirmar a conta. Depois, faça login no app.');
      resetSignUpFlow();
      return;
    }

    Alert.alert('Cadastro concluido', 'Seu cadastro e o primeiro pet foram criados com sucesso.');
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
  const isTutorStep = isSignUp && signUpStep === 1;
  const isPetStep = isSignUp && signUpStep === 2;
  const heading = isPasswordRecovery
    ? 'Redefinir senha'
    : isTutorStep
      ? 'Criar conta'
      : isPetStep
        ? 'Cadastrar pet'
      : isEmailRecoveryRequest
        ? 'Esqueci minha senha'
        : 'Entrar na conta';

  const signUpProgressLabel = useMemo(() => {
    if (isTutorStep) return 'Tutor';
    if (isPetStep) return 'Pet';
    return null;
  }, [isPetStep, isTutorStep]);

  const resetSignUpFlow = () => {
    setIsSignUp(false);
    setSignUpStep(1);
    setConfirmPassword('');
    setTutorForm({
      fullName: '',
      phone: '',
      email: '',
      password: ''
    });
    setPetForm({
      name: '',
      species: '',
      birthDate: '',
      color: '',
      sex: '',
      weightKg: '',
      size: '',
      microchip: '',
      breed: '',
      notes: ''
    });
    setEmail('');
    setPassword('');
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <AppLogo />
        <AppCard>
          <View style={styles.form}>
            <Text style={styles.heading}>{heading}</Text>
            {signUpProgressLabel ? <Text style={styles.stepTag}>{signUpProgressLabel}</Text> : null}

            {!isPasswordRecovery ? (
              isSignUp ? (
                <>
                  <View style={styles.photoPlaceholder}>
                    <View style={styles.photoCircle}>
                      <MaterialCommunityIcons
                        name={isTutorStep ? 'account' : 'dog-side'}
                        size={28}
                        color={isTutorStep ? '#6B7280' : colors.primary}
                      />
                    </View>
                    <Text style={styles.photoLabel}>Inserir foto</Text>
                  </View>
                  {isTutorStep ? (
                    <>
                      <AppInput label="Nome completo" placeholder="Nome completo" autoCapitalize="words" onChangeText={(value) => updateTutor('fullName', value)} value={tutorForm.fullName} />
                      <AppInput label="Email" placeholder="voce@email.com" autoCapitalize="none" onChangeText={(value) => updateTutor('email', value)} value={tutorForm.email} />
                      <AppInput label="Celular" placeholder="Celular" keyboardType="phone-pad" onChangeText={(value) => updateTutor('phone', value)} value={tutorForm.phone} />
                      <AppInput label="Senha" placeholder="Senha" secureTextEntry onChangeText={(value) => updateTutor('password', value)} value={tutorForm.password} />
                      <AppInput label="Confirme a senha" placeholder="Confirme a senha" secureTextEntry onChangeText={setConfirmPassword} value={confirmPassword} />
                    </>
                  ) : (
                    <>
                      <AppInput label="Nome" placeholder="Nome" autoCapitalize="words" onChangeText={(value) => updatePet('name', value)} value={petForm.name} />
                      <AppInput label="Especie" placeholder="Especie" autoCapitalize="words" onChangeText={(value) => updatePet('species', value)} value={petForm.species} />
                      <AppInput label="Data de nascimento (opcional)" placeholder="AAAA-MM-DD" onChangeText={(value) => updatePet('birthDate', value)} value={petForm.birthDate} />
                      <AppInput label="Cor (opcional)" placeholder="Cor" autoCapitalize="words" onChangeText={(value) => updatePet('color', value)} value={petForm.color} />
                      <AppInput label="Sexo (opcional)" placeholder="Sexo" autoCapitalize="words" onChangeText={(value) => updatePet('sex', value)} value={petForm.sex} />
                      <AppInput label="Peso em kg (opcional)" placeholder="Peso" keyboardType="numeric" onChangeText={(value) => updatePet('weightKg', value)} value={petForm.weightKg} />
                      <AppInput label="Tamanho (opcional)" placeholder="Tamanho" autoCapitalize="words" onChangeText={(value) => updatePet('size', value)} value={petForm.size} />
                      <AppInput label="Microchip (opcional)" placeholder="Microchip" autoCapitalize="characters" onChangeText={(value) => updatePet('microchip', value)} value={petForm.microchip} />
                      <AppInput label="Raca (opcional)" placeholder="Raca" autoCapitalize="words" onChangeText={(value) => updatePet('breed', value)} value={petForm.breed} />
                      <AppInput label="Observacao (opcional)" placeholder="Observacao" onChangeText={(value) => updatePet('notes', value)} value={petForm.notes} />
                    </>
                  )}
                </>
              ) : (
                <AppInput label="Email" placeholder="voce@email.com" autoCapitalize="none" onChangeText={setEmail} value={email} />
              )
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
            ) : isTutorStep ? (
              <>
                <AppButton
                  title="Continuar"
                  onPress={() => {
                    if (validateTutorStep()) setSignUpStep(2);
                  }}
                  disabled={loading}
                />
                <AppButton title="Ja tenho conta" onPress={resetSignUpFlow} variant="secondary" disabled={loading} />
              </>
            ) : isPetStep ? (
              <>
                <AppButton title="Cadastrar" onPress={submitSignUp} disabled={loading} />
                <AppButton title="Voltar" onPress={() => setSignUpStep(1)} variant="secondary" disabled={loading} />
              </>
            ) : (
              <>
                <AppInput label="Senha" placeholder="Sua senha" secureTextEntry onChangeText={setPassword} value={password} />
                <AppButton title={isSignUp ? 'Cadastrar' : 'Entrar'} onPress={submit} disabled={loading} />
                <AppButton
                  title="Criar conta"
                  onPress={() => {
                    setIsForgotPassword(false);
                    setIsSignUp(true);
                    setSignUpStep(1);
                  }}
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
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, gap: spacing.md },
  form: { gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text },
  stepTag: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  helper: { color: colors.textMuted, lineHeight: 20 },
  linkWrapper: { alignItems: 'center', paddingVertical: spacing.xs },
  link: { color: colors.primary, fontWeight: '700' },
  photoPlaceholder: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  photoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF3F8',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' }
});
