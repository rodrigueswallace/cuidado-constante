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
import { colors, radius, spacing } from '@/theme/tokens';
import { cmInputToNumberString, displayDateToIso, formatCmInput, formatDateDigits, formatPhone, formatWeightInput, weightInputToNumberString } from '@/utils/formats';

interface AuthScreenProps {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

const SPECIES_OPTIONS = [
  { value: 'cachorro', label: 'Cachorro' },
  { value: 'gato', label: 'Gato' }
] as const;

const SEX_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'femea', label: 'Fêmea' }
] as const;

function getFriendlyAuthError(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes('over_email_send_rate_limit') || normalized.includes('email rate limit exceeded')) {
    return 'Muitas tentativas de envio de e-mail. Aguarde alguns minutos antes de tentar novamente.';
  }

  if (normalized.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (normalized.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  return errorMessage;
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
    species: 'cachorro',
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
      species: 'cachorro',
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

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    const { error } = await authService.signIn(email.trim(), password);
    setLoading(false);

    if (error) Alert.alert('Erro', getFriendlyAuthError(error.message));
  };

  const validateTutorStep = () => {
    if (!tutorForm.fullName.trim() || !tutorForm.email.trim() || !tutorForm.phone.trim() || !tutorForm.password) {
      Alert.alert('Erro', 'Preencha nome, e-mail, telefone e senha.');
      return false;
    }

    if (tutorForm.password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem.');
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

    const birthDateIso = petForm.birthDate.trim() ? displayDateToIso(petForm.birthDate.trim()) : null;
    if (petForm.birthDate.trim() && !birthDateIso) {
      Alert.alert('Erro', 'Use a data no formato DD/MM/AAAA.');
      return;
    }

    setLoading(true);
    const { data, error } = await authService.signUp(tutorForm, {
      ...petForm,
      birthDate: birthDateIso ?? '',
      weightKg: weightInputToNumberString(petForm.weightKg),
      size: cmInputToNumberString(petForm.size)
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro', getFriendlyAuthError(error.message));
      return;
    }

    if (!data.session) {
      Alert.alert(
        'Cadastro em análise',
        'Se este e-mail ainda não estiver cadastrado, enviaremos uma confirmação para continuar. Se ele já existir, tente entrar ou use "Esqueci minha senha".'
      );
      return;
    }

    Alert.alert('Cadastro concluído', 'Seu cadastro e o primeiro pet foram criados com sucesso.');
    resetSignUpFlow();
  };

  const submitForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    const { error } = await authService.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Erro', getFriendlyAuthError(error.message));
      return;
    }

    Alert.alert('E-mail enviado', 'Enviamos um link para redefinir sua senha.');
    setIsForgotPassword(false);
  };

  const submitPasswordRecovery = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha e confirme a nova senha.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem.');
      return;
    }

    setLoading(true);
    const { error } = await authService.updatePassword(password);
    if (!error) {
      await authService.signOut();
    }
    setLoading(false);

    if (error) {
      Alert.alert('Erro', getFriendlyAuthError(error.message));
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
                      <AppInput label="E-mail" placeholder="voce@email.com" autoCapitalize="none" onChangeText={(value) => updateTutor('email', value)} value={tutorForm.email} />
                      <AppInput label="Telefone" placeholder="(00) 00000-0000" keyboardType="phone-pad" onChangeText={(value) => updateTutor('phone', formatPhone(value))} value={tutorForm.phone} />
                      <AppInput label="Senha" placeholder="Senha" secureTextEntry onChangeText={(value) => updateTutor('password', value)} value={tutorForm.password} />
                      <AppInput label="Confirme a senha" placeholder="Confirme a senha" secureTextEntry onChangeText={setConfirmPassword} value={confirmPassword} />
                    </>
                  ) : (
                    <>
                      <AppInput label="Nome" placeholder="Nome" autoCapitalize="words" onChangeText={(value) => updatePet('name', value)} value={petForm.name} />
                      <View style={styles.selectorBlock}>
                        <Text style={styles.selectorLabel}>Espécie</Text>
                        <View style={styles.selectorRow}>
                          {SPECIES_OPTIONS.map((option) => {
                            const selected = petForm.species === option.value;
                            return (
                              <Pressable key={option.value} style={[styles.selectorOption, selected ? styles.selectorOptionSelected : null]} onPress={() => updatePet('species', option.value)}>
                                <Text style={[styles.selectorText, selected ? styles.selectorTextSelected : null]}>{option.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                      <AppInput label="Data de nascimento (opcional)" placeholder="DD/MM/AAAA" keyboardType="number-pad" onChangeText={(value) => updatePet('birthDate', formatDateDigits(value))} value={petForm.birthDate} />
                      <AppInput label="Cor (opcional)" placeholder="Cor" autoCapitalize="words" onChangeText={(value) => updatePet('color', value)} value={petForm.color} />
                      <View style={styles.selectorBlock}>
                        <Text style={styles.selectorLabel}>Sexo (opcional)</Text>
                        <View style={styles.selectorRow}>
                          {SEX_OPTIONS.map((option) => {
                            const selected = petForm.sex === option.value;
                            return (
                              <Pressable key={option.value} style={[styles.selectorOption, selected ? styles.selectorOptionSelected : null]} onPress={() => updatePet('sex', option.value)}>
                                <Text style={[styles.selectorText, selected ? styles.selectorTextSelected : null]}>{option.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                      <AppInput
                        label="Peso (opcional)"
                        placeholder="00.0"
                        keyboardType="number-pad"
                        onChangeText={(value) => updatePet('weightKg', formatWeightInput(value))}
                        value={petForm.weightKg}
                        selection={{ start: petForm.weightKg.length, end: petForm.weightKg.length }}
                      />
                      <View style={styles.unitRow}>
                        <View style={styles.unitInput}>
                          <AppInput
                            label="Tamanho (opcional)"
                            placeholder="00"
                            keyboardType="number-pad"
                            onChangeText={(value) => updatePet('size', formatCmInput(value))}
                            value={petForm.size}
                            selection={{ start: petForm.size.length, end: petForm.size.length }}
                          />
                        </View>
                        <Text style={styles.unitText}>cm</Text>
                      </View>
                      <AppInput label="Microchip (opcional)" placeholder="Microchip" autoCapitalize="characters" onChangeText={(value) => updatePet('microchip', value)} value={petForm.microchip} />
                      <AppInput label="Raça (opcional)" placeholder="Raça" autoCapitalize="words" onChangeText={(value) => updatePet('breed', value)} value={petForm.breed} />
                      <AppInput label="Observação (opcional)" placeholder="Observação" onChangeText={(value) => updatePet('notes', value)} value={petForm.notes} />
                    </>
                  )}
                </>
              ) : (
                <AppInput label="E-mail" placeholder="voce@email.com" autoCapitalize="none" onChangeText={setEmail} value={email} />
              )
            ) : null}

            {isPasswordRecovery ? (
              <>
                <Text style={styles.helper}>Digite sua nova senha para concluir a recuperação.</Text>
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
                <Text style={styles.helper}>Enviaremos um link para redefinir sua senha no e-mail informado.</Text>
                <AppButton title="Enviar link de recuperação" onPress={submitForgotPassword} disabled={loading} />
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
                <AppButton title="Já tenho conta" onPress={resetSignUpFlow} variant="secondary" disabled={loading} />
              </>
            ) : isPetStep ? (
              <>
                <AppButton title="Cadastrar" onPress={submitSignUp} disabled={loading} />
                <AppButton title="Voltar" onPress={() => setSignUpStep(1)} variant="secondary" disabled={loading} />
              </>
            ) : (
              <>
                <AppInput label="Senha" placeholder="Sua senha" secureTextEntry onChangeText={setPassword} value={password} />
                <AppButton title="Entrar" onPress={submit} disabled={loading} />
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
                <Pressable onPress={() => setIsForgotPassword(true)} style={styles.linkWrapper}>
                  <Text style={styles.link}>Esqueci minha senha</Text>
                </Pressable>
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
  photoLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  selectorBlock: { gap: spacing.xs },
  selectorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  selectorRow: { flexDirection: 'row', gap: spacing.sm },
  selectorOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  selectorOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EEF6FF'
  },
  selectorText: { color: colors.text, fontWeight: '600' },
  selectorTextSelected: { color: colors.primaryDark },
  unitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  unitInput: { flex: 1 },
  unitText: {
    color: colors.textMuted,
    fontWeight: '700',
    paddingBottom: spacing.sm + 5
  }
});
