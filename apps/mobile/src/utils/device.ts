import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

/**
 * Generates a stable device fingerprint by combining device info + installation ID.
 * Used for attendance anti-proxy verification and device registration.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const parts: string[] = [
    Device.brand ?? 'unknown',
    Device.modelName ?? 'unknown',
    Device.osName ?? Platform.OS,
    Device.osVersion ?? 'unknown',
    Platform.OS === 'android'
      ? (Application.getAndroidId() ?? 'unknown')
      : ((await Application.getIosIdForVendorAsync()) ?? 'unknown'),
  ];

  // Simple hash — sufficient for fingerprinting
  const raw = parts.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}_${raw.length}`;
}

/**
 * Returns a human-readable device name.
 */
export function getDeviceName(): string {
  if (Device.brand && Device.modelName) {
    return `${Device.brand} ${Device.modelName}`;
  }
  return Device.deviceName ?? 'Unknown Device';
}

/**
 * Returns the platform string for the backend.
 */
export function getDevicePlatform(): string {
  return Platform.OS === 'android' ? 'ANDROID' : Platform.OS === 'ios' ? 'IOS' : 'OTHER';
}
