import { View, Text, TouchableOpacity, Alert, ScrollView, Switch, TextInput, ActivityIndicator, Linking, Share, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Milestone } from '../../types';

import { StreakData } from '../../utils/streakUtils';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { StorageService } from '../../utils/StorageService';
import { registerForPushNotificationsAsync, scheduleDailyStreakReminder } from '../../services/notifications';

// ─── P-4: Skeleton loader ────────────────────────────────────────────────────
function SkeletonBox({ width, height, className }: { width?: number | string; height: number; className?: string }) {
  return (
    <View
      style={{ width: width as any, height, borderRadius: 8, backgroundColor: '#E5E7EB' }}
      className={className}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ padding: 24 }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB', marginBottom: 16 }} />
        <SkeletonBox width={160} height={28} />
      </View>
      {/* Mission card */}
      <View style={{ height: 110, borderRadius: 16, backgroundColor: '#E5E7EB', marginBottom: 32 }} />
      {/* Stats header */}
      <SkeletonBox width="100%" height={44} className="mb-4" />
      {/* Section label */}
      <SkeletonBox width={80} height={12} className="mb-4" />
      {/* Card */}
      <View style={{ height: 120, borderRadius: 12, backgroundColor: '#E5E7EB', marginBottom: 32 }} />
      <SkeletonBox width={100} height={12} className="mb-4" />
      <View style={{ height: 88, borderRadius: 12, backgroundColor: '#E5E7EB', marginBottom: 32 }} />
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  totalCheckIns: 0,
  lastCheckedIn: null,
  checkIns: [],
};

/** Parse raw streak JSON string exactly as loadStreakData does, without an extra storage read. */
function parseStreakRaw(raw: string | null): StreakData {
  if (!raw) return DEFAULT_STREAK;
  try {
    const parsed: StreakData = JSON.parse(raw);
    if (!parsed.checkIns) parsed.checkIns = [];

    if (parsed.lastCheckedIn) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last = new Date(parsed.lastCheckedIn);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) parsed.currentStreak = 0;
    }
    return parsed;
  } catch {
    return DEFAULT_STREAK;
  }
}

// Stats panel animated height
const STATS_PANEL_HEIGHT = 272; // approximate px for 3-row grid + gaps

export default function Profile() {
  const router = useRouter();

  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true); // P-4
  const [userName, setUserName] = useState('LLockIN');
  const [goal, setGoal] = useState('');
  const [motivation, setMotivation] = useState('');
  const [stats, setStats] = useState({ completed: 0, total: 0, daysActive: 0, currentStreak: 0, longestStreak: 0 });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState({ hour: 21, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  // ─── P-1: Debounced name write ──────────────────────────────────────────
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (text: string) => {
    setUserName(text);
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, text);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  // ─── P-3: Reanimated stats panel ────────────────────────────────────────
  const statsHeight = useSharedValue(0);

  const animatedStatsStyle = useAnimatedStyle(() => ({
    height: statsHeight.value,
    overflow: 'hidden',
  }));

  const toggleStats = () => {
    const next = !isStatsExpanded;
    setIsStatsExpanded(next);
    statsHeight.value = withTiming(next ? STATS_PANEL_HEIGHT : 0, {
      duration: 260,
      easing: Easing.inOut(Easing.ease),
    });
  };
  // ────────────────────────────────────────────────────────────────────────

  // ─── P-2: loadData – reads streak raw string in same Promise.all ────────
  const loadData = async () => {
    const [
      savedName,
      savedGoal,
      savedMotivation,
      savedNotifs,
      rawStreak,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
      AsyncStorage.getItem(STORAGE_KEYS.MAIN_GOAL),
      AsyncStorage.getItem(STORAGE_KEYS.MOTIVATION),
      AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
      AsyncStorage.getItem('streakData'),
    ]);

    if (savedName) setUserName(savedName);
    if (savedGoal) setGoal(savedGoal);
    if (savedMotivation) setMotivation(savedMotivation);

    if (savedNotifs === 'true') {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } else {
      setNotificationsEnabled(false);
    }

    const [savedTime, savedStack] = await Promise.all([
      StorageService.getJSON<{ hour: number; minute: number } | null>(STORAGE_KEYS.DAILY_REMINDER_TIME),
      StorageService.getJSON<Milestone[]>(STORAGE_KEYS.MILESTONE_STACK)
    ]);

    if (savedTime) setReminderTime(savedTime);

    let completed = 0;
    let total = 0;
    if (savedStack) {
      completed = savedStack.filter(m => m.status === 'COMPLETED').length;
      total = savedStack.length;
    }

    // P-2: parse streak locally – no extra storage round-trip
    const streakData = parseStreakRaw(rawStreak);

    setStats({
      completed,
      total,
      daysActive: Math.max(0, streakData.totalCheckIns),
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak
    });

    setIsLoading(false); // P-4: reveal real UI
  };
  // ────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadData();
    }, [])
  );




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

  // ─── P-5: Export via InteractionManager + compact JSON ──────────────────
  const handleExportData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);

      // Defer the CPU-heavy JSON work until after any pending interactions finish
      InteractionManager.runAfterInteractions(() => {
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

        // P-5: compact stringify – no indentation to avoid UI jank
        const jsonString = JSON.stringify(exportObj);

        Share.share({
          message: jsonString,
          title: 'LockIn Data Export',
        }).catch(() => Alert.alert('Export Failed', 'Unable to export data.'));
      });
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to export data.');
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // ─── P-4: Show skeleton until data is ready ──────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1">
          <ProfileSkeleton />
        </ScrollView>
      </View>
    );
  }
  // ────────────────────────────────────────────────────────────────────────

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

        {/* Stats Grid – P-3: Reanimated controlled panel */}
        <TouchableOpacity
          onPress={toggleStats}
          className="flex-row items-center justify-between border-b-2 border-gray-200 mb-4 py-4"
        >
          <Text className="font-bold text-xs text-black uppercase tracking-widest">Statistics</Text>
          <Ionicons name={isStatsExpanded ? "chevron-up" : "chevron-down"} size={16} color="black" />
        </TouchableOpacity>

        <Animated.View style={animatedStatsStyle}>
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
        </Animated.View>

        {!isStatsExpanded && <View className="mb-4" />}

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
