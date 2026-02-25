import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchActiveCollarId, ingestBleEvent, IngestBlePayload } from '@/services/edgeApi';

interface AppState {
  gpsPollSeconds: number;
  routeThrottleSeconds: number;
  activeCollarId: string | null;
  pendingBleEvents: IngestBlePayload[];
  setGpsPollSeconds: (value: number) => void;
  setRouteThrottleSeconds: (value: number) => void;
  enqueueBleEvent: (event: IngestBlePayload) => Promise<void>;
  flushBleQueue: () => Promise<void>;
  refreshActiveCollar: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const BLE_QUEUE_KEY = 'ble_queue_v1';
const ACTIVE_COLLAR_KEY = 'active_collar_id_v1';

export const useAppStore = create<AppState>((set, get) => ({
  gpsPollSeconds: 30,
  routeThrottleSeconds: 120,
  activeCollarId: null,
  pendingBleEvents: [],
  setGpsPollSeconds: (value) => set({ gpsPollSeconds: value }),
  setRouteThrottleSeconds: (value) => set({ routeThrottleSeconds: value }),
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
  },
  refreshActiveCollar: async () => {
    const activeCollarId = await fetchActiveCollarId();
    set({ activeCollarId });

    if (activeCollarId) {
      await AsyncStorage.setItem(ACTIVE_COLLAR_KEY, activeCollarId);
      return;
    }

    await AsyncStorage.removeItem(ACTIVE_COLLAR_KEY);
  },
  hydrate: async () => {
    const [rawQueue, rawActiveCollar] = await Promise.all([
      AsyncStorage.getItem(BLE_QUEUE_KEY),
      AsyncStorage.getItem(ACTIVE_COLLAR_KEY)
    ]);

    const pendingBleEvents: IngestBlePayload[] = rawQueue ? JSON.parse(rawQueue) : [];
    const activeCollarId = rawActiveCollar || null;

    set({ pendingBleEvents, activeCollarId });
  }
}));
