import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File } from 'expo-file-system';
import { STORAGE_KEYS } from './storageKeys';
import { StorageService } from './StorageService';

export class BackupService {
  private static ensureDirectoryWritable(directory: Directory): boolean {
    try {
      if (!directory.exists) return false;
      const probeName = `.lockin_probe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`;
      const probe = directory.createFile(probeName, 'text/plain');
      probe.write('ok');
      probe.delete();
      return true;
    } catch {
      return false;
    }
  }

  private static buildBackupFilename(): string {
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
    const msPart = now.getMilliseconds().toString().padStart(3, '0');
    const randomPart = Math.random().toString(36).slice(2, 6);
    return `app.lockin_${datePart}_${timePart}-${msPart}_${randomPart}.json`;
  }

  /**
   * Prompts the user to select a directory for backups via SAF.
   * Returns true if successful.
   */
  static async promptStorageLocation(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.warn('[BackupService] Storage operations require Android.');
        return false;
      }

      const existingUri = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_DIRECTORY_URI);
      const pickedDirectory = await Directory.pickDirectoryAsync(existingUri || undefined);

      if (!pickedDirectory?.uri) {
        return false;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_DIRECTORY_URI, pickedDirectory.uri);
      return true;
    } catch (e) {
      // User cancellation comes here on some platforms.
      console.warn('[BackupService] Storage location selection was canceled or failed:', e);
      return false;
    }
  }

  /**
   * Gets the currently selected storage location.
   */
  static async getStorageLocation(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_DIRECTORY_URI);
  }

  /**
   * Returns storage URI only if it is currently writable.
   * If access is stale (common after reinstall), clears the saved URI.
   */
  static async getValidatedStorageLocation(): Promise<string | null> {
    const savedUri = await this.getStorageLocation();
    if (!savedUri) return null;

    const directory = new Directory(savedUri);
    const writable = this.ensureDirectoryWritable(directory);
    if (writable) return savedUri;

    await AsyncStorage.removeItem(STORAGE_KEYS.BACKUP_DIRECTORY_URI);
    return null;
  }

  /**
   * Serializes all app data and saves it to the selected directory.
   */
  static async createBackup(isManual: boolean = false): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        if (isManual) console.warn('[BackupService] Backups are only supported on Android.');
        return false;
      }

      const directoryUri = await this.getValidatedStorageLocation();
      if (!directoryUri) {
        if (isManual) {
          console.warn('[BackupService] Cannot backup: No writable directory selected.');
        }
        return false;
      }
      const backupDirectory = new Directory(directoryUri);

      // 1. Gather Data
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      const exportObj: Record<string, any> = {};
      items.forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            exportObj[key] = JSON.parse(value);
          } catch {
            exportObj[key] = value;
          }
        }
      });

      const jsonString = JSON.stringify(exportObj, null, 2);

      // 2. Create/write backup file. Retry with unique names in case a provider rejects collisions.
      let writeSuccess = false;
      let lastWriteError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const filename = this.buildBackupFilename();
          const backupFile = backupDirectory.createFile(filename, 'application/json');
          backupFile.write(jsonString);
          writeSuccess = true;
          break;
        } catch (e) {
          lastWriteError = e;
        }
      }

      if (!writeSuccess) {
        throw lastWriteError ?? new Error('Unable to create backup file in selected folder');
      }

      // 3. Update the LAST_BACKUP_DATE
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, Date.now().toString());

      return true;
    } catch (e) {
      console.error('[BackupService] Error creating backup:', e);
      return false;
    }
  }

  /**
   * Checks if it's time to backup silently, executed on app start.
   */
  static async checkAutoBackup(): Promise<void> {
    try {
      const directoryUri = await this.getStorageLocation();
      if (!directoryUri) return; // Cannot backup silently without path

      const freqStr = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_FREQUENCY);
      if (!freqStr || freqStr === '0') return; // Off

      const hrFreq = parseInt(freqStr, 10);
      if (isNaN(hrFreq)) return;

      const lastDateStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);

      if (!lastDateStr) {
        // Never backed up
        await this.createBackup(false);
        return;
      }

      const lastDate = parseInt(lastDateStr, 10);
      const msPassed = Date.now() - lastDate;
      const targetMs = hrFreq * 60 * 60 * 1000;

      if (msPassed >= targetMs) {
        await this.createBackup(false);
      }
    } catch (e) {
      console.error('Error in checkAutoBackup:', e);
    }
  }

  /**
   * Lets user pick a backup file to restore.
   */
  static async restoreBackup(): Promise<boolean> {
    try {
      const picked = await File.pickFileAsync(undefined, 'application/json');
      const pickedFile = Array.isArray(picked) ? picked[0] : picked;
      if (!pickedFile) return false;

      const fileContent = await pickedFile.text();

      const parsedObj = JSON.parse(fileContent);

      // Must be a generic object of keys
      if (typeof parsedObj !== 'object' || Array.isArray(parsedObj) || parsedObj === null) {
        throw new Error('Invalid backup file format');
      }

      const pairsToSet: [string, string][] = [];
      for (const [key, val] of Object.entries(parsedObj)) {
        // If the parsed file had nested json objects, we must stringify them so AsyncStorage accepts them
        const finalVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        pairsToSet.push([key, finalVal]);
      }

      // Capture current backup settings so they survive the wipe
      const currentBackupUri = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_DIRECTORY_URI);
      const currentBackupFreq = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_FREQUENCY);

      // Wipe everything for a clean restore
      await StorageService.clear();

      // Merge restored data with preserved device settings
      const finalItems = [...pairsToSet];
      if (currentBackupUri) {
        const idx = finalItems.findIndex(i => i[0] === STORAGE_KEYS.BACKUP_DIRECTORY_URI);
        if (idx > -1) finalItems[idx][1] = currentBackupUri;
        else finalItems.push([STORAGE_KEYS.BACKUP_DIRECTORY_URI, currentBackupUri]);
      }
      if (currentBackupFreq) {
        const idx = finalItems.findIndex(i => i[0] === STORAGE_KEYS.BACKUP_FREQUENCY);
        if (idx > -1) finalItems[idx][1] = currentBackupFreq;
        else finalItems.push([STORAGE_KEYS.BACKUP_FREQUENCY, currentBackupFreq]);
      }

      await AsyncStorage.multiSet(finalItems);

      return true;
    } catch (e) {
      console.error('[BackupService] Failed to restore backup:', e);
      return false;
    }
  }

  /**
   * Calculates local storage usage in MB based on AsyncStorage.
   */
  static async calculateStorageUsage(): Promise<string> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      let totalBytes = 0;

      items.forEach(([k, v]) => {
        totalBytes += (k.length * 2); // approximate JS char size
        if (v) {
          totalBytes += (v.length * 2);
        }
      });

      const kb = totalBytes / 1024;
      if (kb > 1024) {
        return (kb / 1024).toFixed(2) + ' MB';
      }
      return kb.toFixed(2) + ' KB';
    } catch (e) {
      return '0 KB';
    }
  }
}
