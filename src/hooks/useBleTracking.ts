import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { Device } from 'react-native-ble-plx';

import { saveBleDeviceName } from '@/services/device';
import { bleManager } from '@/services/bleManager';
import { useAppStore } from '@/store/appStore';
import { estimateProximityFromRssi } from '@/utils/geo';

function getDeviceName(device: Device | null) {
  if (!device) return 'Dispositivo';
  return device.name || device.localName || device.id || 'Dispositivo';
}

export function useBleTracking(serviceUuid: string) {
  const manager = bleManager;
  const connected = useRef<Device | null>(null);
  const rssiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userDisconnectRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [rssi, setRssi] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [lastDisconnectUnexpected, setLastDisconnectUnexpected] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  const { enqueueBleEvent, flushBleQueue, setConnectedBleDevice } = useAppStore();

  useEffect(() => {
    return () => {
      if (rssiTimerRef.current) clearInterval(rssiTimerRef.current);
      manager.stopDeviceScan();
    };
  }, [manager]);

  const requestBlePermissions = async () => {
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
  };

  const stopScan = () => {
    manager.stopDeviceScan();
    setIsScanning(false);
    setScanStatus('Escaneamento interrompido.');
  };

  const scan = async () => {
    if (isScanning) {
      stopScan();
      return;
    }

    const granted = await requestBlePermissions();
    if (!granted) {
      const message = 'Permissões de Bluetooth e localização negadas.';
      setScanStatus(message);
      console.log('BLE SCAN ERROR =>', { message });
      return;
    }

    setDevices([]);
    setIsScanning(true);
    setScanStatus('Escaneando dispositivos...');

    const filters = serviceUuid ? [serviceUuid] : null;
    console.log('BLE SCAN => start', { serviceUuid: serviceUuid || 'ANY' });

    manager.startDeviceScan(filters, null, (scanError, device) => {
      if (scanError) {
        const message = scanError.message || 'Falha ao escanear Bluetooth.';
        setScanStatus(message);
        console.log('BLE SCAN ERROR =>', { message: scanError.message, code: scanError.errorCode });
        setIsScanning(false);
        manager.stopDeviceScan();
        return;
      }

      if (!device?.id) return;
      setDevices((prev) => (prev.some((item) => item.id === device.id) ? prev : [...prev, device]));
    });
  };

  const connect = async (device: Device, collarId: string) => {
    if (isConnecting) return;

    const deviceName = getDeviceName(device);

    try {
      setIsConnecting(true);
      setConnectingDeviceId(device.id);
      setLastDisconnectUnexpected(false);
      userDisconnectRef.current = false;
      console.log('BLE CONNECT =>', { deviceId: device.id, collarId });

      const current = connected.current;
      let conn: Device;

      if (current?.id === device.id) {
        conn = current;
      } else {
        setScanStatus(`Pareando com ${deviceName}...`);
        conn = await manager.connectToDevice(device.id);
      }

      setScanStatus(`Conectando com ${getDeviceName(conn)}...`);
      await conn.discoverAllServicesAndCharacteristics();

      connected.current = conn;
      setConnectedDevice(conn);
      setConnectedBleDevice(conn.id, getDeviceName(conn));
      hasConnectedOnceRef.current = true;
      setHasConnectedOnce(true);
      setScanStatus(`Conectado a ${getDeviceName(conn)}.`);

      if (deviceName) {
        saveBleDeviceName(collarId, getDeviceName(conn)).catch(() => null);
      }

      const newRssi = await conn.readRSSI();
      setRssi(newRssi.rssi ?? null);

      const batteryValue = 75;
      setBattery(batteryValue);

      await enqueueBleEvent({
        collar_id: collarId,
        rssi: newRssi.rssi ?? -100,
        battery: batteryValue,
        ts: new Date().toISOString()
      });

      const flushResult = await flushBleQueue();
      console.log('BLE INGEST =>', { sent: flushResult.sent, failed: flushResult.failed, queueAfter: flushResult.failed });
      console.log('BLE CONNECT OK =>', { deviceId: device.id, rssi: newRssi.rssi ?? null });

      manager.onDeviceDisconnected(conn.id, (disconnectError) => {
        const disconnectedName = getDeviceName(conn);
        const unexpected = !userDisconnectRef.current;

        connected.current = null;
        setConnectedDevice(null);
        setConnectedBleDevice(null, null);
        setRssi(null);
        setBattery(null);
        setConnectingDeviceId(null);
        setIsConnecting(false);
        setLastDisconnectUnexpected(unexpected && hasConnectedOnceRef.current);

        if (rssiTimerRef.current) clearInterval(rssiTimerRef.current);

        if (unexpected) {
          setScanStatus(`${disconnectedName} foi desconectado sem confirmação do usuário.`);
        } else {
          setScanStatus(`${disconnectedName} foi desconectado pelo usuário.`);
        }

        userDisconnectRef.current = false;
      });

      if (rssiTimerRef.current) clearInterval(rssiTimerRef.current);
      rssiTimerRef.current = setInterval(async () => {
        try {
          const latest = await connected.current?.readRSSI();
          if (typeof latest?.rssi === 'number') {
            setRssi(latest.rssi);
            console.log('BLE RSSI =>', { deviceId: connected.current?.id, rssi: latest.rssi });
          }
        } catch (pollError) {
          const message = pollError instanceof Error ? pollError.message : String(pollError);
          console.log('BLE RSSI ERROR =>', { error: message });
        }
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScanStatus(`Não foi possível conectar com ${deviceName}.`);
      console.log('BLE CONNECT ERROR =>', { deviceId: device.id, error: message });
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const disconnect = async () => {
    const current = connected.current;
    if (!current) return;

    userDisconnectRef.current = true;
    setLastDisconnectUnexpected(false);
    setScanStatus(`Desconectando de ${getDeviceName(current)}...`);

    try {
      await current.cancelConnection();
    } catch {
      connected.current = null;
      setConnectedDevice(null);
      setConnectedBleDevice(null, null);
      setRssi(null);
      setBattery(null);
      setConnectingDeviceId(null);
      setIsConnecting(false);
      if (rssiTimerRef.current) clearInterval(rssiTimerRef.current);
      setScanStatus(`${getDeviceName(current)} foi desconectado pelo usuário.`);
      userDisconnectRef.current = false;
    }
  };

  return {
    devices,
    rssi,
    battery,
    connectedDevice,
    isConnecting,
    connectingDeviceId,
    isScanning,
    scanStatus,
    hasConnectedOnce,
    lastDisconnectUnexpected,
    estimatedDistance: rssi ? estimateProximityFromRssi(rssi) : null,
    scan,
    stopScan,
    connect,
    disconnect
  };
}
