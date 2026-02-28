import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { brandConfig } from '@/services/branding';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';
import { colors, spacing } from '@/theme/tokens';

export function ConfigScreen() {
  const { gpsPollSeconds, routeThrottleSeconds, setGpsPollSeconds, setRouteThrottleSeconds, hydrate, pendingBleEvents, flushBleQueue } = useAppStore();
  const [email, setEmail] = useState('');
  const [profileName, setProfileName] = useState('');
  const [petId, setPetId] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPet, setSavingPet] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const loadConfigData = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? '');
      setProfileName((user?.user_metadata?.full_name as string) ?? '');

      if (!user) return;
      const { data: pets } = await supabase
        .from('pets')
        .select('id, name')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (pets && pets.length > 0) {
        setPetId(pets[0].id);
        setPetName(pets[0].name);
      }
    };

    loadConfigData();
  }, []);

  const checkPerms = async () => {
    const loc = await Location.getForegroundPermissionsAsync();
    Alert.alert('Permissao de localizacao', loc.status);
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileName.trim() }
      });
      if (error) throw error;
      Alert.alert('Perfil', 'Nome atualizado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Perfil', message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePet = async () => {
    if (!petId || savingPet) return;
    setSavingPet(true);
    try {
      const { error } = await supabase.from('pets').update({ name: petName.trim() }).eq('id', petId);
      if (error) throw error;
      Alert.alert('Pet', 'Nome do pet atualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Pet', message);
    } finally {
      setSavingPet(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.trim().length < 6 || savingPassword) {
      Alert.alert('Senha', 'Use pelo menos 6 caracteres.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) throw error;
      setNewPassword('');
      Alert.alert('Senha', 'Senha atualizada com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Senha', message);
    } finally {
      setSavingPassword(false);
    }
  };

  const retryBleQueue = async () => {
    try {
      const before = pendingBleEvents.length;
      const result = await flushBleQueue();
      console.log('BLE QUEUE RETRY =>', { before, sent: result.sent, failed: result.failed });
      Alert.alert('Fila BLE', `Enviados: ${result.sent}\nFalharam: ${result.failed}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('BLE QUEUE RETRY ERROR =>', { error: message });
      Alert.alert('Fila BLE', 'Falha ao reenviar eventos da fila.');
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Configuracoes</Text>

        <AppCard>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.value}>Email: {email || '--'}</Text>
          <AppInput label="Nome de exibicao" value={profileName} onChangeText={setProfileName} />
          <View style={styles.blockTop}>
            <AppButton title={savingProfile ? 'Salvando...' : 'Salvar perfil'} onPress={saveProfile} disabled={savingProfile} variant="secondary" />
          </View>
          <AppInput label="Nova senha" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <View style={styles.blockTop}>
            <AppButton title={savingPassword ? 'Atualizando...' : 'Trocar senha'} onPress={changePassword} disabled={savingPassword} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Pet</Text>
          {petId ? (
            <>
              <AppInput label="Nome do pet" value={petName} onChangeText={setPetName} />
              <View style={styles.blockTop}>
                <AppButton title={savingPet ? 'Salvando...' : 'Salvar pet'} onPress={savePet} disabled={savingPet} variant="secondary" />
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Nenhum pet encontrado. Cadastre uma coleira para criar o primeiro pet.</Text>
          )}
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Branding remoto</Text>
          <Text style={styles.value}>Bucket: {brandConfig.bucket}</Text>
          <Text style={styles.value}>Arquivo: {brandConfig.logoPath}</Text>
          <Text style={styles.muted}>Substitua esse arquivo no Supabase Storage para trocar o logo sem novo APK.</Text>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Permissoes</Text>
          <AppButton title="Verificar localizacao" onPress={checkPerms} variant="secondary" />
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Rastreamento GPS</Text>
          <Text style={styles.value}>Intervalo atual: {gpsPollSeconds}s</Text>
          <View style={styles.row}>
            <AppButton title="15s" onPress={() => setGpsPollSeconds(15)} variant="secondary" />
            <AppButton title="30s" onPress={() => setGpsPollSeconds(30)} variant="secondary" />
          </View>
          <Text style={styles.value}>Recalcular rota: {routeThrottleSeconds}s</Text>
          <View style={styles.row}>
            <AppButton title="120s" onPress={() => setRouteThrottleSeconds(120)} variant="secondary" />
            <AppButton title="180s" onPress={() => setRouteThrottleSeconds(180)} variant="secondary" />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Fila BLE offline</Text>
          <Text style={styles.value}>{pendingBleEvents.length} evento(s)</Text>
          <AppButton title="Reenviar fila BLE" onPress={retryBleQueue} variant="secondary" disabled={pendingBleEvents.length === 0} />
        </AppCard>

        <AppButton title="Sair da conta" onPress={() => authService.signOut()} />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textMuted },
  value: { color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  blockTop: { marginTop: spacing.xs }
});
