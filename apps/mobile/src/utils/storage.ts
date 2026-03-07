import { MMKV } from 'react-native-mmkv';

/**
 * MMKV storage instance for fast, synchronous key-value persistence.
 * Used for caching API responses, user preferences, and offline data.
 */
export const storage = new MMKV({ id: 'bms-hostel-storage' });

/**
 * Type-safe wrapper around MMKV for JSON data.
 */
export const mmkvStorage = {
  getString: (key: string): string | undefined => {
    try {
      return storage.getString(key);
    } catch {
      return undefined;
    }
  },

  setString: (key: string, value: string): void => {
    try {
      storage.set(key, value);
    } catch {
      // Silently fail
    }
  },

  getJSON: <T>(key: string): T | null => {
    try {
      const raw = storage.getString(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch {
      // Silently fail
    }
  },

  getBoolean: (key: string): boolean => {
    try {
      return storage.getBoolean(key) ?? false;
    } catch {
      return false;
    }
  },

  setBoolean: (key: string, value: boolean): void => {
    try {
      storage.set(key, value);
    } catch {
      // Silently fail
    }
  },

  delete: (key: string): void => {
    try {
      storage.delete(key);
    } catch {
      // Silently fail
    }
  },

  clearAll: (): void => {
    try {
      storage.clearAll();
    } catch {
      // Silently fail
    }
  },
};
