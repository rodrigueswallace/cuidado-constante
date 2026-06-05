import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockFetchLatestGps = jest.fn();
const mockRequestGpsUpdate = jest.fn();
const mockFetchDirections = jest.fn();
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();
const mockOn = jest.fn();
const mockSubscribe = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  getCurrentPositionAsync: mockGetCurrentPositionAsync
}));

jest.mock('@/services/edgeApi', () => ({
  fetchLatestGps: mockFetchLatestGps,
  requestGpsUpdate: mockRequestGpsUpdate
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel
  }
}));

jest.mock('@/utils/directions', () => ({
  fetchDirections: mockFetchDirections
}));

const { useGpsTracking } = require('@/hooks/useGpsTracking');

let mountedTrees: renderer.ReactTestRenderer[] = [];

function GpsProbe({
  collarId,
  onValue
}: {
  collarId: string | null;
  onValue: (value: any) => void;
}) {
  onValue(useGpsTracking(collarId, 1));
  return null;
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderGpsProbe(collarId: string | null, onValue: (value: any) => void) {
  const tree = renderer.create(React.createElement(GpsProbe, { collarId, onValue }));
  mountedTrees.push(tree);
  return tree;
}

describe('useGpsTracking', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRequestForegroundPermissionsAsync.mockReset();
    mockGetCurrentPositionAsync.mockReset();
    mockFetchLatestGps.mockReset();
    mockRequestGpsUpdate.mockReset();
    mockFetchDirections.mockReset();
    mockChannel.mockReset();
    mockRemoveChannel.mockReset();
    mockOn.mockReset();
    mockSubscribe.mockReset();

    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -23.5, longitude: -46.6 }
    });
    mockFetchDirections.mockResolvedValue({ routes: [{ overview_polyline: { points: 'abc' } }] });
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockSubscribe.mockReturnValue({ topic: 'gps-collar-1' });
    mockChannel.mockReturnValue({ on: mockOn });
  });

  afterEach(() => {
    act(() => {
      mountedTrees.forEach((tree) => tree.unmount());
      mountedTrees = [];
    });
    jest.useRealTimers();
  });

  it('informa erro quando nao existe coleira ativa', async () => {
    let latest: any;

    await act(async () => {
      renderGpsProbe(null, (value) => { latest = value; });
    });
    await flushMicrotasks();

    expect(latest.events).toEqual([]);
    expect(latest.error).toBe('Nenhuma coleira ativa vinculada.');
    expect(mockFetchLatestGps).not.toHaveBeenCalled();
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('carrega eventos, localizacao do usuario e recalcula rota', async () => {
    const treeRef: { current?: renderer.ReactTestRenderer } = {};
    const event = { id: 'gps-1', lat: -23.4066756, lng: -46.8783888, ts: '2026-06-05T12:00:00Z' };
    mockFetchLatestGps.mockResolvedValue({ events: [event] });
    let latest: any;

    await act(async () => {
      treeRef.current = renderGpsProbe('collar-1', (value) => { latest = value; });
    });
    await flushMicrotasks();
    await flushMicrotasks();

    expect(mockFetchLatestGps).toHaveBeenCalledWith('collar-1');
    expect(mockChannel).toHaveBeenCalledWith('gps-collar-1');
    expect(latest.events).toEqual([event]);
    expect(latest.userLocation).toEqual({ latitude: -23.5, longitude: -46.6 });

    await act(async () => {
      await latest.recalcRoute(true);
    });

    expect(mockFetchDirections).toHaveBeenCalledWith('-23.5,-46.6', '-23.4066756,-46.8783888');
    expect(latest.route).toEqual({ routes: [{ overview_polyline: { points: 'abc' } }] });

    act(() => {
      treeRef.current!.unmount();
    });
    expect(mockRemoveChannel).toHaveBeenCalledWith({ topic: 'gps-collar-1' });
  });

  it('envia pedido de atualizacao e para ao receber novo evento', async () => {
    jest.useFakeTimers();
    const oldEvent = { id: 'gps-old', lat: -23.4, lng: -46.8, ts: '2026-06-05T12:00:00Z' };
    const newEvent = { id: 'gps-new', lat: -23.41, lng: -46.87, ts: '2026-06-05T12:01:00Z' };
    mockFetchLatestGps
      .mockResolvedValueOnce({ events: [oldEvent] })
      .mockResolvedValueOnce({ events: [newEvent] });
    mockRequestGpsUpdate.mockResolvedValue(undefined);
    let latest: any;

    await act(async () => {
      renderGpsProbe('collar-1', (value) => { latest = value; });
    });
    await flushMicrotasks();

    let requestPromise: Promise<void>;
    await act(async () => {
      requestPromise = latest.requestPositionUpdate();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
      await requestPromise!;
    });

    expect(mockRequestGpsUpdate).toHaveBeenCalledWith('collar-1');
    expect(latest.events).toEqual([newEvent]);
    expect(latest.requestingUpdate).toBe(false);
    jest.useRealTimers();
  });

  it('traduz erro de JWT ao carregar GPS', async () => {
    mockFetchLatestGps.mockRejectedValue(new Error('Invalid JWT'));
    let latest: any;

    await act(async () => {
      renderGpsProbe('collar-1', (value) => { latest = value; });
    });
    await flushMicrotasks();

    expect(latest.events).toEqual([]);
    expect(latest.loading).toBe(false);
    expect(latest.error).toContain('login novamente');
  });

  it('informa timeout quando pedido GPS nao recebe novo evento', async () => {
    jest.useFakeTimers();
    const oldEvent = { id: 'gps-old', lat: -23.4, lng: -46.8, ts: '2026-06-05T12:00:00Z' };
    mockFetchLatestGps.mockResolvedValue({ events: [oldEvent] });
    mockRequestGpsUpdate.mockResolvedValue(undefined);
    let latest: any;

    await act(async () => {
      renderGpsProbe('collar-1', (value) => { latest = value; });
    });
    await flushMicrotasks();

    let requestPromise: Promise<void>;
    await act(async () => {
      requestPromise = latest.requestPositionUpdate();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(40000);
      await requestPromise!;
    });

    expect(mockRequestGpsUpdate).toHaveBeenCalledWith('collar-1');
    expect(latest.error).toBe('Pedido enviado, mas a coleira ainda nao respondeu. Mostrando a ultima localizacao.');
    expect(latest.requestingUpdate).toBe(false);
  });

  it('mantem rota vazia quando nao existe localizacao do usuario ou evento GPS', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue({ coords: null });
    mockFetchLatestGps.mockResolvedValue({ events: [] });
    let latest: any;

    await act(async () => {
      renderGpsProbe('collar-1', (value) => { latest = value; });
    });
    await flushMicrotasks();

    await act(async () => {
      await latest.recalcRoute(true);
    });

    expect(mockFetchDirections).not.toHaveBeenCalled();
    expect(latest.route).toBeNull();
  });
});

export {};
