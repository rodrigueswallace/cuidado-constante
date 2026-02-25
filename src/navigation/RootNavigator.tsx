import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/hooks/useAuth';
import { createSimpleStackNavigator } from '@/navigation/SimpleStackNavigator';
import { AddCollarScreen } from '@/screens/AddCollarScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { BleScreen } from '@/screens/BleScreen';
import { ConfigScreen } from '@/screens/ConfigScreen';
import { GpsScreen } from '@/screens/GpsScreen';
import { useAppStore } from '@/store/appStore';

const Tab = createBottomTabNavigator();
const Stack = createSimpleStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="GPS" component={GpsScreen} />
      <Tab.Screen name="BLE" component={BleScreen} />
      <Tab.Screen name="Config" component={ConfigScreen} />
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
