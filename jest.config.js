process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'test-google-key';
process.env.EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID = process.env.EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID || 'service-uuid';
process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID || 'characteristic-uuid';

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/navigation/**',
    '!src/screens/**',
    '!src/types/**'
  ],
  coverageThreshold: {
    './src/utils/geo.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },
    './src/utils/formats.ts': {
      statements: 70,
      branches: 50,
      functions: 80,
      lines: 85
    },
    './src/services/edgeApi.ts': {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 65
    },
    './src/services/device.ts': {
      statements: 60,
      branches: 50,
      functions: 70,
      lines: 75
    },
    './src/store/appStore.ts': {
      statements: 55,
      branches: 10,
      functions: 40,
      lines: 55
    }
  },
  coverageDirectory: 'coverage',
  clearMocks: true
};
