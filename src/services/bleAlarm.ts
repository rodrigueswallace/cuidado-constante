import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

import { openGpsTab } from '@/navigation/navigationRef';
import { useAppStore } from '@/store/appStore';

const BLE_ALARM_CATEGORY_ID = 'ble-alarm-category';
const BLE_ALARM_STOP_ACTION_ID = 'ble-alarm-stop';
const alarmAsset = require('../../assets/audio/som-alarme.mpeg');

let initialized = false;
let alarmSound: Audio.Sound | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

async function ensurePermissions() {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function initializeBleAlarmNotifications() {
  if (initialized) return;

  await Notifications.setNotificationCategoryAsync(BLE_ALARM_CATEGORY_ID, [
    {
      identifier: BLE_ALARM_STOP_ACTION_ID,
      buttonTitle: 'Parar som',
      options: {
        opensAppToForeground: true
      }
    }
  ]);

  initialized = true;
}

async function getSound() {
  if (alarmSound) return alarmSound;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true
  });

  const { sound } = await Audio.Sound.createAsync(alarmAsset, {
    shouldPlay: false,
    isLooping: true,
    volume: 1
  });

  alarmSound = sound;
  return sound;
}

export async function startBleAlarm(alarmKey: string, message: string) {
  const state = useAppStore.getState();
  if (state.isBleAlarmPlaying && state.activeBleAlarmKey === alarmKey) return;

  await initializeBleAlarmNotifications();
  await ensurePermissions();

  const sound = await getSound();
  await sound.replayAsync();

  useAppStore.getState().setBleAlarmPlayback(true, alarmKey);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Alerta BLE',
      body: message,
      data: {
        targetTab: 'GPS',
        bleAlarmKey: alarmKey
      },
      categoryIdentifier: BLE_ALARM_CATEGORY_ID
    },
    trigger: null
  });
}

export async function stopBleAlarm(options?: { silenceCurrent?: boolean }) {
  const state = useAppStore.getState();
  const currentKey = state.activeBleAlarmKey;

  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
    } catch {
      // Keep state consistent even if native stop fails.
    }
  }

  useAppStore.getState().setBleAlarmPlayback(false, null);

  if (options?.silenceCurrent && currentKey) {
    useAppStore.getState().setSilencedBleAlarmKey(currentKey);
  }
}

export async function handleBleAlarmNotificationResponse(response: Notifications.NotificationResponse) {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data ?? {};

  if (actionId === BLE_ALARM_STOP_ACTION_ID) {
    await stopBleAlarm({ silenceCurrent: true });
    openGpsTab();
    return;
  }

  if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    if (typeof data.bleAlarmKey === 'string') {
      useAppStore.getState().setSilencedBleAlarmKey(data.bleAlarmKey);
    }
    openGpsTab();
  }
}
