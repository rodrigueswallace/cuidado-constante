import { useMemo, useRef, useState } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';

import { useAppStore } from '@/store/appStore';
import { estimateProximityFromRssi } from '@/utils/geo';

export function useBleTracking(serviceUuid: string) {
  const manager = useMemo(() => new BleManager(), []);
  const connected = useRef<Device | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [rssi, setRssi] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);

  const { enqueueBleEvent, flushBleQueue } = useAppStore();

  const scan = () => {
    setDevices([]);
    console.log('BLE SCAN => start', { serviceUuid });
    manager.startDeviceScan([serviceUuid], null, (scanError, device) => {
      if (scanError) {
        console.log('BLE SCAN ERROR =>', { message: scanError.message, code: scanError.errorCode });
        return;
      }
      if (!device?.id) return;
      setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
    });
    setTimeout(() => {
      manager.stopDeviceScan();
      console.log('BLE SCAN => stop');
    }, 8000);
  };

  const connect = async (device: Device, collarId: string) => {
    try {
      console.log('BLE CONNECT =>', { deviceId: device.id, collarId });
      const conn = await manager.connectToDevice(device.id);
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

      await flushBleQueue();
      console.log('BLE CONNECT OK =>', { deviceId: device.id, rssi: newRssi.rssi ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('BLE CONNECT ERROR =>', { deviceId: device.id, error: message });
    }
  };

  return {
    devices,
    rssi,
    battery,
    estimatedDistance: rssi ? estimateProximityFromRssi(rssi) : null,
    scan,
    connect
  };
}
