const mockSaveActiveCollarId = jest.fn();
const mockFetchActiveCollarId = jest.fn();
const mockIngestBleEvent = jest.fn();

jest.mock('@/services/edgeApi', () => ({
  saveActiveCollarId: mockSaveActiveCollarId,
  fetchActiveCollarId: mockFetchActiveCollarId,
  ingestBleEvent: mockIngestBleEvent
}));

describe('store/appStore', () => {
  beforeEach(async () => {
    jest.resetModules();
    mockSaveActiveCollarId.mockReset();
    mockFetchActiveCollarId.mockReset();
    mockIngestBleEvent.mockReset();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('salva coleira ativa no backend, no estado e no storage local', async () => {
    mockSaveActiveCollarId.mockResolvedValue(undefined);

    const { useAppStore } = require('@/store/appStore');
    await useAppStore.getState().setActiveCollarId('collar-1');

    expect(mockSaveActiveCollarId).toHaveBeenCalledWith('collar-1');
    expect(useAppStore.getState().activeCollarId).toBe('collar-1');
  });

  it('mantem na fila apenas eventos BLE que falharam no envio', async () => {
    mockIngestBleEvent
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'));

    const { useAppStore } = require('@/store/appStore');
    await useAppStore.getState().enqueueBleEvent({ collar_id: 'collar-1', rssi: -55, battery: null, ts: '2026-06-01T00:00:00Z' });
    await useAppStore.getState().enqueueBleEvent({ collar_id: 'collar-1', rssi: -95, battery: 80, ts: '2026-06-01T00:01:00Z' });

    const result = await useAppStore.getState().flushBleQueue();

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(useAppStore.getState().pendingBleEvents).toEqual([
      { collar_id: 'collar-1', rssi: -95, battery: 80, ts: '2026-06-01T00:01:00Z' }
    ]);
  });

  it('sincroniza coleira ativa buscando do backend', async () => {
    mockFetchActiveCollarId.mockResolvedValue('collar-2');

    const { useAppStore } = require('@/store/appStore');
    await expect(useAppStore.getState().refreshActiveCollar()).resolves.toBe('collar-2');

    expect(useAppStore.getState().activeCollarId).toBe('collar-2');
  });
});

export {};
