const mockIsDeviceConnected = jest.fn();
const mockConnectToDevice = jest.fn();
const mockDiscoverAllServicesAndCharacteristicsForDevice = jest.fn();
const mockWriteCharacteristicWithResponseForDevice = jest.fn();
const mockRequest = jest.fn();
const mockRequestMultiple = jest.fn();

jest.mock('@/services/bleManager', () => ({
  bleManager: {
    isDeviceConnected: mockIsDeviceConnected,
    connectToDevice: mockConnectToDevice,
    discoverAllServicesAndCharacteristicsForDevice: mockDiscoverAllServicesAndCharacteristicsForDevice,
    writeCharacteristicWithResponseForDevice: mockWriteCharacteristicWithResponseForDevice
  }
}));

jest.mock('react-native', () => {
  return {
    Platform: { OS: 'android', Version: 33 },
    PermissionsAndroid: {
      PERMISSIONS: {
        ACCESS_COARSE_LOCATION: 'ACCESS_COARSE_LOCATION',
        ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
        BLUETOOTH_SCAN: 'BLUETOOTH_SCAN',
        BLUETOOTH_CONNECT: 'BLUETOOTH_CONNECT'
      },
      RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
      request: mockRequest,
      requestMultiple: mockRequestMultiple
    }
  };
});

describe('services/bleDeviceConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID = 'service-uuid';
    process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID = 'characteristic-uuid';
    mockIsDeviceConnected.mockReset();
    mockConnectToDevice.mockReset();
    mockDiscoverAllServicesAndCharacteristicsForDevice.mockReset();
    mockWriteCharacteristicWithResponseForDevice.mockReset();
    mockRequest.mockReset();
    mockRequestMultiple.mockReset();
    mockRequestMultiple.mockResolvedValue({
      BLUETOOTH_SCAN: 'granted',
      BLUETOOTH_CONNECT: 'granted',
      ACCESS_FINE_LOCATION: 'granted'
    });
  });

  it('escreve novo nome BLE em base64 quando dispositivo ja esta conectado', async () => {
    mockIsDeviceConnected.mockResolvedValue(true);

    const { writeBleDeviceName } = require('@/services/bleDeviceConfig');
    await writeBleDeviceName('device-1', ' Thor ');

    expect(mockConnectToDevice).not.toHaveBeenCalled();
    expect(mockDiscoverAllServicesAndCharacteristicsForDevice).toHaveBeenCalledWith('device-1');
    expect(mockWriteCharacteristicWithResponseForDevice).toHaveBeenCalledWith(
      'device-1',
      'service-uuid',
      'characteristic-uuid',
      'VGhvcg=='
    );
  });

  it('conecta antes de escrever quando dispositivo esta desconectado', async () => {
    mockIsDeviceConnected.mockResolvedValue(false);

    const { writeBleDeviceName } = require('@/services/bleDeviceConfig');
    await writeBleDeviceName('device-1', 'Thor');

    expect(mockConnectToDevice).toHaveBeenCalledWith('device-1', { timeout: 10000 });
  });

  it('rejeita nome vazio', async () => {
    const { writeBleDeviceName } = require('@/services/bleDeviceConfig');

    await expect(writeBleDeviceName('device-1', '   ')).rejects.toThrow('nome_ble_invalido');
  });

  it('rejeita permissao BLE negada', async () => {
    mockRequestMultiple.mockResolvedValue({
      BLUETOOTH_SCAN: 'denied',
      BLUETOOTH_CONNECT: 'granted',
      ACCESS_FINE_LOCATION: 'granted'
    });

    const { writeBleDeviceName } = require('@/services/bleDeviceConfig');

    await expect(writeBleDeviceName('device-1', 'Thor')).rejects.toThrow('permissao_ble_negada');
  });
});

export {};
