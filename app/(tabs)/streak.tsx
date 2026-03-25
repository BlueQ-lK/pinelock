import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';
import Svg, { Path, Rect, Defs, Pattern } from 'react-native-svg';
import {
    loadStreakData,
    checkInToday,
    getWeekDates,
    isCheckedInOnDate,
    getTodayStr,
    StreakData
} from '../../utils/streakUtils';

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
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const fetchData = async () => {
        if (!streakData) {
            setIsLoading(true);
        }
        const data = await loadStreakData();
        setStreakData(data);

        const dates = getWeekDates();
        setWeekDates(dates);

        setCheckedInToday(data.lastCheckedIn === getTodayStr());
        setIsLoading(false);
    };

    const isFocused = useIsFocused();
    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused]);

    const handleCheckIn = async () => {
        if (checkedInToday || isLoading) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newData = await checkInToday();
        setStreakData(newData);
        setCheckedInToday(true);
    };
    const todayStr = getTodayStr();
    const startOfWeekDate = weekDates[0] ? format(weekDates[0], 'MMM d') : '-';
    const endOfWeekDate = weekDates[6] ? format(weekDates[6], 'MMM d') : '-';

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {/* Grid Background */}
            <View className="absolute inset-0 w-full h-full opacity-60">
                <Svg width="100%" height="100%">
                    <Defs>
                        <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                        </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#grid)" />
                </Svg>
            </View>

            {isLoading || !streakData ? (
                <StreakSkeleton />
            ) : (
                <>
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                        {/* Header */}
                        <View className="mb-8">
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="font-black text-2xl tracking-tighter">STREAK</Text>
                                    <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase">DAILY DISCIPLINE</Text>
                                </View>
                            </View>
                        </View>

                        {/* Hero Block */}
                        <View className="mb-0">
                            <View className="items-center justify-center relative overflow-hidden min-h-[300px] mb-8 -mx-6 -mt-4">
                                {/* Glow Behind Flame */}
                                <View className="absolute items-center justify-center mb-14">
                                    <View className="absolute w-[300px] h-[300px] rounded-full bg-[#FF3B30]/5 animate-pulse delay-150" />
                                    <View className="absolute w-[260px] h-[260px] rounded-full bg-[#FF3B30]/10 animate-pulse delay-100" />
                                    <View className="absolute w-[220px] h-[220px] rounded-full bg-[#FF3B30]/20 animate-pulse delay-50" />
                                </View>
                                {/* Flame and Streak Text */}
                                <View className="items-center z-10">
                                    <Text style={{ fontSize: 200 }}>🔥</Text>
                                    <Text className="text-black font-black text-[90px] leading-[100px] tracking-tighter">
                                        {streakData.currentStreak}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Week Row */}
                        <View className="mb-6">
                            <View className="flex-row justify-between items-end mb-4 px-2">
                                <Text className="font-bold text-xs text-gray-400 tracking-widest">THIS WEEK</Text>
                                <Text className="font-bold text-xs text-black tracking-widest">{startOfWeekDate} - {endOfWeekDate}</Text>
                            </View>
                            <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                {weekDates.map((date, i) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isToday = dateStr === todayStr;
                                    const isCompleted = isCheckedInOnDate(date, streakData.checkIns);
                                    const dayName = format(date, 'EEEE').charAt(0); // M, T, W, T, F, S, S
                                    const dayDate = format(date, 'd');

                                    return (
                                        <View key={i} className="items-center">
                                            <Text className="text-[10px] font-bold text-gray-400 mb-2">{dayName}</Text>

                                            {isCompleted ? (
                                                <View className="w-10 h-10 rounded-full bg-swiss-red items-center justify-center">
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                </View>
                                            ) : (
                                                <View
                                                    className={`w-10 h-10 rounded-full items-center justify-center ${isToday ? 'border-2 border-black bg-white' : 'bg-gray-200'
                                                        }`}
                                                >
                                                    {isToday ? (
                                                        <View className="w-3 h-3 rounded-full bg-black" />
                                                    ) : (
                                                        <Text className="text-xs font-bold text-gray-400">{dayDate}</Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Additional Stats Row */}
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1 bg-gray-50 p-5 rounded-3xl border border-gray-100 items-center">
                                <Text className="font-black text-3xl">{streakData.longestStreak}</Text>
                                <Text className="text-[10px] font-bold text-gray-400 tracking-widest text-center mt-2">LONGEST STREAK</Text>
                            </View>
                            <View className="flex-1 bg-gray-50 p-5 rounded-3xl border border-gray-100 items-center">
                                <Text className="font-black text-3xl">{streakData.totalCheckIns}</Text>
                                <Text className="text-[10px] font-bold text-gray-400 tracking-widest text-center mt-2">TOTAL CHECK-INS</Text>
                            </View>
                        </View>

                        {/* 30-Day Heatmap */}
                        <View className="mb-10">
                            <Text className="font-bold text-xs text-gray-400 tracking-widest mb-4 px-2">LAST 30 DAYS</Text>
                            <View className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                <View className="flex-row flex-wrap gap-2">
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const date = subDays(new Date(), 29 - i);
                                        const isCompleted = isCheckedInOnDate(date, streakData.checkIns);
                                        return (
                                            <View
                                                key={i}
                                                className={`w-6 h-6 rounded-md ${isCompleted ? 'bg-swiss-red' : 'bg-gray-200'} border border-black/5`}
                                            />
                                        );
                                    })}
                                </View>
                                <View className="flex-row items-center gap-2 mt-4 ml-1">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Missed</Text>
                                    <View className="w-3 h-3 rounded-sm bg-gray-200" />
                                    <View className="w-3 h-3 rounded-sm bg-swiss-red" />
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Locked In</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Check In Button Container */}
                    <View
                        className="absolute bottom-0 left-0 right-0 p-6 bg-white/90"
                        style={{ paddingBottom: 40 }}
                    >
                        <Pressable
                            onPress={handleCheckIn}
                            disabled={checkedInToday}
                            style={({ pressed }) => [
                                { opacity: pressed ? 0.8 : 1 }
                            ]}
                        >
                            <View

                                className={`flex-row items-center justify-center gap-2 p-5 rounded-full ${checkedInToday ? 'bg-black' : 'bg-swiss-red'
                                    }`}
                            >
                                {checkedInToday ? (
                                    <>
                                        <Text className="text-white font-black tracking-widest text-base">DONE</Text>
                                        <Ionicons name="checkmark-circle" size={20} color="white" />
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-white font-black tracking-widest text-base">CHECK IN TODAY</Text>
                                        <Ionicons name="flame" size={20} color="white" />
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
