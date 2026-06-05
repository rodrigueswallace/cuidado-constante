import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockRequest = jest.fn();
const mockRequestMultiple = jest.fn();
const mockStopDeviceScan = jest.fn();
const mockStartDeviceScan = jest.fn();
const mockConnectToDevice = jest.fn();
const mockOnDeviceDisconnected = jest.fn();
const mockSaveBleDeviceName = jest.fn();
const mockEnqueueBleEvent = jest.fn();
const mockFlushBleQueue = jest.fn();
const mockSetConnectedBleDevice = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_COARSE_LOCATION: 'ACCESS_COARSE_LOCATION',
      ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
      BLUETOOTH_SCAN: 'BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT'
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied'
    },
    request: mockRequest,
    requestMultiple: mockRequestMultiple
  }
}));

jest.mock('@/services/bleManager', () => ({
  bleManager: {
    stopDeviceScan: mockStopDeviceScan,
    startDeviceScan: mockStartDeviceScan,
    connectToDevice: mockConnectToDevice,
    onDeviceDisconnected: mockOnDeviceDisconnected
  }
}));

jest.mock('@/services/device', () => ({
  saveBleDeviceName: mockSaveBleDeviceName
}));

jest.mock('@/store/appStore', () => ({
  useAppStore: () => ({
    enqueueBleEvent: mockEnqueueBleEvent,
    flushBleQueue: mockFlushBleQueue,
    setConnectedBleDevice: mockSetConnectedBleDevice
  })
}));

const { useBleTracking } = require('@/hooks/useBleTracking');

function BleProbe({ onValue }: { onValue: (value: any) => void }) {
  onValue(useBleTracking('service-uuid'));
  return null;
}

describe('useBleTracking', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRequest.mockReset();
    mockRequestMultiple.mockReset();
    mockStopDeviceScan.mockReset();
    mockStartDeviceScan.mockReset();
    mockConnectToDevice.mockReset();
    mockOnDeviceDisconnected.mockReset();
    mockSaveBleDeviceName.mockReset();
    mockEnqueueBleEvent.mockReset();
    mockFlushBleQueue.mockReset();
    mockSetConnectedBleDevice.mockReset();

    mockRequestMultiple.mockResolvedValue({
      BLUETOOTH_SCAN: 'granted',
      BLUETOOTH_CONNECT: 'granted',
      ACCESS_FINE_LOCATION: 'granted'
    });
    mockFlushBleQueue.mockResolvedValue({ sent: 1, failed: 0 });
    mockSaveBleDeviceName.mockResolvedValue(undefined);
  });

  it('bloqueia escaneamento quando permissao BLE e localizacao sao negadas', async () => {
    mockRequestMultiple.mockResolvedValue({
      BLUETOOTH_SCAN: 'denied',
      BLUETOOTH_CONNECT: 'granted',
      ACCESS_FINE_LOCATION: 'granted'
    });
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.scan();
    });

    expect(latest.scanStatus).toContain('Bluetooth');
    expect(latest.scanStatus).toContain('negadas');
    expect(mockStartDeviceScan).not.toHaveBeenCalled();
  });

  it('escaneia e adiciona dispositivo encontrado sem duplicar', async () => {
    const device = { id: 'dev-1', name: 'ColeiraPadrao' };
    mockStartDeviceScan.mockImplementation((_filters, _options, callback) => {
      callback(null, device);
      callback(null, device);
    });
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.scan();
    });

    expect(mockStartDeviceScan).toHaveBeenCalledWith(['service-uuid'], null, expect.any(Function));
    expect(latest.devices).toEqual([device]);
    expect(latest.isScanning).toBe(true);
  });

  it('conecta, salva nome BLE, registra evento e calcula distancia estimada', async () => {
    jest.useFakeTimers();
    let disconnectCallback: any;
    const connectedDevice = {
      id: 'dev-1',
      name: 'ColeiraPadrao',
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(undefined),
      readRSSI: jest.fn().mockResolvedValue({ rssi: -64 }),
      cancelConnection: jest.fn().mockResolvedValue(undefined)
    };
    mockConnectToDevice.mockResolvedValue(connectedDevice);
    mockOnDeviceDisconnected.mockImplementation((_id, callback) => {
      disconnectCallback = callback;
      return { remove: jest.fn() };
    });
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.connect({ id: 'dev-1', name: 'ColeiraPadrao' }, 'collar-1');
    });

    expect(mockConnectToDevice).toHaveBeenCalledWith('dev-1');
    expect(connectedDevice.discoverAllServicesAndCharacteristics).toHaveBeenCalled();
    expect(mockSetConnectedBleDevice).toHaveBeenCalledWith('dev-1', 'ColeiraPadrao');
    expect(mockSaveBleDeviceName).toHaveBeenCalledWith('collar-1', 'ColeiraPadrao');
    expect(mockEnqueueBleEvent).toHaveBeenCalledWith(expect.objectContaining({
      collar_id: 'collar-1',
      rssi: -64,
      battery: 75
    }));
    expect(mockFlushBleQueue).toHaveBeenCalled();
    expect(latest.connectedDevice).toBe(connectedDevice);
    expect(latest.rssi).toBe(-64);
    expect(latest.battery).toBe(75);
    expect(latest.estimatedDistance).toBeGreaterThan(0);

    act(() => {
      disconnectCallback(null);
    });

    expect(latest.connectedDevice).toBeNull();
    expect(latest.lastDisconnectUnexpected).toBe(true);
    jest.useRealTimers();
  });

  it('para scan e registra erro quando o BLE retorna falha no escaneamento', async () => {
    mockStartDeviceScan.mockImplementation((_filters, _options, callback) => {
      callback({ message: 'Bluetooth desligado', errorCode: 102 }, null);
    });
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.scan();
    });

    expect(latest.scanStatus).toBe('Bluetooth desligado');
    expect(latest.isScanning).toBe(false);
    expect(mockStopDeviceScan).toHaveBeenCalled();
  });

  it('mostra erro quando conexao BLE falha', async () => {
    mockConnectToDevice.mockRejectedValue(new Error('Falha fisica de conexao'));
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.connect({ id: 'dev-1', name: 'ColeiraPadrao' }, 'collar-1');
    });

    expect(latest.connectedDevice).toBeNull();
    expect(latest.isConnecting).toBe(false);
    expect(latest.scanStatus).toContain('ColeiraPadrao');
  });

  it('limpa estado quando usuario desconecta e cancelamento falha', async () => {
    const connectedDevice = {
      id: 'dev-1',
      name: 'ColeiraPadrao',
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(undefined),
      readRSSI: jest.fn().mockResolvedValue({ rssi: -64 }),
      cancelConnection: jest.fn().mockRejectedValue(new Error('ja desconectado'))
    };
    mockConnectToDevice.mockResolvedValue(connectedDevice);
    mockOnDeviceDisconnected.mockReturnValue({ remove: jest.fn() });
    let latest: any;

    await act(async () => {
      renderer.create(React.createElement(BleProbe, {
        onValue: (value) => { latest = value; }
      }));
    });

    await act(async () => {
      await latest.connect({ id: 'dev-1', name: 'ColeiraPadrao' }, 'collar-1');
    });
    expect(latest.connectedDevice).toBe(connectedDevice);

    await act(async () => {
      await latest.disconnect();
    });

    expect(connectedDevice.cancelConnection).toHaveBeenCalled();
    expect(latest.connectedDevice).toBeNull();
    expect(latest.rssi).toBeNull();
    expect(latest.scanStatus).toContain('ColeiraPadrao');
  });
});

export {};
