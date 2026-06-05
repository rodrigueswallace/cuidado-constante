import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockGetInitialURL = jest.fn();
const mockAddEventListener = jest.fn();
const mockSetSessionFromUrl = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockInitializeBleAlarmNotifications = jest.fn();
const mockHandleBleAlarmNotificationResponse = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();

jest.mock('react-native', () => ({
  Linking: {
    getInitialURL: mockGetInitialURL,
    addEventListener: mockAddEventListener
  }
}));

jest.mock('@/services/auth', () => ({
  authService: {
    setSessionFromUrl: mockSetSessionFromUrl
  }
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

jest.mock('@/services/bleAlarm', () => ({
  initializeBleAlarmNotifications: mockInitializeBleAlarmNotifications,
  handleBleAlarmNotificationResponse: mockHandleBleAlarmNotificationResponse
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: mockGetLastNotificationResponseAsync,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener
}));

const { useAuth } = require('@/hooks/useAuth');
const { useBleAlarmNotifications } = require('@/hooks/useBleAlarmNotifications');

function AuthProbe({ onValue }: { onValue: (value: any) => void }) {
  onValue(useAuth());
  return null;
}

function BleNotificationProbe() {
  useBleAlarmNotifications();
  return null;
}

describe('hooks', () => {
  beforeEach(() => {
    mockGetInitialURL.mockReset();
    mockAddEventListener.mockReset();
    mockSetSessionFromUrl.mockReset();
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockInitializeBleAlarmNotifications.mockReset();
    mockHandleBleAlarmNotificationResponse.mockReset();
    mockGetLastNotificationResponseAsync.mockReset();
    mockAddNotificationResponseReceivedListener.mockReset();
    mockGetInitialURL.mockResolvedValue(null);
    mockSetSessionFromUrl.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockAddEventListener.mockReturnValue({ remove: jest.fn() });
    mockOnAuthStateChange.mockReturnValue({ data: { listener: { subscription: { unsubscribe: jest.fn() } } } });
  });

  it('useAuth carrega sessao inicial e sincroniza deep link', async () => {
    mockGetInitialURL.mockResolvedValue('cuidado://reset#access_token=a&refresh_token=b');
    let latest: any = null;

    await act(async () => {
      renderer.create(React.createElement(AuthProbe, { onValue: (value) => { latest = value; } }));
    });

    expect(mockGetSession).toHaveBeenCalled();
    expect(mockSetSessionFromUrl).toHaveBeenCalledWith('cuidado://reset#access_token=a&refresh_token=b');
    expect(latest.loading).toBe(false);
    expect(latest.session).toEqual({ user: { id: 'user-1' } });
  });

  it('useAuth reage a PASSWORD_RECOVERY e SIGNED_OUT', async () => {
    let authCallback: any;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { listener: { subscription: { unsubscribe: jest.fn() } } } };
    });

    let latest: any = null;
    await act(async () => {
      renderer.create(React.createElement(AuthProbe, { onValue: (value) => { latest = value; } }));
    });

    await act(async () => {
      authCallback('PASSWORD_RECOVERY', { user: { id: 'user-1' } });
    });
    expect(latest.isRecoveringPassword).toBe(true);

    await act(async () => {
      authCallback('SIGNED_OUT', null);
    });
    expect(latest.isRecoveringPassword).toBe(false);
    expect(latest.session).toBeNull();
  });

  it('useBleAlarmNotifications inicializa notificacoes e trata respostas', async () => {
    const lastResponse = { actionIdentifier: 'default' };
    const liveResponse = { actionIdentifier: 'ble-alarm-stop' };
    const remove = jest.fn();
    mockGetLastNotificationResponseAsync.mockResolvedValue(lastResponse);
    mockAddNotificationResponseReceivedListener.mockImplementation((callback) => {
      callback(liveResponse);
      return { remove };
    });

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(BleNotificationProbe));
    });

    expect(mockInitializeBleAlarmNotifications).toHaveBeenCalled();
    expect(mockHandleBleAlarmNotificationResponse).toHaveBeenCalledWith(lastResponse);
    expect(mockHandleBleAlarmNotificationResponse).toHaveBeenCalledWith(liveResponse);

    act(() => {
      tree!.unmount();
    });
    expect(remove).toHaveBeenCalled();
  });
});

export {};
