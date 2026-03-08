import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic Expo config that reads from environment variables.
 * Replaces static app.json for environment-aware builds.
 *
 * Usage:
 *   API_BASE_URL=https://api.yourdomain.com npx expo start
 *   API_BASE_URL=https://staging.yourdomain.com eas build --profile preview
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001';
  const androidApiBaseUrl = process.env.ANDROID_API_BASE_URL ?? apiBaseUrl.replace('localhost', '10.0.2.2');

  return {
    ...config,
    name: 'BMS Hostel',
    slug: 'bms-hostel',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'bms-hostel',
    platforms: ['ios', 'android'],
    newArchEnabled: true,
    // @ts-expect-error -- autolinking is valid in expo config but not typed in ExpoConfig
    autolinking: {
      exclude: [
        'expo-dev-client',
        'expo-dev-launcher',
        'expo-dev-menu',
        'expo-dev-menu-interface',
      ],
    },
    extra: {
      apiBaseUrl,
      androidApiBaseUrl,
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission:
            'BMS Hostel needs camera access to scan QR codes for attendance.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'BMS Hostel uses your location to verify attendance proximity.',
          locationWhenInUsePermission:
            'BMS Hostel uses your location to verify attendance proximity.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'BMS Hostel needs photo access to attach images to complaints.',
        },
      ],
    ],
    android: {
      package: 'com.anonymous.bmshostel',
      adaptiveIcon: {
        backgroundColor: '#4F46E5',
      },
      permissions: [
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'READ_MEDIA_IMAGES',
        'VIBRATE',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'bms-hostel' }],
          category: ['DEFAULT', 'BROWSABLE'],
        },
      ],
    },
    ios: {
      bundleIdentifier: 'com.anonymous.bmshostel',
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['bms-hostel'],
          },
        ],
      },
    },
  };
};
