import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

export class StorageService {  private static cache = new Map<string, { value: string | null; timestamp: number }>();
  // JSON cache stores already parsed objects to avoid JSON.parse on every read
  private static jsonCache = new Map<string, { value: any | null; timestamp: number }>();
  private static readonly TTL = 30000; // 30 seconds cache

  /**
   * getItem grabs from memory if fresh, else falls back to AsyncStorage
   */
  static async getItem(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.value;
    }

    try {
      const val = await AsyncStorage.getItem(key);
      this.cache.set(key, { value: val, timestamp: Date.now() });
      return val;
    } catch (e) {
      console.warn(`StorageService.getItem error for key ${key}:`, e);
      return null;
    }
  }

  /**
   * getJSON grabs a parsed object from memory if fresh, otherwise reads string and runs JSON.parse
   */
  static async getJSON<T>(key: string): Promise<T | null> {
    const cachedJson = this.jsonCache.get(key);
    if (cachedJson && Date.now() - cachedJson.timestamp < this.TTL) {
      return cachedJson.value as T;
    }

    try {
      const val = await this.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        this.jsonCache.set(key, { value: parsed, timestamp: Date.now() });
        return parsed as T;
      }
      return null;
    } catch (e) {
      console.warn(`StorageService.getJSON error for key ${key}:`, e);
      return null;
    }
  }

  /**
   * setItem updates the cache immediately alongside AsyncStorage
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      this.cache.set(key, { value, timestamp: Date.now() });
      // Clear JSON cache for this key if it exists, as it's now stale
      this.jsonCache.delete(key);
    } catch (e) {
      console.warn(`StorageService.setItem error for key ${key}:`, e);
    }
  }

  /**
   * Removes an item from both AsyncStorage and the cache.
   */
  static async removeItem(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.jsonCache.delete(key); // Also clear from JSON cache
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`StorageService.removeItem error for key ${key}:`, e);
    }
  }

  /**
   * Retrieves multiple items, attempting to fulfill from cache first.
   */
  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const result: [string, string | null][] = [];
    const keysToFetch: string[] = [];

    // Check cache first
    for (const key of keys) {
      const cached = this.cache.get(key);
      if (cached && (Date.now() - cached.timestamp < this.TTL)) {
        result.push([key, cached.value]);
      } else {
        keysToFetch.push(key);
      }
    }

    // Fetch remaining from storage
    if (keysToFetch.length > 0) {
      try {
        const storedValues = await AsyncStorage.multiGet(keysToFetch);
        for (const [key, value] of storedValues) {
          this.cache.set(key, { value, timestamp: Date.now() });
          result.push([key, value]);
        }
      } catch (e) {
        console.warn('StorageService.multiGet error:', e);
        // If multiGet fails, push null for the keys that failed to fetch
        for (const key of keysToFetch) {
          result.push([key, null]);
        }
      }
    }

    // Maintain consistent order matching the input keys
    const orderedResult: [string, string | null][] = [];
    for (const key of keys) {
       const item = result.find(i => i[0] === key);
       orderedResult.push(item ? item : [key, null]);
    }
    return orderedResult;
  }

  /**
   * Sets multiple items in storage and updates the cache.
   */
  static async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      keyValuePairs.forEach(([k, v]) => {
        this.cache.set(k, { value: v, timestamp: Date.now() });
        this.jsonCache.delete(k); // Invalidate parsed cache
      });
    } catch (e) {
      console.warn('StorageService.multiSet error:', e);
    }
  }

  /**
   * Clears all storage and cache.
   */
  static async clear(): Promise<void> {
    this.cache.clear();
    this.jsonCache.clear();
    await AsyncStorage.clear();
  }
}
