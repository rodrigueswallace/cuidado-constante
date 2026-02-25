import React from 'react';
import { createNavigatorFactory, useNavigationBuilder } from '@react-navigation/native';
import { StackRouter } from '@react-navigation/routers';

function SimpleStackNavigator({ initialRouteName, children }: any) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, {
    children,
    initialRouteName
  });

  const activeRoute = state.routes[state.index];

  return <NavigationContent>{descriptors[activeRoute.key].render()}</NavigationContent>;
}

export const createSimpleStackNavigator = createNavigatorFactory(SimpleStackNavigator);
