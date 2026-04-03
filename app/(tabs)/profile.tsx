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
import { useTheme, themes } from '../../contexts/ThemeContext';

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
  const { theme, themeName, setThemeName } = useTheme();

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
              router.replace('/(onboarding)');
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
      <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
        <ScrollView className="flex-1">
          <ProfileSkeleton />
        </ScrollView>
      </View>
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View className="mb-8 items-center">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: theme.text }}
          >
            <Text className="font-black text-4xl" style={{ color: theme.background }}>
              {userName.charAt(0).toUpperCase() || 'L'}
            </Text>
          </View>

          <TextInput
            value={userName}
            onChangeText={handleNameChange}
            className="font-black text-2xl tracking-tighter text-center"
            placeholder="Your Name"
            placeholderTextColor={theme.textSecondary}
            style={{ color: theme.text }}
          />
        </View>

        {/* Mission Card */}
        <View className="p-6 rounded-2xl mb-8" style={{ backgroundColor: theme.accent }}>
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-[10px] font-bold tracking-widest mb-1" style={{ color: theme.accentForeground, opacity: 0.7 }}>CURRENT GOAL</Text>
              <Text className="font-black text-xl leading-6" style={{ color: theme.accentForeground }}>{goal}</Text>
            </View>
            <Ionicons name="lock-closed" size={20} color={theme.accentForeground} />
          </View>
          <View className="h-px my-4" style={{ backgroundColor: theme.accentForeground, opacity: 0.2 }} />
          <Text className="text-xs italic" style={{ color: theme.accentForeground, opacity: 0.8 }}>"{motivation}"</Text>
        </View>

        {/* Stats Grid – P-3: Reanimated controlled panel */}
        <TouchableOpacity
          onPress={toggleStats}
          className="flex-row items-center justify-between border-b-2 mb-4 py-4"
          style={{ borderBottomColor: theme.border }}
        >
          <Text className="font-bold text-xs uppercase tracking-widest" style={{ color: theme.text }}>Statistics</Text>
          <Ionicons name={isStatsExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.text} />
        </TouchableOpacity>

        <Animated.View style={animatedStatsStyle}>
          <View className="flex-row flex-wrap gap-4 mb-8">
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl">{stats.completed}</Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-wider text-center mt-1">MILESTONES DONE</Text>
            </View>
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl" style={{ color: theme.text }}>{stats.total}</Text>
              <Text className="text-[10px] font-bold tracking-wider text-center mt-1" style={{ color: theme.textSecondary }}>TOTAL MILESTONES</Text>
            </View>
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl" style={{ color: theme.text }}>{stats.daysActive}</Text>
              <Text className="text-[10px] font-bold tracking-wider text-center mt-1" style={{ color: theme.textSecondary }}>DAYS ACTIVE</Text>
            </View>
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl" style={{ color: theme.text }}>{stats.currentStreak}</Text>
              <Text className="text-[10px] font-bold tracking-wider text-center mt-1" style={{ color: theme.textSecondary }}>CURRENT STREAK</Text>
            </View>
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl" style={{ color: theme.text }}>{stats.longestStreak}</Text>
              <Text className="text-[10px] font-bold tracking-wider text-center mt-1" style={{ color: theme.textSecondary }}>LONGEST STREAK</Text>
            </View>
            <View className="w-[47%] p-4 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <Text className="font-black text-2xl" style={{ color: theme.text }}>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</Text>
              <Text className="text-[10px] font-bold tracking-wider text-center mt-1" style={{ color: theme.textSecondary }}>COMPLETION RATE</Text>
            </View>
          </View>
        </Animated.View>

        {!isStatsExpanded && <View className="mb-4" />}

        {/* Appearance Section */}
        <Text className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: theme.textSecondary }}>Appearance</Text>
        <View className="rounded-xl overflow-hidden mb-8 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="p-4">
            <Text className="font-bold text-sm mb-4" style={{ color: theme.text }}>Color Theme</Text>
            <View className="flex-row flex-wrap gap-3">
              {Object.keys(themes).map((tKey) => {
                const isActive = themeName === tKey;
                return (
                  <TouchableOpacity
                    key={tKey}
                    onPress={() => setThemeName(tKey)}
                    className="px-4 py-2 rounded-full border-2 flex-row items-center gap-2"
                    style={{
                      backgroundColor: themes[tKey].surface,
                      borderColor: isActive ? theme.accent : themes[tKey].border
                    }}
                  >
                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: themes[tKey].accent }} />
                    <Text className="font-bold text-xs" style={{ color: themes[tKey].text, textTransform: 'capitalize' }}>
                      {tKey}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <Text className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: theme.textSecondary }}>Preferences</Text>

        <View className="rounded-xl overflow-hidden mb-8 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border }}>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
                <Ionicons name="notifications" size={16} color={theme.text} />
              </View>
              <Text className="font-bold text-sm" style={{ color: theme.text }}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E5E7EB', true: '#000000' }}
            />
          </View>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full items-center justify-center">
                <Ionicons name="time-outline" size={16} color={notificationsEnabled ? theme.text : theme.textSecondary} />
              </View>
              <Text className={`font-medium text-sm`} style={{ color: notificationsEnabled ? theme.text : theme.textSecondary }}>Daily Reminder Time</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className={`font-bold text-sm`} style={{ color: notificationsEnabled ? theme.text : theme.textSecondary }}>
                {formatTime(reminderTime.hour, reminderTime.minute)}
              </Text>
              <Ionicons name="chevron-down" size={16} color={notificationsEnabled ? theme.text : theme.textSecondary} />
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
        <Text className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: theme.textSecondary }}>Data Management</Text>
        <View className="rounded-xl overflow-hidden mb-8 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="download-outline" size={20} color={theme.text} />
              <Text className="font-bold text-sm" style={{ color: theme.text }}>Export My Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: theme.danger }}>Danger Zone</Text>
        <TouchableOpacity
          onPress={handleReset}
          className="flex-row items-center justify-between p-4 rounded-xl border mb-8"
          style={{ backgroundColor: theme.danger + '10', borderColor: theme.danger + '40' }}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
            <Text className="font-bold" style={{ color: theme.danger }}>Reset All Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.danger} />
        </TouchableOpacity>

        {/* About Section */}
        <Text className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: theme.textSecondary }}>About LockIn</Text>
        <View className="rounded-xl overflow-hidden border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border, backgroundColor: theme.surfaceAlt }}>
            <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Version</Text>
            <Text className="font-bold text-sm" style={{ color: theme.text }}>{Constants.expoConfig?.version || '1.0.0'} (BETA)</Text>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://lockin.app/privacy')}
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderBottomColor: theme.border }}
          >
            <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://lockin.app/terms')}
            className="flex-row items-center justify-between p-4 border-b"
            style={{ borderBottomColor: theme.border }}
          >
            <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:hello@lockin.app')}
            className="flex-row items-center justify-between p-4"
          >
            <Text className="font-medium text-sm" style={{ color: theme.textSecondary }}>Contact / Feedback</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}

