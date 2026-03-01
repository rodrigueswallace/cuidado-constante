import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { colors, spacing } from '@/theme/tokens';

export function ConfigScreen() {
  const navigation = useNavigation<any>();

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Configuracoes</Text>

        <AppCard>
          <Text style={styles.sectionTitle}>Coleira</Text>
          <Text style={styles.muted}>Adicionar e ativar uma nova coleira no seu app.</Text>
          <View style={styles.blockTop}>
            <AppButton title="Adicionar nova coleira" onPress={() => navigation.navigate('AddCollar')} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.muted}>Encerrar sessao no dispositivo atual.</Text>
          <View style={styles.blockTop}>
            <AppButton title="Sair da conta" onPress={() => authService.signOut()} variant="secondary" />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm, paddingTop: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  muted: { color: colors.textMuted },
  blockTop: { marginTop: spacing.xs }
});
