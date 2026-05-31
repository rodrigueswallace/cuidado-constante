import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppCard } from '@/components/ui/AppCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { authService } from '@/services/auth';
import { colors, radius, spacing } from '@/theme/tokens';

interface ConfigItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: 'default' | 'danger';
  onPress: () => void | Promise<void>;
  description?: string;
}

function ConfigRow({ item, isLast }: { item: ConfigItem; isLast: boolean }) {
  const danger = item.tone === 'danger';

  return (
    <Pressable onPress={item.onPress} style={({ pressed }) => [styles.row, !isLast ? styles.rowDivider : null, pressed ? styles.rowPressed : null]}>
      <View style={[styles.rowIconWrap, danger ? styles.rowIconDanger : null]}>
        <MaterialCommunityIcons
          name={item.icon}
          size={20}
          color={danger ? colors.danger : colors.primaryDark}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger ? styles.rowTitleDanger : null]}>{item.title}</Text>
        {item.description ? <Text style={styles.rowDescription}>{item.description}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

export function ConfigScreen() {
  const navigation = useNavigation<any>();

  const showPending = (label: string) =>
    Alert.alert('Em desenvolvimento', `${label} ainda nao possui fluxo completo no app atual.`);

  const items: ConfigItem[] = [
    {
      id: 'tutor',
      title: 'Alterar dados tutor',
      icon: 'account-edit-outline',
      description: 'Atualize nome, telefone e dados do responsavel.',
      onPress: () => navigation.navigate('EditTutor')
    },
    {
      id: 'pet',
      title: 'Alterar dados pet',
      icon: 'dog-side',
      description: 'Revise as informacoes principais do pet cadastrado.',
      onPress: () => navigation.navigate('EditPet')
    },
    {
      id: 'device',
      title: 'Alterar dados dispositivo',
      icon: 'bluetooth-settings',
      description: 'Gerencie coleira ativa, BLE e novo cadastro do dispositivo.',
      onPress: () => navigation.navigate('AddCollar')
    },
    {
      id: 'password',
      title: 'Redefinir senha',
      icon: 'lock-reset',
      description: 'Para redefinir a senha, saia da conta e use "Esqueci minha senha".',
      onPress: () =>
        Alert.alert(
          'Redefinir senha',
          'O fluxo atual de redefinicao e feito pela tela de login. Faca logout e use "Esqueci minha senha".'
        )
    },
    {
      id: 'logout',
      title: 'Sair da conta',
      icon: 'logout',
      description: 'Encerrar sessao no dispositivo atual.',
      onPress: async () => {
        await authService.signOut();
      }
    },
    {
      id: 'delete',
      title: 'Excluir conta',
      icon: 'delete-outline',
      tone: 'danger',
      description: 'Acao destrutiva. Requer fluxo protegido e confirmacao.',
      onPress: () => showPending('Excluir conta')
    }
  ];

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageLabel}>Configuracoes</Text>

        <AppCard>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Configuracoes</Text>
            <Text style={styles.subtitle}>Ajuste dados da conta, do pet e da coleira ativa em um unico lugar.</Text>
          </View>

          <View style={styles.listBlock}>
            {items.map((item, index) => (
              <ConfigRow key={item.id} item={item} isLast={index === items.length - 1} />
            ))}
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm
  },
  pageLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  headerBlock: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF5',
    gap: spacing.xs
  },
  title: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20
  },
  listBlock: {
    marginTop: spacing.sm
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF5'
  },
  rowPressed: {
    opacity: 0.78
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: '#EEF6FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowIconDanger: {
    backgroundColor: '#FDECEC'
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  rowTitleDanger: {
    color: colors.danger
  },
  rowDescription: {
    color: colors.textMuted,
    lineHeight: 18
  }
});
