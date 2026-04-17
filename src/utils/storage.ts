import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Universal storage wrapper:
 * - Native (iOS/Android) → expo-secure-store (encrypted)
 * - Web (browser, Expo Go web)  → localStorage (plain, development only)
 *
 * This keeps the same async API everywhere so the app never hangs
 * when running in a browser / Expo Go web / SSR preview.
 */

const isWeb = Platform.OS === 'web';

function webGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function webSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function webDelete(key: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

export async function storageGet(key: string): Promise<string | null> {
  if (isWeb) return webGet(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb) return webSet(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
}

export async function storageDelete(key: string): Promise<void> {
  if (isWeb) return webDelete(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {}
}
