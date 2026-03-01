import { useEffect, useMemo, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';

import { useAppStore } from '@/store/appStore';
import { estimateProximityFromRssi } from '@/utils/geo';

export function useBleTracking(serviceUuid: string) {
  const manager = useMemo(() => new BleManager(), []);
  const connected = useRef<Device | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rssiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [rssi, setRssi] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const { enqueueBleEvent, flushBleQueue } = useAppStore();

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (rssiTimerRef.current) clearInterval(rssiTimerRef.current);
      manager.stopDeviceScan();
      manager.destroy();
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

  const scan = async () => {
    if (isScanning) return;

    const granted = await requestBlePermissions();
    if (!granted) {
      const message = 'Permissoes de Bluetooth/localizacao negadas.';
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
        const message = scanError.message || 'Falha ao escanear BLE.';
        setScanStatus(message);
        console.log('BLE SCAN ERROR =>', { message: scanError.message, code: scanError.errorCode });
        setIsScanning(false);
        manager.stopDeviceScan();
        return;
      }
      if (!device?.id) return;
      setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
    });

    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      setScanStatus('Scan concluido.');
      console.log('BLE SCAN => stop');
    }, 8000);
  };

  const connect = async (device: Device, collarId: string) => {
    try {
      console.log('BLE CONNECT =>', { deviceId: device.id, collarId });
      const current = connected.current;
      let conn: Device;

      if (current?.id === device.id) {
        conn = current;
      } else {
        conn = await manager.connectToDevice(device.id);
      }

      await conn.discoverAllServicesAndCharacteristics();
      connected.current = conn;

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
      setScanStatus(`Falha ao conectar: ${message}`);
      console.log('BLE CONNECT ERROR =>', { deviceId: device.id, error: message });
    }
  };

  return {
    devices,
    rssi,
    battery,
    isScanning,
    scanStatus,
    estimatedDistance: rssi ? estimateProximityFromRssi(rssi) : null,
    scan,
    connect
  };
}
