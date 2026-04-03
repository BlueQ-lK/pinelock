import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';
import Svg, { Path, Rect, Defs, Pattern } from 'react-native-svg';
import {
    loadStreakData,
    checkInToday,
    getWeekDates,
    getTodayStr,
    StreakData
} from '../../utils/streakUtils';
import { useTheme } from '../../contexts/ThemeContext';

const GridBackground = React.memo(() => (
    <View className="absolute inset-0 w-full h-full opacity-60" pointerEvents="none">
        <Svg width="100%" height="100%">
            <Defs>
                <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
    </View>
));

const PulseRings = React.memo(() => {
    const opacity = useSharedValue(0.2);
    const { theme } = useTheme();
    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);
    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={animatedStyle} className="absolute items-center justify-center mb-14">
            <View className="absolute w-[300px] h-[300px] rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.05 }} />
            <View className="absolute w-[260px] h-[260px] rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.1 }} />
            <View className="absolute w-[220px] h-[220px] rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.2 }} />
        </Animated.View>
    );
});

const StreakSkeleton = () => (
    <>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
            {/* Header */}
            <View className="mb-8">
                <View className="w-40 h-8 bg-gray-100 rounded-lg mb-2 animate-pulse" />
                <View className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
            </View>

            {/* Hero Block */}
            <View className="mb-0">
                <View className="items-center justify-center relative min-h-[300px] mb-8 -mx-6 -mt-4">
                    <View className="w-[200px] h-[200px] rounded-full bg-gray-100 animate-pulse" />
                </View>
            </View>

            {/* Week Row */}
            <View className="mb-10">
                <View className="flex-row justify-between items-end mb-4 px-2">
                    <View className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                    <View className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
                </View>
                <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <View key={i} className="items-center">
                            <View className="w-4 h-3 bg-gray-200 rounded mb-2 animate-pulse" />
                            <View className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
        {/* Check In Button Container Skeleton */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-white/90" style={{ paddingBottom: 40 }}>
            <View className="h-16 bg-gray-100 rounded-full animate-pulse" />
        </View>
    </>
);

export default function Streak() {
    const { theme } = useTheme();
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const insets = useSafeAreaInsets();

    const { heatmapSquares, completedSet } = useMemo(() => {
        const set = new Set(streakData?.checkIns || []);
        const today = new Date();
        const squares = Array.from({ length: 30 }).map((_, i) => {
            const date = subDays(today, 29 - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            return {
                id: i,
                isCompleted: set.has(dateStr)
            };
        });
        return { heatmapSquares: squares, completedSet: set };
    }, [streakData]);

    const displayWeekDates = useMemo(() => {
        const todayStrFn = getTodayStr();
        return weekDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            return {
                dateStr,
                isToday: dateStr === todayStrFn,
                isCompleted: completedSet.has(dateStr),
                dayName: format(date, 'EEEE').charAt(0),
                dayDate: format(date, 'd')
            };
        });
    }, [weekDates, completedSet]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const fetch = async () => {
                const data = await loadStreakData();
                if (isActive) {
                    setStreakData(data);
                    setWeekDates(getWeekDates());
                    setCheckedInToday(data.lastCheckedIn === getTodayStr());
                }
            };
            fetch();
            return () => { isActive = false; };
        }, [])
    );

    const handleCheckIn = async () => {
        if (checkedInToday || isCheckingIn) return;

        setIsCheckingIn(true);
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const newData = await checkInToday();
            setStreakData(newData);
            setCheckedInToday(true);
        } finally {
            setIsCheckingIn(false);
        }
    };
    const startOfWeekDate = weekDates[0] ? format(weekDates[0], 'MMM d') : '-';
    const endOfWeekDate = weekDates[6] ? format(weekDates[6], 'MMM d') : '-';

    return (
        <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }}>
            {/* Grid Background */}
            <GridBackground />

            {!streakData ? (
                <StreakSkeleton />
            ) : (
                <>
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                        {/* Header */}
                        <View className="mb-8">
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="font-black text-2xl tracking-tighter" style={{ color: theme.text }}>STREAK</Text>
                                    <Text className="font-bold text-[10px] tracking-[0.2em] uppercase" style={{ color: theme.textSecondary }}>DAILY DISCIPLINE</Text>
                                </View>
                            </View>
                        </View>

                        {/* Hero Block */}
                        <View className="mb-0">
                            <View className="items-center justify-center relative overflow-hidden min-h-[300px] mb-8 -mx-6 -mt-4">
                                {/* Glow Behind Flame */}
                                <PulseRings />
                                {/* Flame and Streak Text */}
                                <View className="items-center z-10">
                                    <Text style={{ fontSize: 200 }}>🔥</Text>
                                    <Text className="font-black text-[90px] leading-[100px] tracking-tighter" style={{ color: theme.text }}>
                                        {streakData.currentStreak}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Week Row */}
                        <View className="mb-6">
                            <View className="flex-row justify-between items-end mb-4 px-2">
                                <Text className="font-bold text-xs tracking-widest" style={{ color: theme.textSecondary }}>THIS WEEK</Text>
                                <Text className="font-bold text-xs tracking-widest" style={{ color: theme.text }}>{startOfWeekDate} - {endOfWeekDate}</Text>
                            </View>
                            <View className="flex-row justify-between items-center p-4 rounded-3xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                {displayWeekDates.map((item, i) => (
                                    <View key={i} className="items-center">
                                        <Text className="text-[10px] font-bold mb-2" style={{ color: theme.textSecondary }}>{item.dayName}</Text>

                                        {item.isCompleted ? (
                                            <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: theme.accent }}>
                                                <Ionicons name="checkmark" size={16} color={theme.accentForeground} />
                                            </View>
                                        ) : (
                                            <View
                                                className={`w-10 h-10 rounded-full items-center justify-center`}
                                                style={item.isToday ? { backgroundColor: theme.surface, borderColor: theme.text, borderWidth: 2 } : { backgroundColor: theme.surfaceVariant }}
                                            >
                                                {item.isToday ? (
                                                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.text }} />
                                                ) : (
                                                    <Text className="text-xs font-bold" style={{ color: theme.textSecondary }}>{item.dayDate}</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Additional Stats Row */}
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1 p-5 rounded-3xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                <Text className="font-black text-3xl" style={{ color: theme.text }}>{streakData.longestStreak}</Text>
                                <Text className="text-[10px] font-bold tracking-widest text-center mt-2" style={{ color: theme.textSecondary }}>LONGEST STREAK</Text>
                            </View>
                            <View className="flex-1 p-5 rounded-3xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                <Text className="font-black text-3xl" style={{ color: theme.text }}>{streakData.totalCheckIns}</Text>
                                <Text className="text-[10px] font-bold tracking-widest text-center mt-2" style={{ color: theme.textSecondary }}>TOTAL CHECK-INS</Text>
                            </View>
                        </View>

                        {/* 30-Day Heatmap */}
                        <View className="mb-10">
                            <Text className="font-bold text-xs tracking-widest mb-4 px-2" style={{ color: theme.textSecondary }}>LAST 30 DAYS</Text>
                            <View className="p-5 rounded-3xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                <View className="flex-row flex-wrap gap-2">
                                    {heatmapSquares.map((sq) => (
                                        <View
                                            key={sq.id}
                                            className="w-6 h-6 rounded-md border"
                                            style={{ backgroundColor: sq.isCompleted ? theme.accent : theme.surfaceAlt, borderColor: 'rgba(0,0,0,0.05)' }}
                                        />
                                    ))}
                                </View>
                                <View className="flex-row items-center gap-2 mt-4 ml-1">
                                    <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSecondary }}>Missed</Text>
                                    <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.surfaceAlt }} />
                                    <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme.accent }} />
                                    <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSecondary }}>Locked In</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Check In Button Container */}
                    <View
                        className="absolute bottom-0 left-0 right-0 p-6"
                        style={{ paddingBottom: 40, backgroundColor: theme.background + 'e6' }}
                    >
                        <Pressable
                            onPress={handleCheckIn}
                            disabled={checkedInToday || isCheckingIn}
                            style={({ pressed }) => [
                                { opacity: pressed ? 0.8 : 1 }
                            ]}
                        >
                            <View
                                className="flex-row items-center justify-center gap-2 p-5 rounded-full"
                                style={{ backgroundColor: checkedInToday ? theme.blackBackground : theme.accent }}
                            >
                                {checkedInToday ? (
                                    <>
                                        <Text className="font-black tracking-widest text-base" style={{ color: theme.textAlt }}>DONE</Text>
                                        <Ionicons name="checkmark-circle" size={20} color={theme.textAlt} />
                                    </>
                                ) : (
                                    <>
                                        <Text className="font-black tracking-widest text-base" style={{ color: theme.accentForeground }}>CHECK IN TODAY</Text>
                                        <Ionicons name="flame" size={20} color={theme.accentForeground} />
                                    </>
                                )}
                            </View>
                        </Pressable>
                    </View>
                </>
            )}
        </View>
    );
}
