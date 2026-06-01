{
  "cli": {
    "version": ">= 18.0.3",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@EXPO_PUBLIC_SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "@EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
        "EXPO_PUBLIC_BLE_SERVICE_UUID": "@EXPO_PUBLIC_BLE_SERVICE_UUID",
        "EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX": "@EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX",
        "EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID": "@EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID",
        "EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID": "@EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
