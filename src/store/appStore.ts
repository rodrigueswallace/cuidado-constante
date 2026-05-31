import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchActiveCollarId, ingestBleEvent, IngestBlePayload, saveActiveCollarId } from '@/services/edgeApi';

interface AppState {
  activeCollarId: string | null;
  connectedBleDeviceId: string | null;
  connectedBleDeviceName: string | null;
  gpsPollSeconds: number;
  routeThrottleSeconds: number;
  bleAlarmLevel: 'very_far' | 'disconnected';
  isBleAlarmPlaying: boolean;
  activeBleAlarmKey: string | null;
  silencedBleAlarmKey: string | null;
  pendingBleEvents: IngestBlePayload[];
  setActiveCollarId: (value: string | null) => Promise<void>;
  setConnectedBleDevice: (deviceId: string | null, deviceName: string | null) => void;
  setGpsPollSeconds: (value: number) => void;
  setRouteThrottleSeconds: (value: number) => void;
  setBleAlarmLevel: (value: AppState['bleAlarmLevel']) => Promise<void>;
  setBleAlarmPlayback: (playing: boolean, key: string | null) => void;
  setSilencedBleAlarmKey: (key: string | null) => void;
  enqueueBleEvent: (event: IngestBlePayload) => Promise<void>;
  flushBleQueue: () => Promise<{ sent: number; failed: number }>;
  refreshActiveCollar: () => Promise<string | null>;
  hydrate: () => Promise<void>;
}

const BLE_QUEUE_KEY = 'ble_queue_v1';
const ACTIVE_COLLAR_KEY = 'active_collar_v1';
const BLE_ALARM_LEVEL_KEY = 'ble_alarm_level_v1';

export const useAppStore = create<AppState>((set, get) => ({
  activeCollarId: null,
  connectedBleDeviceId: null,
  connectedBleDeviceName: null,
  gpsPollSeconds: 30,
  routeThrottleSeconds: 120,
  bleAlarmLevel: 'disconnected',
  isBleAlarmPlaying: false,
  activeBleAlarmKey: null,
  silencedBleAlarmKey: null,
  pendingBleEvents: [],
  setActiveCollarId: async (value) => {
    await saveActiveCollarId(value);
    set({ activeCollarId: value });
    if (value) {
      await AsyncStorage.setItem(ACTIVE_COLLAR_KEY, value);
      return;
    }

    await AsyncStorage.removeItem(ACTIVE_COLLAR_KEY);
  },
  setConnectedBleDevice: (deviceId, deviceName) => set({ connectedBleDeviceId: deviceId, connectedBleDeviceName: deviceName }),
  setGpsPollSeconds: (value) => set({ gpsPollSeconds: value }),
  setRouteThrottleSeconds: (value) => set({ routeThrottleSeconds: value }),
  setBleAlarmLevel: async (value) => {
    set({ bleAlarmLevel: value });
    await AsyncStorage.setItem(BLE_ALARM_LEVEL_KEY, value);
  },
  setBleAlarmPlayback: (playing, key) => set({ isBleAlarmPlaying: playing, activeBleAlarmKey: key }),
  setSilencedBleAlarmKey: (key) => set({ silencedBleAlarmKey: key }),
  enqueueBleEvent: async (event) => {
    const next = [...get().pendingBleEvents, event];
    set({ pendingBleEvents: next });
    await AsyncStorage.setItem(BLE_QUEUE_KEY, JSON.stringify(next));
  },
  flushBleQueue: async () => {
    const queue = [...get().pendingBleEvents];
    const failed: IngestBlePayload[] = [];

    for (const event of queue) {
      try {
        await ingestBleEvent(event);
      } catch {
        failed.push(event);
      }
    }

    set({ pendingBleEvents: failed });
    await AsyncStorage.setItem(BLE_QUEUE_KEY, JSON.stringify(failed));
    return { sent: queue.length - failed.length, failed: failed.length };
  },
  refreshActiveCollar: async () => {
    try {
      const activeCollarId = await fetchActiveCollarId();
      set({ activeCollarId });

      if (activeCollarId) {
        await AsyncStorage.setItem(ACTIVE_COLLAR_KEY, activeCollarId);
        return activeCollarId;
      }

      await AsyncStorage.removeItem(ACTIVE_COLLAR_KEY);
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('profiles_table_missing')) {
        // Keep local active collar when backend profile persistence is unavailable.
        return get().activeCollarId;
      }

      throw error;
    }
  },
  hydrate: async () => {
    const [rawQueue, rawActiveCollar, rawBleAlarmLevel] = await Promise.all([
      AsyncStorage.getItem(BLE_QUEUE_KEY),
      AsyncStorage.getItem(ACTIVE_COLLAR_KEY),
      AsyncStorage.getItem(BLE_ALARM_LEVEL_KEY)
    ]);

    const pendingBleEvents: IngestBlePayload[] = rawQueue ? JSON.parse(rawQueue) : [];
    const activeCollarId = rawActiveCollar || null;
    const bleAlarmLevel =
      rawBleAlarmLevel === 'very_far' ||
      rawBleAlarmLevel === 'disconnected'
        ? rawBleAlarmLevel
        : 'disconnected';

    set({ pendingBleEvents, activeCollarId, bleAlarmLevel });
  }
}));
