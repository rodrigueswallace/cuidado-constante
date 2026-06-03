import { PermissionsAndroid, Platform } from 'react-native';

import { bleManager } from '@/services/bleManager';

const BLE_CONFIG_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID?.trim() ?? '';
const BLE_DEVICE_NAME_CHARACTERISTIC_UUID = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID?.trim() ?? '';

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i] ?? 0;
    const byte2 = bytes[i + 1] ?? 0;
    const byte3 = bytes[i + 2] ?? 0;
    const combined = (byte1 << 16) | (byte2 << 8) | byte3;

    output += chars[(combined >> 18) & 63];
    output += chars[(combined >> 12) & 63];
    output += i + 1 < bytes.length ? chars[(combined >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? chars[combined & 63] : '=';
  }

  return output;
}

async function requestBleWritePermissions() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version < 31) {
    const coarse = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return coarse === PermissionsAndroid.RESULTS.GRANTED || fine === PermissionsAndroid.RESULTS.GRANTED;
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function writeBleDeviceName(deviceId: string, name: string) {
  if (!BLE_CONFIG_SERVICE_UUID || !BLE_DEVICE_NAME_CHARACTERISTIC_UUID) {
    throw new Error('configuracao_ble_nome_ausente');
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('nome_ble_invalido');
  }

  const hasPermission = await requestBleWritePermissions();
  if (!hasPermission) {
    throw new Error('permissao_ble_negada');
  }

  const isConnected = await bleManager.isDeviceConnected(deviceId);
  if (!isConnected) {
    await bleManager.connectToDevice(deviceId, { timeout: 10000 });
  }

  await bleManager.discoverAllServicesAndCharacteristicsForDevice(deviceId);

  const payload = encodeBase64(normalizedName);

  await bleManager.writeCharacteristicWithResponseForDevice(deviceId, BLE_CONFIG_SERVICE_UUID, BLE_DEVICE_NAME_CHARACTERISTIC_UUID, payload);
}
