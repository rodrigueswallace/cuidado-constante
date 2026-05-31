import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { handleBleAlarmNotificationResponse, initializeBleAlarmNotifications } from '@/services/bleAlarm';

export function useBleAlarmNotifications() {
  useEffect(() => {
    initializeBleAlarmNotifications();

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleBleAlarmNotificationResponse(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleBleAlarmNotificationResponse(response);
    });

    return () => subscription.remove();
  }, []);
}
