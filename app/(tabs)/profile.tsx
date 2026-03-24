import { View, Text, TouchableOpacity, Alert, ScrollView, Switch, TextInput, ActivityIndicator, Linking, Share, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Milestone } from '../../types';
import { useAI } from '../../contexts/AIContext';
import { saveCustomApiKey, getCustomApiKey, testApiKey } from '../../services/gemini';
import { loadStreakData } from '../../utils/streakUtils';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { registerForPushNotificationsAsync, scheduleDailyStreakReminder } from '../../services/notifications';



export default function Profile() {
  const router = useRouter();
  const { aiProvider, refreshProvider } = useAI();

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('LLockIN');
  const [goal, setGoal] = useState('Loading...');
  const [motivation, setMotivation] = useState('');
  const [stats, setStats] = useState({ completed: 0, total: 0, daysActive: 0, currentStreak: 0, longestStreak: 0 });


  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState({ hour: 21, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);

  // AI Settings
  const [customApiKey, setCustomApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  const loadData = async () => {
    const savedName = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
    const savedGoal = await AsyncStorage.getItem(STORAGE_KEYS.MAIN_GOAL);
    const savedMotivation = await AsyncStorage.getItem(STORAGE_KEYS.MOTIVATION);
    const savedStack = await AsyncStorage.getItem(STORAGE_KEYS.MILESTONE_STACK);
    const savedNotifs = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    const savedTime = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REMINDER_TIME);

    if (savedName) setUserName(savedName);
    if (savedGoal) setGoal(savedGoal);
    if (savedMotivation) setMotivation(savedMotivation);

    if (savedNotifs === 'true') {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } else {
      setNotificationsEnabled(false);
    }

    if (savedTime) {
      setReminderTime(JSON.parse(savedTime));
    }

    if (savedStack) {
      const stack: Milestone[] = JSON.parse(savedStack);
      const completed = stack.filter(m => m.status === 'COMPLETED').length;
      setStats(prev => ({ ...prev, completed, total: stack.length }));
    }

    const streakData = await loadStreakData();
    setStats(prev => ({
      ...prev,
      daysActive: Math.max(0, streakData.totalCheckIns),
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak
    }));

    // Load custom API key status
    const existingKey = await getCustomApiKey();
    setHasExistingKey(!!existingKey);
    if (existingKey) {
      // Show masked key
      setCustomApiKey('••••••••' + existingKey.slice(-4));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getProviderLabel = () => {
    switch (aiProvider) {
      case 'ondevice': return 'On-Device AI';
      case 'gemini': return 'Gemini (Default)';
      case 'gemini-custom': return 'Gemini (Custom Key)';
      default: return 'Not Configured';
    }
  };

  const getProviderDescription = () => {
    switch (aiProvider) {
      case 'ondevice': return 'Fastest & fully private.';
      case 'gemini': return 'Shared quota. Add your key to avoid limits.';
      case 'gemini-custom': return 'Using your personal Gemini Flash quota.';
      default: return 'No AI available. Add a key below.';
    }
  };

  const getProviderColor = () => {
    switch (aiProvider) {
      case 'ondevice': return '#10B981'; // green
      case 'gemini': return '#3B82F6'; // blue
      case 'gemini-custom': return '#000000'; // black
      default: return '#EF4444'; // red
    }
  };

  const handleTestKey = async () => {
    const keyToTest = customApiKey.startsWith('••') ? null : customApiKey;
    if (!keyToTest) {
      Alert.alert('Enter Key', 'Please enter a new API key to test.');
      return;
    }

    setIsTestingKey(true);
    try {
      const result = await testApiKey(keyToTest);
      if (result.valid) {
        Alert.alert('Success ✓', 'API key is valid and working!');
      } else {
        Alert.alert('Invalid Key', result.error || 'The API key is not valid.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to test API key.');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveKey = async () => {
    const keyToSave = customApiKey.startsWith('••') ? null : customApiKey.trim();

    if (!keyToSave) {
      Alert.alert('Enter Key', 'Please enter an API key to save.');
      return;
    }

    setIsSavingKey(true);
    try {
      // Test first
      const result = await testApiKey(keyToSave);
      if (!result.valid) {
        Alert.alert('Invalid Key', result.error || 'Please enter a valid API key.');
        return;
      }

      // Save the key
      await saveCustomApiKey(keyToSave);
      setHasExistingKey(true);
      setCustomApiKey('••••••••' + keyToSave.slice(-4));

      // Refresh AI provider
      await refreshProvider();

      Alert.alert('Saved ✓', 'Your API key has been saved. AI is now using your key.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save API key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    Alert.alert(
      'Clear API Key?',
      'This will remove your custom API key. The app will use the default key (if available).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await saveCustomApiKey('');
            setCustomApiKey('');
            setHasExistingKey(false);
            await refreshProvider();
          }
        }
      ]
    );
  };

  const handleReset = async () => {
    Alert.alert(
      "ABORT MISSION?",
      "This will wipe all progress, goals, and tactical plans. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "CONFIRM WIPE",
          style: "destructive",
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);
              router.replace('/');
            } catch (e) {
              console.error("Failed to clear storage", e);
              router.replace('/');
            }
          }
        }
      ]
    );
  };

  const handleNameChange = async (text: string) => {
    setUserName(text);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, text);
  };

  const handleColorChange = (color: string) => {
    // Deprecated
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
        await scheduleDailyStreakReminder(reminderTime.hour, reminderTime.minute);
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      const newTime = { hour, minute };
      setReminderTime(newTime);
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REMINDER_TIME, JSON.stringify(newTime));

      if (notificationsEnabled) {
        await scheduleDailyStreakReminder(hour, minute);
      }
    }
  };

  const formatTime = (hour: number, minute: number) => {
    const d = new Date();
    d.setHours(hour, minute);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleExportData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      const exportObj: Record<string, any> = {};
      items.forEach(([key, value]) => {
        if (value) {
          try {
            exportObj[key] = JSON.parse(value);
          } catch {
            exportObj[key] = value;
          }
        }
      });

      const jsonString = JSON.stringify(exportObj, null, 2);

      await Share.share({
        message: jsonString,
        title: 'LockIn Data Export',
      });
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to export data.');
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View className="mb-8 items-center">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4 bg-black"
          >
            <Text className="text-white font-black text-4xl">
              {userName.charAt(0).toUpperCase() || 'L'}
            </Text>
          </View>

          <TextInput
            value={userName}
            onChangeText={handleNameChange}
            className="font-black text-2xl tracking-tighter text-center"
            placeholder="Your Name"
            placeholderTextColor="#9CA3AF"
          />


        </View>

        {/* Mission Card */}
        <View className="bg-swiss-red p-6 rounded-2xl mb-8">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-white/70 text-[10px] font-bold tracking-widest mb-1">CURRENT GOAL</Text>
              <Text className="text-white font-black text-xl leading-6">{goal}</Text>
            </View>
            <Ionicons name="lock-closed" size={20} color="white" />
          </View>
          <View className="h-px bg-white/20 my-4" />
          <Text className="text-white/80 text-xs italic">"{motivation}"</Text>
        </View>

        {/* Stats Grid */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsStatsExpanded(!isStatsExpanded);
          }}
          className="flex-row items-center justify-between border-b-2 border-gray-200 mb-4 py-4"
        >
          <Text className="font-bold text-xs text-black uppercase tracking-widest">Statistics</Text>
          <Ionicons name={isStatsExpanded ? "chevron-up" : "chevron-down"} size={16} color="black" />
        </TouchableOpacity>

        {isStatsExpanded && (
          <View className="flex-row flex-wrap gap-4 mb-8">
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.completed}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">MILESTONES DONE</Text>
            </View>
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.total}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">TOTAL MILESTONES</Text>
            </View>
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.daysActive}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">DAYS ACTIVE</Text>
            </View>
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.currentStreak}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">CURRENT STREAK</Text>
            </View>
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.longestStreak}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">LONGEST STREAK</Text>
            </View>
            <View className="w-[47%] bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
              <Text className="font-black text-2xl">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">COMPLETION RATE</Text>
            </View>
          </View>
        )}

        {!isStatsExpanded && <View className="mb-4" />}

        {/* AI Settings Section */}
        <Text className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest">AI Settings</Text>

        <View className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-8">
          {/* Current Provider Status */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="hardware-chip-outline" size={16} color="black" />
              </View>
              <View className="flex-1 pr-4">
                <Text className="font-bold text-sm">AI Provider</Text>
                <Text className="text-xs font-medium" style={{ color: getProviderColor() }}>{getProviderLabel()}</Text>
                <Text className="text-[10px] text-gray-400 mt-1">{getProviderDescription()}</Text>
              </View>
            </View>
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: getProviderColor() }} />
          </View>

          {/* Custom API Key Input */}
          <View className="p-4">
            <Text className="font-bold text-xs text-gray-500 mb-2">Gemini API Key</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 bg-gray-50 px-4 py-3 rounded-lg font-mono text-sm border border-gray-200"
                placeholder="Enter your Gemini API key..."
                value={customApiKey}
                onChangeText={(text) => {
                  if (!text.startsWith('••')) {
                    setCustomApiKey(text);
                  }
                }}
                onFocus={() => {
                  if (customApiKey.startsWith('••')) {
                    setCustomApiKey('');
                  }
                }}
                secureTextEntry={!customApiKey.startsWith('••')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={handleTestKey}
                disabled={isTestingKey}
                className="flex-1 bg-gray-100 py-3 rounded-lg items-center"
              >
                {isTestingKey ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="font-bold text-sm">Test Key</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveKey}
                disabled={isSavingKey}
                className="flex-1 bg-black py-3 rounded-lg items-center"
              >
                {isSavingKey ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="font-bold text-sm text-white">Save Key</Text>
                )}
              </TouchableOpacity>
            </View>

            {hasExistingKey && (
              <TouchableOpacity onPress={handleClearKey} className="mt-3">
                <Text className="text-swiss-red text-xs font-bold text-center">Clear Custom Key</Text>
              </TouchableOpacity>
            )}

            <Text className="text-[10px] text-gray-400 mt-3 text-center">
              Get your API key from{' '}
              <Text
                className="text-gray-500 underline"
                onPress={() => Linking.openURL('https://aistudio.google.com')}
              >
                aistudio.google.com
              </Text>
            </Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest">Preferences</Text>

        <View className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-8">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="notifications" size={16} color="black" />
              </View>
              <Text className="font-bold text-sm">Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E5E7EB', true: '#000000' }}
            />
          </View>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            className="flex-row items-center justify-between p-4 bg-white"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-transparent rounded-full items-center justify-center">
                <Ionicons name="time-outline" size={16} color={notificationsEnabled ? "black" : "gray"} />
              </View>
              <Text className={`font-medium text-sm ${notificationsEnabled ? 'text-black' : 'text-gray-400'}`}>Daily Reminder Time</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className={`font-bold text-sm ${notificationsEnabled ? 'text-black' : 'text-gray-400'}`}>
                {formatTime(reminderTime.hour, reminderTime.minute)}
              </Text>
              <Ionicons name="chevron-down" size={16} color={notificationsEnabled ? "black" : "gray"} />
            </View>
          </TouchableOpacity>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={(() => {
              const d = new Date();
              d.setHours(reminderTime.hour, reminderTime.minute);
              return d;
            })()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Data Section */}
        <Text className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest">Data Management</Text>
        <View className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-8">
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="download-outline" size={20} color="black" />
              <Text className="font-bold text-sm">Export My Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text className="font-bold text-xs text-swiss-red mb-4 uppercase tracking-widest">Danger Zone</Text>
        <TouchableOpacity
          onPress={handleReset}
          className="flex-row items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100 mb-8"
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text className="font-bold text-swiss-red">Reset All Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#EF4444" />
        </TouchableOpacity>

        {/* About Section */}
        <Text className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest">About LockIn</Text>
        <View className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
            <Text className="font-medium text-sm text-gray-600">Version</Text>
            <Text className="font-bold text-sm">{Constants.expoConfig?.version || '1.0.0'} (BETA)</Text>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://lockin.app/privacy')}
            className="flex-row items-center justify-between p-4 border-b border-gray-100"
          >
            <Text className="font-medium text-sm text-gray-600">Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="gray" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://lockin.app/terms')}
            className="flex-row items-center justify-between p-4 border-b border-gray-100"
          >
            <Text className="font-medium text-sm text-gray-600">Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="gray" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:hello@lockin.app')}
            className="flex-row items-center justify-between p-4"
          >
            <Text className="font-medium text-sm text-gray-600">Contact / Feedback</Text>
            <Ionicons name="chevron-forward" size={16} color="gray" />
          </TouchableOpacity>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
