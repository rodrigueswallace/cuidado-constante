import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const items: ConfigItem[] = [
    {
      id: 'tutor',
      title: 'Alterar dados do tutor',
      icon: 'account-edit-outline',
      description: 'Atualize nome, telefone e dados do responsável.',
      onPress: () => navigation.navigate('EditTutor')
    },
    {
      id: 'pet',
      title: 'Alterar dados do pet',
      icon: 'dog-side',
      description: 'Revise as informações principais do pet cadastrado.',
      onPress: () => navigation.navigate('EditPet')
    },
    {
      id: 'device',
      title: 'Alterar dados do dispositivo',
      icon: 'bluetooth-settings',
      description: 'Gerencie o nome da coleira ativa e o nome BLE.',
      onPress: () => navigation.navigate('EditDevice')
    },
    {
      id: 'password',
      title: 'Redefinir senha',
      icon: 'lock-reset',
      description: 'Altere sua senha diretamente pelo app.',
      onPress: () => navigation.navigate('ResetPassword')
    },
    {
      id: 'logout',
      title: 'Sair da conta',
      icon: 'logout',
      description: 'Encerrar sessão no dispositivo atual.',
      onPress: async () => {
        await authService.signOut();
      }
    },
    {
      id: 'delete',
      title: 'Excluir conta',
      icon: 'delete-outline',
      tone: 'danger',
      description: 'Ação permanente e sem possibilidade de desfazer.',
      onPress: () => navigation.navigate('DeleteAccount')
    }
  ];

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageLabel}>Configurações</Text>

        <AppCard>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Configurações</Text>
            <Text style={styles.subtitle}>Ajuste dados da conta, do pet e da coleira ativa em um único lugar.</Text>
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
