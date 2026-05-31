import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function openGpsTab() {
  if (!navigationRef.isReady()) return;

  navigationRef.navigate('Tabs', {
    screen: 'GPS'
  });
}
