const mockSetNotificationHandler = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationCategoryAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockReplayAsync = jest.fn();
const mockStopAsync = jest.fn();
const mockCreateAsync = jest.fn();
const mockSetAudioModeAsync = jest.fn();
const mockOpenGpsTab = jest.fn();
const mockSetBleAlarmPlayback = jest.fn();
const mockSetSilencedBleAlarmKey = jest.fn();
const mockGetState = jest.fn();

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default',
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationHandler: mockSetNotificationHandler,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  setNotificationCategoryAsync: mockSetNotificationCategoryAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: mockSetAudioModeAsync,
    Sound: {
      createAsync: mockCreateAsync
    }
  }
}));

jest.mock('@/navigation/navigationRef', () => ({
  openGpsTab: mockOpenGpsTab
}));

jest.mock('@/store/appStore', () => ({
  useAppStore: {
    getState: mockGetState
  }
}));

function setAlarmState(overrides: Record<string, unknown> = {}) {
  mockGetState.mockReturnValue({
    isBleAlarmPlaying: false,
    activeBleAlarmKey: null,
    setBleAlarmPlayback: mockSetBleAlarmPlayback,
    setSilencedBleAlarmKey: mockSetSilencedBleAlarmKey,
    ...overrides
  });
}

describe('services/bleAlarm', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSetNotificationHandler.mockClear();
    mockGetPermissionsAsync.mockReset();
    mockRequestPermissionsAsync.mockReset();
    mockSetNotificationCategoryAsync.mockReset();
    mockScheduleNotificationAsync.mockReset();
    mockReplayAsync.mockReset();
    mockStopAsync.mockReset();
    mockCreateAsync.mockReset();
    mockSetAudioModeAsync.mockReset();
    mockOpenGpsTab.mockReset();
    mockSetBleAlarmPlayback.mockReset();
    mockSetSilencedBleAlarmKey.mockReset();
    mockGetState.mockReset();
    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    mockCreateAsync.mockResolvedValue({ sound: { replayAsync: mockReplayAsync, stopAsync: mockStopAsync } });
    setAlarmState();
  });

  it('inicia alarme BLE, toca som e agenda notificacao', async () => {
    const { startBleAlarm } = require('@/services/bleAlarm');

    await startBleAlarm('alarm-1', 'Coleira distante');

    expect(mockSetNotificationCategoryAsync).toHaveBeenCalled();
    expect(mockSetAudioModeAsync).toHaveBeenCalled();
    expect(mockReplayAsync).toHaveBeenCalled();
    expect(mockSetBleAlarmPlayback).toHaveBeenCalledWith(true, 'alarm-1');
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({
        title: 'Alerta BLE',
        body: 'Coleira distante',
        data: expect.objectContaining({ bleAlarmKey: 'alarm-1' })
      }),
      trigger: null
    }));
  });

  it('nao reinicia alarme quando a mesma chave ja esta tocando', async () => {
    setAlarmState({ isBleAlarmPlaying: true, activeBleAlarmKey: 'alarm-1' });

    const { startBleAlarm } = require('@/services/bleAlarm');
    await startBleAlarm('alarm-1', 'Coleira distante');

    expect(mockReplayAsync).not.toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('para alarme e silencia chave atual quando solicitado', async () => {
    const { startBleAlarm, stopBleAlarm } = require('@/services/bleAlarm');

    await startBleAlarm('alarm-1', 'Coleira distante');
    setAlarmState({ activeBleAlarmKey: 'alarm-1' });
    await stopBleAlarm({ silenceCurrent: true });

    expect(mockStopAsync).toHaveBeenCalled();
    expect(mockSetBleAlarmPlayback).toHaveBeenLastCalledWith(false, null);
    expect(mockSetSilencedBleAlarmKey).toHaveBeenCalledWith('alarm-1');
  });

  it('acao da notificacao para o alarme e abre GPS', async () => {
    setAlarmState({ activeBleAlarmKey: 'alarm-1' });
    const { handleBleAlarmNotificationResponse } = require('@/services/bleAlarm');

    await handleBleAlarmNotificationResponse({
      actionIdentifier: 'ble-alarm-stop',
      notification: { request: { content: { data: { bleAlarmKey: 'alarm-1' } } } }
    });

    expect(mockSetSilencedBleAlarmKey).toHaveBeenCalledWith('alarm-1');
    expect(mockOpenGpsTab).toHaveBeenCalled();
  });
});

export {};

