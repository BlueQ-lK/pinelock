import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../contexts/ThemeContext';
import { STORAGE_KEYS } from '../../../utils/storageKeys';
import { BackupService } from '../../../utils/BackupService';

const FREQUENCIES = [
  { label: 'Off', value: '0' },
  { label: 'Every 6 Hours', value: '6' },
  { label: 'Every 12 Hours', value: '12' },
  { label: 'Daily', value: '24' },
  { label: 'Every 2 Days', value: '48' },
  { label: 'Weekly', value: '168' },
];

export function BackupTab() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [frequency, setFrequency] = useState('0');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [storageUri, setStorageUri] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<string>('0 KB');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const uri = await BackupService.getValidatedStorageLocation();
      const freq = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_FREQUENCY);
      const last = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
      const usage = await BackupService.calculateStorageUsage();

      setStorageUri(uri);
      setFrequency(freq || '0');
      setLastBackup(last);
      setStorageUsage(usage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = async () => {
    const success = await BackupService.promptStorageLocation();
    if (success) {
      const uri = await BackupService.getStorageLocation();
      setStorageUri(uri);
      Alert.alert('Success', 'Storage location updated.');
    } else {
      Alert.alert('Notice', 'Folder access was not granted or selection was canceled.');
    }
  };

  const handleChangeFrequency = async () => {
    const currentIndex = FREQUENCIES.findIndex((f) => f.value === frequency);
    const nextIndex = (currentIndex + 1) % FREQUENCIES.length;
    const nextFreq = FREQUENCIES[nextIndex].value;

    setFrequency(nextFreq);
    await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_FREQUENCY, nextFreq);
  };

  const handleManualBackup = async () => {
    if (!storageUri) {
      Alert.alert(
        'Storage Location Required',
        'Please select a folder where you want to save your backups.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Select Folder', onPress: handleSelectLocation }
        ]
      );
      return;
    }

    setIsProcessing(true);
    const success = await BackupService.createBackup(true);
    setIsProcessing(false);

    if (success) {
      const last = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
      setLastBackup(last);
      Alert.alert('Success', 'Backup created successfully.');
    } else {
      Alert.alert('Error', 'Failed to create backup. Re-select storage location and try again.');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Backup',
      'This will overwrite your current goals, milestones, and settings with the data from the selected backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            const success = await BackupService.restoreBackup();
            setIsProcessing(false);

            if (success) {
              Alert.alert('Success', 'Backup restored successfully. Please restart the app or navigate home.', [
                { text: 'OK', onPress: () => loadSettings() }
              ]);
            } else {
              Alert.alert('Error', 'Failed to restore backup or action canceled.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="py-10 items-center justify-center">
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  const freqLabel = FREQUENCIES.find((f) => f.value === frequency)?.label || 'Off';

  return (
    <View className="flex-1">
      {isProcessing && (
        <View className="absolute z-10 w-full h-full items-center justify-center bg-black/40 rounded-[32px]">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white font-bold mt-4">Processing...</Text>
        </View>
      )}

      {/* Storage Information */}
      <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60 uppercase" style={{ color: theme.text }}>
        Storage Usage
      </Text>
      <View className="flex-row items-center justify-between p-5 rounded-3xl mb-8 border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
        <View className="flex-row items-center gap-4">
          <Ionicons name="pie-chart-outline" size={24} color={theme.text} />
          <Text className="font-bold text-lg" style={{ color: theme.text }}>Estimated Space</Text>
        </View>
        <Text className="font-black text-lg" style={{ color: theme.accent }}>{storageUsage}</Text>
      </View>

      {/* Backup Settings */}
      <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60 uppercase" style={{ color: theme.text }}>
        Backup Configuration
      </Text>
      <View className="rounded-3xl overflow-hidden mb-8 border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
        {/* Storage Location Picker */}
        <TouchableOpacity
          onPress={handleSelectLocation}
          className="p-5 border-b flex-row justify-between items-center"
          style={{ borderBottomColor: theme.border }}
        >
          <View className="flex-1 pr-4">
            <View className="flex-row items-center gap-4 mb-1">
              <Ionicons name="folder-outline" size={24} color={theme.text} />
              <Text className="font-bold text-lg" style={{ color: theme.text }}>Storage Location</Text>
            </View>
            <Text
              className="text-xs font-semibold opacity-60 mt-1"
              style={{ color: theme.text }}
              numberOfLines={2}
            >
              {storageUri ? decodeURIComponent(storageUri.split('%3A').pop() || storageUri) : 'Not configured'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Frequency */}
        <TouchableOpacity
          onPress={handleChangeFrequency}
          className="p-5 border-b flex-row justify-between items-center"
          style={{ borderBottomColor: theme.border }}
        >
          <View className="flex-row items-center gap-4">
            <Ionicons name="time-outline" size={24} color={theme.text} />
            <Text className="font-bold text-lg" style={{ color: theme.text }}>Auto Backup</Text>
          </View>
          <Text className="font-black text-base" style={{ color: theme.accent }}>{freqLabel}</Text>
        </TouchableOpacity>

        {/* Last Backup Info */}
        <View className="p-5 flex-row justify-between items-center">
          <Text className="font-medium text-sm opacity-60" style={{ color: theme.text }}>Last Backup</Text>
          <Text className="font-bold text-sm" style={{ color: theme.text }}>
            {lastBackup ? new Date(parseInt(lastBackup, 10)).toLocaleString() : 'Never'}
          </Text>
        </View>
      </View>

      {/* Manual Actions */}
      <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60 uppercase" style={{ color: theme.text }}>
        Manual Override
      </Text>
      <View className="flex-row gap-4 mb-10">
        <TouchableOpacity
          onPress={handleManualBackup}
          className="flex-1 p-5 rounded-3xl items-center border"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
          <Ionicons name="save-outline" size={24} color={theme.text} className="mb-2" />
          <Text className="font-bold tracking-tight" style={{ color: theme.text }}>Create Backup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          className="flex-1 p-5 rounded-3xl items-center border"
          style={{ backgroundColor: theme.danger + '15', borderColor: theme.danger + '30' }}
        >
          <Ionicons name="cloud-download-outline" size={24} color={theme.danger} className="mb-2" />
          <Text className="font-bold tracking-tight" style={{ color: theme.danger }}>Restore</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
