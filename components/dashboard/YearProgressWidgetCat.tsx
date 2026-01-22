import { View, Text, TouchableOpacity, Dimensions, AppState } from 'react-native';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
    withDelay
} from 'react-native-reanimated';
import { differenceInDays, endOfYear, startOfYear, addYears, addMonths, addDays, parseISO } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Sweat Drop Particle ---
const SweatDrop = () => {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        translateY.value = withTiming(8, { duration: 600 });
        opacity.value = withTiming(0, { duration: 600 });
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value
    }));

    return (
        <Animated.View style={style} className="absolute -right-1 top-0">
            <Svg width="4" height="6" viewBox="0 0 4 6" fill="#60A5FA">
                <Path d="M2 0C2 0 4 3 4 4.5C4 5.33 3.1 6 2 6C0.9 6 0 5.33 0 4.5C0 3 2 0 2 0Z" />
            </Svg>
        </Animated.View>
    );
};

// --- The Trekker Sprite (Year Long Grind) ---
const TrekkerSprite = ({ running = true, exhausted = false }: { running?: boolean, exhausted?: boolean }) => {
    const bounce = useSharedValue(0);

    // Running Animation
    useEffect(() => {
        if (running && !exhausted) {
            bounce.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 150, easing: Easing.out(Easing.quad) }),
                    withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) })
                ),
                -1,
                true
            );
        } else {
            bounce.value = withTiming(0);
        }
    }, [running, exhausted]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: bounce.value }]
    }));

    return (
        <Animated.View
            style={style}
            className="w-3 h-3 rounded-full bg-black items-center justify-center relative shadow-sm z-10"
        >
            {/* Headband (White Strike) */}
            <View className="absolute top-[2px] w-full h-[2px] bg-red-500/80" />

            {/* Eyes */}
            {exhausted ? (
                // X X Eyes
                <View className="flex-row gap-[2px] mt-[1px]">
                    <Svg width="3" height="3" viewBox="0 0 3 3">
                        <Path d="M0 0 L 3 3 M 3 0 L 0 3" stroke="white" strokeWidth="0.8" />
                    </Svg>
                    <Svg width="3" height="3" viewBox="0 0 3 3">
                        <Path d="M0 0 L 3 3 M 3 0 L 0 3" stroke="white" strokeWidth="0.8" />
                    </Svg>
                </View>
            ) : (
                // Determined > < Eyes
                <View className="flex-row gap-[2px] mt-[1px]">
                    <Svg width="3" height="3" viewBox="0 0 3 3">
                        <Path d="M0 0 L 1.5 1.5 L 0 3" stroke="white" strokeWidth="0.8" fill="none" />
                    </Svg>
                    <Svg width="3" height="3" viewBox="0 0 3 3">
                        <Path d="M3 0 L 1.5 1.5 L 3 3" stroke="white" strokeWidth="0.8" fill="none" />
                    </Svg>
                </View>
            )}
        </Animated.View>
    );
};

export function YearProgressWidgetCat() {
    const [progressData, setProgressData] = useState<{
        start: Date;
        end: Date;
        totalDays: number;
        daysPassed: number;
        daysLeft: number;
        year: number;
        isCustom: boolean;
    } | null>(null);

    const loadProgress = async () => {
        const savedStart = await AsyncStorage.getItem('goalStartDate');
        const unit = await AsyncStorage.getItem('durationUnit');
        const valueStr = await AsyncStorage.getItem('durationValue');
        const value = parseInt(valueStr || '1', 10);

        const now = new Date();
        let start: Date;
        let end: Date;

        if (savedStart && unit && valueStr) {
            start = parseISO(savedStart);
            start.setHours(0, 0, 0, 0);

            if (unit === 'year') {
                end = addYears(start, value);
            } else if (unit === 'months') {
                end = addMonths(start, value);
            } else {
                end = addDays(start, value);
            }
            end.setHours(23, 59, 59, 999);
        } else {
            // Fallback to calendar year if no goal is set
            start = startOfYear(now);
            end = endOfYear(now);
        }

        const totalDays = differenceInDays(end, start) + 1;
        const daysPassed = Math.max(0, differenceInDays(now, start));
        const daysLeft = Math.max(0, differenceInDays(end, now));
        const isCustom = !!(savedStart && unit && valueStr);

        setProgressData({
            start,
            end,
            totalDays,
            daysPassed,
            daysLeft,
            year: start.getFullYear(),
            isCustom
        });
    };

    useEffect(() => {
        loadProgress();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                loadProgress();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Interaction State
    const [isExhausted, setIsExhausted] = useState(false);
    const [showSweat, setShowSweat] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Random Sweat Effect automatically
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setShowSweat(true);
                setTimeout(() => setShowSweat(false), 600);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handlePress = useCallback(() => {
        if (isExhausted) return;

        setIsExhausted(true);
        setShowSweat(true);

        const phrases = ["MY LEGS!", "WATER...", "WHY SO FAR?", "CARRY ME."];
        setMessage(phrases[Math.floor(Math.random() * phrases.length)]);

        setTimeout(() => {
            setIsExhausted(false);
            setShowSweat(false);
            setMessage(null);
        }, 1500);
    }, [isExhausted]);

    if (!progressData) return null;

    const dots = Array.from({ length: progressData.totalDays }, (_, i) => i);

    return (
        <Animated.View
            entering={FadeIn.delay(300)}
            className="bg-gray-50 rounded-[32px] p-8 w-full border border-gray-100"
        >
            <TouchableOpacity activeOpacity={1} onPress={handlePress}>
                <View className="flex-row flex-wrap gap-[6px] justify-center content-start">
                    {dots.map((day) => {
                        if (day < progressData.daysPassed) {
                            return (
                                <View
                                    key={day}
                                    className="w-[6px] h-[6px] rounded-full bg-black opacity-20"
                                />
                            );
                        } else if (day === progressData.daysPassed) {
                            // THE TREKKER
                            // Slightly larger than grid to pop out
                            return (
                                <View key={day} className="w-[6px] h-[6px] items-center justify-center overflow-visible z-50">
                                    <View className="absolute -top-1 -left-1">
                                        <TrekkerSprite exhausted={isExhausted} />
                                        {showSweat && <SweatDrop />}
                                    </View>
                                </View>
                            );
                        } else {
                            return (
                                <View
                                    key={day}
                                    className="w-[6px] h-[6px] rounded-full bg-gray-400 opacity-50"
                                />
                            );
                        }
                    })}
                </View>
            </TouchableOpacity>

            <View className="flex-row justify-between items-end mt-4">
                <Text className="text-gray-400 font-bold text-xs tracking-widest uppercase">
                    {progressData.isCustom ? "GOAL PROGRESS" : `${progressData.year} PROGRESS`}
                </Text>
                <Text className={`font-black text-xl tracking-tighter ${message ? 'text-black' : 'text-swiss-red'}`}>
                    {message || `${progressData.daysLeft} DAYS LEFT`}
                </Text>
            </View>
        </Animated.View>
    );
}
