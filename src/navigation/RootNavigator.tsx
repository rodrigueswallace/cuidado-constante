import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { createSimpleStackNavigator } from '@/navigation/SimpleStackNavigator';
import { AddCollarScreen } from '@/screens/AddCollarScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { BleScreen } from '@/screens/BleScreen';
import { ConfigScreen } from '@/screens/ConfigScreen';
import { DeleteAccountScreen } from '@/screens/DeleteAccountScreen';
import { EditDeviceScreen } from '@/screens/EditDeviceScreen';
import { EditPetScreen } from '@/screens/EditPetScreen';
import { EditTutorScreen } from '@/screens/EditTutorScreen';
import { GpsScreen } from '@/screens/GpsScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { useAppStore } from '@/store/appStore';
import { colors } from '@/theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createSimpleStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 2
        },
        tabBarStyle: {
          borderTopColor: '#D6DFEA',
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: '#FFFFFF'
        }
      }}
    >
      <Tab.Screen
        name="GPS"
        component={GpsScreen}
        options={{
          tabBarLabel: 'GPS',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-path" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="BLE"
        component={BleScreen}
        options={{
          tabBarLabel: 'BLE',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bluetooth-connect" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigScreen}
        options={{
          tabBarLabel: 'Configurações',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { loading, session, isRecoveringPassword, clearPasswordRecovery } = useAuth();
  const { hydrate, refreshActiveCollar } = useAppStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!session) return;
    refreshActiveCollar();
  }, [refreshActiveCollar, session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isRecoveringPassword) {
    return <AuthScreen recoveryMode onRecoveryComplete={clearPasswordRecovery} />;
  }

  if (!session) return <AuthScreen />;

  return (
    <Stack.Navigator initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="AddCollar" component={AddCollarScreen} />
      <Stack.Screen name="EditTutor" component={EditTutorScreen} />
      <Stack.Screen name="EditPet" component={EditPetScreen} />
      <Stack.Screen name="EditDevice" component={EditDeviceScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </Stack.Navigator>
  );
}


