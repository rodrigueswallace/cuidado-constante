import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/hooks/useAuth';
import { createSimpleStackNavigator } from '@/navigation/SimpleStackNavigator';
import { AddCollarScreen } from '@/screens/AddCollarScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { BleScreen } from '@/screens/BleScreen';
import { ConfigScreen } from '@/screens/ConfigScreen';
import { GpsScreen } from '@/screens/GpsScreen';
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
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 13, fontWeight: '700' }}>G</Text> }}
      />
      <Tab.Screen
        name="BLE"
        component={BleScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 13, fontWeight: '700' }}>B</Text> }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 13, fontWeight: '700' }}>C</Text> }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { loading, session } = useAuth();
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

  if (!session) return <AuthScreen />;

  return (
    <Stack.Navigator initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="AddCollar" component={AddCollarScreen} />
    </Stack.Navigator>
  );
}


