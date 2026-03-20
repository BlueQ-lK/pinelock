import { View, Text, TouchableOpacity, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import Svg, { Path, Rect, Defs, Pattern } from 'react-native-svg';
import {
    loadStreakData,
    checkInToday,
    getWeekDates,
    isCheckedInOnDate,
    getTodayStr,
    StreakData
} from '../../utils/streakUtils';
import { YearProgressWidgetCat } from '../../components/dashboard/YearProgressWidgetCat';

export default function Streak() {
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const decorativeSquares = useMemo(() => {
        const gridSize = 40;
        const width = Dimensions.get('window').width;
        const height = 1000; // Large enough for ScrollView content
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        return Array.from({ length: 30 }).map(() => ({
            x: Math.floor(Math.random() * cols) * gridSize,
            y: Math.floor(Math.random() * rows) * gridSize,
            opacity: Math.random() * 0.08 + 0.02 // Keeping them subtle
        }));
    }, []);

    const buttonScale = useSharedValue(1);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }]
    }));

    const fetchData = async () => {
        setIsLoading(true);
        const data = await loadStreakData();
        setStreakData(data);

        const dates = getWeekDates();
        setWeekDates(dates);

        setCheckedInToday(data.lastCheckedIn === getTodayStr());
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const handleCheckIn = async () => {
        if (checkedInToday || isLoading) return;

        buttonScale.value = withSpring(0.9, {}, () => {
            buttonScale.value = withSpring(1);
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newData = await checkInToday();
        setStreakData(newData);
        setCheckedInToday(true);
    };
    if (isLoading || !streakData) {
        return <SafeAreaView className="flex-1 bg-white items-center justify-center" />;
    }

    const todayStr = getTodayStr();
    const startOfWeekDate = weekDates[0] ? format(weekDates[0], 'MMM d') : '-';
    const endOfWeekDate = weekDates[6] ? format(weekDates[6], 'MMM d') : '-';

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Grid Background */}
            <View className="absolute inset-0 w-full h-full opacity-60">
                <Svg width="100%" height="100%">
                    <Defs>
                        <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                        </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#grid)" />
                    {/* Random decorative squares */}
                    {decorativeSquares.map((sq, i) => (
                        <Rect
                            key={i}
                            x={sq.x}
                            y={sq.y}
                            width="40"
                            height="40"
                            fill={`rgba(255,59,48, ${sq.opacity})`}
                        />
                    ))}
                </Svg>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(200).delay(100)} className="mb-8">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="font-black text-2xl tracking-tighter">STREAK</Text>
                            <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase">DAILY DISCIPLINE</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Hero Block */}
                <Animated.View entering={FadeInDown.duration(300).delay(200)} className="mb-0">
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
                </Animated.View>

                {/* Week Row */}
                <Animated.View entering={FadeInDown.duration(300).delay(300)} className="mb-10">
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
                                        <View className="w-10 h-10 rounded-full bg-swiss-red items-center justify-center shadow-sm">
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
                </Animated.View >
            </ScrollView>

            {/* Check In Button Container */}
            <Animated.View
                entering={FadeIn.duration(300).delay(500)}
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
                    <Animated.View
                        style={animatedButtonStyle}
                        className={`flex-row items-center justify-center gap-2 p-5 rounded-full shadow-lg ${checkedInToday ? 'bg-black' : 'bg-swiss-red'
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
                    </Animated.View>
                </Pressable>
            </Animated.View>
        </SafeAreaView>
    );
}
