import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function openTab(tabName: 'GPS' | 'BLE' | 'Config') {
  if (!navigationRef.isReady()) return;

  navigationRef.navigate('Tabs', {
    screen: tabName
  });
}

export function openGpsTab() {
  openTab('GPS');
}

export function openConfigTab() {
  openTab('Config');
}
