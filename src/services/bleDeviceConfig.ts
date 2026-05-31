import { BleManager } from 'react-native-ble-plx';

const manager = new BleManager();

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

export async function writeBleDeviceName(deviceId: string, name: string) {
  if (!BLE_CONFIG_SERVICE_UUID || !BLE_DEVICE_NAME_CHARACTERISTIC_UUID) {
    throw new Error('configuracao_ble_nome_ausente');
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error('nome_ble_invalido');
  }

  const isConnected = await manager.isDeviceConnected(deviceId);
  if (!isConnected) {
    throw new Error('dispositivo_ble_nao_conectado');
  }

  const payload = encodeBase64(normalizedName);

  await manager.writeCharacteristicWithResponseForDevice(deviceId, BLE_CONFIG_SERVICE_UUID, BLE_DEVICE_NAME_CHARACTERISTIC_UUID, payload);
}
