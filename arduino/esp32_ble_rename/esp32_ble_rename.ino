#include <BLEAdvertising.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Preferences.h>

// Use estes mesmos UUIDs no app:
// EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID
// EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID
static const char* BLE_TRACKING_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
static const char* BLE_CONFIG_SERVICE_UUID = "9e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* BLE_DEVICE_NAME_CHARACTERISTIC_UUID = "9e400002-b5a3-f393-e0a9-e50e24dcca9e";

static const char* PREF_NAMESPACE = "device_cfg";
static const char* PREF_DEVICE_NAME_KEY = "ble_name";
static const char* DEFAULT_DEVICE_NAME = "ColeiraPadrao";
static const size_t MAX_DEVICE_NAME_LEN = 20;

Preferences prefs;
BLEServer* bleServer = nullptr;
BLEService* trackingService = nullptr;
BLEService* configService = nullptr;
BLECharacteristic* deviceNameCharacteristic = nullptr;
BLEAdvertising* advertising = nullptr;

String currentDeviceName = DEFAULT_DEVICE_NAME;
bool restartPending = false;
unsigned long restartAtMs = 0;
bool restartTaskStarted = false;
bool advertisingConfigured = false;

String sanitizeDeviceName(const String& input) {
  String value = input;
  value.trim();

  if (value.length() == 0) {
    return DEFAULT_DEVICE_NAME;
  }

  if (value.length() > MAX_DEVICE_NAME_LEN) {
    value = value.substring(0, MAX_DEVICE_NAME_LEN);
  }

  return value;
}

String loadDeviceName() {
  prefs.begin(PREF_NAMESPACE, true);
  String value = prefs.getString(PREF_DEVICE_NAME_KEY, DEFAULT_DEVICE_NAME);
  prefs.end();
  return sanitizeDeviceName(value);
}

void saveDeviceName(const String& value) {
  prefs.begin(PREF_NAMESPACE, false);
  prefs.putString(PREF_DEVICE_NAME_KEY, value);
  prefs.end();
}

void scheduleRestartWithName(const String& newName);
void startAdvertising();

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    Serial.println("Cliente BLE conectado.");
  }

  void onDisconnect(BLEServer* server) override {
    Serial.println("Cliente BLE desconectado.");

    if (restartPending) {
      Serial.println("Restart pendente. Advertising nao sera reiniciado antes do reboot.");
      return;
    }

    delay(150);
    startAdvertising();
  }
};

class DeviceNameCallbacks : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic* characteristic) override {
    characteristic->setValue(currentDeviceName.c_str());
    Serial.println("Leitura do nome BLE solicitada.");
  }

  void onWrite(BLECharacteristic* characteristic) override {
    String rawValue = characteristic->getValue();
    if (rawValue.length() == 0) {
      Serial.println("Nome BLE recebido vazio. Ignorando.");
      characteristic->setValue(currentDeviceName.c_str());
      return;
    }

    String requestedName = sanitizeDeviceName(rawValue);
    if (requestedName == currentDeviceName) {
      Serial.println("Nome BLE igual ao atual. Nenhuma mudanca.");
      characteristic->setValue(currentDeviceName.c_str());
      return;
    }

    Serial.println("Solicitacao de troca de nome BLE recebida.");
    Serial.print("Nome anterior: ");
    Serial.println(currentDeviceName);
    Serial.print("Nome novo: ");
    Serial.println(requestedName);

    saveDeviceName(requestedName);
    characteristic->setValue(requestedName.c_str());
    scheduleRestartWithName(requestedName);
  }
};

DeviceNameCallbacks deviceNameCallbacks;
ServerCallbacks serverCallbacks;

void restartTask(void* parameter) {
  delay(1200);
  Serial.println("Reiniciando ESP32 para anunciar com o novo nome BLE...");
  delay(100);
  ESP.restart();
}

void scheduleRestartWithName(const String& newName) {
  currentDeviceName = newName;
  restartPending = true;
  restartAtMs = millis() + 1200;

  Serial.println("Nome BLE salvo.");
  Serial.print("Novo nome sera aplicado apos reiniciar: ");
  Serial.println(currentDeviceName);

  if (!restartTaskStarted) {
    restartTaskStarted = true;
    xTaskCreate(restartTask, "restartTask", 2048, nullptr, 1, nullptr);
  }
}

void startAdvertising() {
  advertising = BLEDevice::getAdvertising();

  if (!advertisingConfigured) {
    advertising->addServiceUUID(BLEUUID(BLE_TRACKING_SERVICE_UUID));
    advertising->addServiceUUID(BLEUUID(BLE_CONFIG_SERVICE_UUID));
    advertising->setScanResponse(true);
    advertising->setMinPreferred(0x06);
    advertising->setMinPreferred(0x12);
    advertisingConfigured = true;
  }

  advertising->start();

  Serial.print("Advertising BLE ativo com nome: ");
  Serial.println(currentDeviceName);
}

void setupBle() {
  currentDeviceName = loadDeviceName();

  BLEDevice::init(currentDeviceName.c_str());

  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(&serverCallbacks);
  trackingService = bleServer->createService(BLEUUID(BLE_TRACKING_SERVICE_UUID));
  configService = bleServer->createService(BLEUUID(BLE_CONFIG_SERVICE_UUID));

  deviceNameCharacteristic = configService->createCharacteristic(
    BLEUUID(BLE_DEVICE_NAME_CHARACTERISTIC_UUID),
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );

  deviceNameCharacteristic->setCallbacks(&deviceNameCallbacks);
  deviceNameCharacteristic->setValue(currentDeviceName.c_str());

  trackingService->start();
  configService->start();

  startAdvertising();

  Serial.println("BLE iniciado.");
  Serial.print("Tracking service UUID: ");
  Serial.println(BLE_TRACKING_SERVICE_UUID);
  Serial.print("Config service UUID: ");
  Serial.println(BLE_CONFIG_SERVICE_UUID);
  Serial.print("Device name characteristic UUID: ");
  Serial.println(BLE_DEVICE_NAME_CHARACTERISTIC_UUID);
  Serial.print("Nome BLE atual: ");
  Serial.println(currentDeviceName);
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  Serial.println();
  Serial.println("Inicializando ESP32 BLE rename...");

  setupBle();
}

void loop() {
  if (restartPending && millis() >= restartAtMs) {
    Serial.println("Reiniciando ESP32 para anunciar com o novo nome BLE...");
    delay(100);
    ESP.restart();
  }

  delay(100);
}
