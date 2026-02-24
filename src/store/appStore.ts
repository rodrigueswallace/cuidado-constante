import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { ingestBleEvent, IngestBlePayload } from '@/services/edgeApi';

interface AppState {
  gpsPollSeconds: number;
  routeThrottleSeconds: number;
  pendingBleEvents: IngestBlePayload[];
  setGpsPollSeconds: (value: number) => void;
  setRouteThrottleSeconds: (value: number) => void;
  enqueueBleEvent: (event: IngestBlePayload) => Promise<void>;
  flushBleQueue: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const BLE_QUEUE_KEY = 'ble_queue_v1';

export const useAppStore = create<AppState>((set, get) => ({
  gpsPollSeconds: 30,
  routeThrottleSeconds: 120,
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
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(BLE_QUEUE_KEY);
    const pendingBleEvents: IngestBlePayload[] = raw ? JSON.parse(raw) : [];
    set({ pendingBleEvents });
  }
}));
