import { Platform } from 'react-native';

/**
 * Base URL for the BMS Hostel API.
 * Android emulator uses 10.0.2.2 to reach host machine's localhost.
 */
export const API_BASE_URL: string = Platform.select({
  android: 'http://10.0.2.2:3001',
  ios: 'http://localhost:3001',
  default: 'http://localhost:3001',
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
