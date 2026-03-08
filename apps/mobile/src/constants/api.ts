import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Base URL for the BMS Hostel API.
 *
 * Reads from `expo.extra.apiBaseUrl` / `expo.extra.androidApiBaseUrl`
 * set in app.config.ts, which in turn reads from the API_BASE_URL env var.
 *
 * Defaults: Android emulator → 10.0.2.2:3001, others → localhost:3001.
 */
const extra = Constants.expoConfig?.extra as
  | { apiBaseUrl?: string; androidApiBaseUrl?: string }
  | undefined;

export const API_BASE_URL: string = Platform.select({
  android: (extra?.androidApiBaseUrl ?? 'http://10.0.2.2:3001') + '/api/v1',
  ios: (extra?.apiBaseUrl ?? 'http://localhost:3001') + '/api/v1',
  default: (extra?.apiBaseUrl ?? 'http://localhost:3001') + '/api/v1',
}) as string;

/** Default timeout for API requests in milliseconds */
export const API_TIMEOUT = 15_000;

/** Number of retries for failed requests */
export const API_RETRY_COUNT = 2;

/** Token refresh window (refresh 2 min before expiry) */
export const TOKEN_REFRESH_WINDOW_MS = 2 * 60 * 1000;

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 20;

/** SecureStore keys */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'bms_access_token',
  REFRESH_TOKEN: 'bms_refresh_token',
  USER_DATA: 'bms_user_data',
  BIOMETRIC_ENABLED: 'bms_biometric_enabled',
  THEME_MODE: 'bms_theme_mode',
  DEVICE_FINGERPRINT: 'bms_device_fingerprint',
  ONBOARDING_COMPLETE: 'bms_onboarding_complete',
} as const;
