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
import { AppearanceTab } from '../../components/profile/appearance';

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

  const [activeTab, setActiveTab] = useState<string | null>(null);

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

  // ─── P-3: Detail View Header ──────────────────────────────────────────
  const SubHeader = ({ title }: { title: string }) => (
    <View className="flex-row items-center gap-4 mb-10">
      <TouchableOpacity
        onPress={() => setActiveTab(null)}
        className="w-12 h-12 rounded-2xl items-center justify-center border"
        style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
      >
        <Ionicons name="chevron-back" size={20} color={theme.text} />
      </TouchableOpacity>
      <View>
        <Text className="font-black text-2xl tracking-tighter uppercase" style={{ color: theme.text }}>{title}</Text>
        <Text className="font-bold text-[10px] tracking-[0.2em] opacity-60" style={{ color: theme.textSecondary }}>CONFIGURATION SECTOR</Text>
      </View>
    </View>
  );
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

  const renderContent = () => {
    if (activeTab === 'statistics') {
      return (
        <View className="flex-1">
          <SubHeader title="STATISTICS" />

          <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60" style={{ color: theme.text }}>OVERVIEW</Text>
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 p-6 rounded-[32px] items-center border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              <Text className="font-black text-3xl mb-1 tracking-tighter" style={{ color: theme.text }}>{stats.completed}</Text>
              <Text className="text-[10px] font-bold opacity-60 text-center tracking-widest uppercase" style={{ color: theme.text }}>Milestones</Text>
              <View className="mt-4 p-2 rounded-xl" style={{ backgroundColor: theme.surface }}>
                <Ionicons name="medal-outline" size={16} color={theme.accent} />
              </View>
            </View>
            <View className="flex-1 p-6 rounded-[32px] items-center border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              <Text className="font-black text-3xl mb-1 tracking-tighter" style={{ color: theme.text }}>{stats.daysActive}</Text>
              <Text className="text-[10px] font-bold opacity-60 text-center tracking-widest uppercase" style={{ color: theme.text }}>Days Active</Text>
              <View className="mt-4 p-2 rounded-xl" style={{ backgroundColor: theme.surface }}>
                <Ionicons name="calendar-outline" size={16} color={theme.accent} />
              </View>
            </View>
          </View>

          <View className="flex-row gap-4 mb-8">
            <View className="flex-1 p-6 rounded-[32px] items-center border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              <Text className="font-black text-3xl mb-1 tracking-tighter" style={{ color: theme.text }}>{stats.currentStreak}</Text>
              <Text className="text-[10px] font-bold opacity-60 text-center tracking-widest uppercase" style={{ color: theme.text }}>Streak</Text>
              <View className="mt-4 p-2 rounded-xl" style={{ backgroundColor: theme.surface }}>
                <Ionicons name="flame-outline" size={16} color={theme.accent} />
              </View>
            </View>
            <View className="flex-1 p-6 rounded-[32px] items-center border" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              <Text className="font-black text-3xl mb-1 tracking-tighter" style={{ color: theme.text }}>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</Text>
              <Text className="text-[10px] font-bold opacity-60 text-center tracking-widest uppercase" style={{ color: theme.text }}>Rate</Text>
              <View className="mt-4 p-2 rounded-xl" style={{ backgroundColor: theme.surface }}>
                <Ionicons name="trending-up-outline" size={16} color={theme.accent} />
              </View>
            </View>
          </View>

          <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60" style={{ color: theme.text }}>ENGAGEMENT</Text>
          <View className="p-6 rounded-[32px] border flex-row justify-between items-center mb-4" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: theme.surface }}>
                <Ionicons name="time-outline" size={24} color={theme.accent} />
              </View>
              <View>
                <Text className="font-black text-lg tracking-tight" style={{ color: theme.text }}>READ DURATION</Text>
                <Text className="text-[10px] font-bold opacity-60 tracking-widest uppercase" style={{ color: theme.textSecondary }}>0 MINUTES TOTAL</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (activeTab === 'appearance') {
      return (
        <View className="flex-1">
          <SubHeader title="APPEARANCE" />
          <AppearanceTab />
        </View>
      );
    }

    if (activeTab === 'data') {
      return (
        <View className="flex-1">
          <SubHeader title="Data and storage" />
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row items-center justify-between p-5 rounded-3xl mb-4"
            style={{ backgroundColor: theme.surfaceAlt }}
          >
            <View className="flex-row items-center gap-4">
              <Ionicons name="download-outline" size={24} color={theme.text} />
              <Text className="font-bold text-lg" style={{ color: theme.text }}>Export My Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'security') {
      return (
        <View className="flex-1">
          <SubHeader title="Security and privacy" />

          <Text className="font-bold text-xs uppercase tracking-widest mb-4 opacity-50" style={{ color: theme.text }}>Notifications</Text>
          <View className="rounded-3xl overflow-hidden mb-8" style={{ backgroundColor: theme.surfaceAlt }}>
            <View className="flex-row items-center justify-between p-5 border-b" style={{ borderBottomColor: theme.border }}>
              <View className="flex-row items-center gap-4">
                <Ionicons name="notifications-outline" size={24} color={theme.text} />
                <Text className="font-bold text-lg" style={{ color: theme.text }}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E7EB', true: theme.accent }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-4">
                <Ionicons name="time-outline" size={24} color={notificationsEnabled ? theme.text : theme.textSecondary} />
                <Text className="font-bold text-lg" style={{ color: notificationsEnabled ? theme.text : theme.textSecondary }}>Reminder Time</Text>
              </View>
              <Text className="font-black text-lg" style={{ color: notificationsEnabled ? theme.accent : theme.textSecondary }}>
                {formatTime(reminderTime.hour, reminderTime.minute)}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="font-bold text-xs uppercase tracking-widest mb-4 opacity-50" style={{ color: theme.danger }}>Danger Zone</Text>
          <TouchableOpacity
            onPress={handleReset}
            className="flex-row items-center justify-between p-5 rounded-3xl"
            style={{ backgroundColor: theme.danger + '15' }}
          >
            <View className="flex-row items-center gap-4">
              <Ionicons name="trash-outline" size={24} color={theme.danger} />
              <Text className="font-bold text-lg" style={{ color: theme.danger }}>Reset All Data</Text>
            </View>
            <Ionicons name="warning-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'about') {
      return (
        <View className="flex-1">
          <SubHeader title="About" />
          <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: theme.surfaceAlt }}>
            <View className="p-5 border-b flex-row justify-between items-center" style={{ borderBottomColor: theme.border }}>
              <Text className="font-bold text-lg" style={{ color: theme.text }}>Version</Text>
              <Text className="font-black text-lg" style={{ color: theme.accent }}>{Constants.expoConfig?.version || '1.0.0'}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL('https://lockin.app/privacy')} className="p-5 border-b flex-row justify-between items-center" style={{ borderBottomColor: theme.border }}>
              <Text className="font-medium text-lg" style={{ color: theme.text }}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://lockin.app/terms')} className="p-5 border-b flex-row justify-between items-center" style={{ borderBottomColor: theme.border }}>
              <Text className="font-medium text-lg" style={{ color: theme.text }}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:hello@lockin.app')} className="p-5 flex-row justify-between items-center">
              <Text className="font-medium text-lg" style={{ color: theme.text }}>Contact / Feedback</Text>
              <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1">
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <Text className="font-black text-2xl tracking-tighter uppercase" style={{ color: theme.text }}>{userName || 'USER'}</Text>
            <Text className="font-bold text-[10px] tracking-[0.2em]" style={{ color: theme.textSecondary }}>OPERATOR PROFILE</Text>
          </View>
          <TouchableOpacity
            className="w-14 h-14 rounded-full items-center justify-center overflow-hidden border-2"
            style={{ backgroundColor: theme.text, borderColor: theme.accent }}
          >
            <Text className="font-black text-2xl" style={{ color: theme.background }}>
              {userName.charAt(0).toUpperCase() || 'L'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Motivation Card Styled Version */}
        <View className="rounded-[32px] p-8 mb-8 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              <Text className="font-bold text-[10px] tracking-widest uppercase" style={{ color: theme.textSecondary }}>Active Commitment</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={theme.text} />
          </View>

          <Text className="font-black text-3xl leading-9 mb-8 tracking-tighter" style={{ color: theme.text }}>
            {goal || 'SET YOUR GOAL'}
          </Text>

          <View className="flex-row items-start gap-4">
            <View className="w-[2px] h-10 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.3 }} />
            <View className="flex-1">
              <Text className="font-bold text-[10px] tracking-widest mb-1 uppercase" style={{ color: theme.textSecondary }}>THE PLEDGE</Text>
              <Text className="font-medium text-sm leading-6 opacity-70" style={{ color: theme.text }}>
                {motivation || 'Your motivation will appear here...'}
              </Text>
            </View>
          </View>
        </View>

        <Text className="font-bold text-xs tracking-widest mb-4 ml-2 opacity-60" style={{ color: theme.textSecondary }}>PREFERENCES</Text>

        {/* Vertical Tabs / Menu Items - matching War Path Summary Widget */}
        <View className="gap-3">
          {[
            { id: 'appearance', label: 'APPEARANCE', icon: 'color-palette-outline' },
            { id: 'data', label: 'DATA & STORAGE', icon: 'server-outline' },
            { id: 'security', label: 'SECURITY & PRIVACY', icon: 'shield-checkmark-outline' },
            { id: 'statistics', label: 'STATISTICS', icon: 'stats-chart-outline' },
            { id: 'about', label: 'ABOUT LOCKIN', icon: 'information-circle-outline' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveTab(item.id)}
              className="p-5 rounded-2xl border flex-row justify-between items-center"
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
                  <Ionicons name={item.icon as any} size={22} color={theme.accent} />
                </View>
                <View>
                  <Text className="font-black text-lg tracking-tighter" style={{ color: theme.text }}>{item.label}</Text>
                  <Text className="text-[10px] font-bold opacity-50 tracking-widest" style={{ color: theme.textSecondary }}>MANAGE SECTION</Text>
                </View>
              </View>
              <View className="p-2 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                <Ionicons name="chevron-forward" size={18} color={theme.text} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {renderContent()}

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
      </ScrollView>
    </View>
  );
}

