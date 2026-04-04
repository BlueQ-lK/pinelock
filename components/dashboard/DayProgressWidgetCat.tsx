import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { StorageService } from '../../utils/StorageService';
import { useTheme } from '../../contexts/ThemeContext';

// C-1: Lazy load ScannerSprite
const ScannerSprite = lazy(() => import('./ScannerSprite').then(m => ({ default: m.ScannerSprite })));

function DayProgressWidgetCatComponent() {
    const { theme } = useTheme();
    const router = useRouter();
    // --- State Mapping ---
    // IDLE -> Neutral
    // SEARCHING -> Suspicious
    // MOCKING -> Angry
    // APPROVED -> Happy
    const [scannerState, setScannerState] = useState<'IDLE' | 'ANALYZING' | 'HAPPY' | 'SEARCHING' | 'POINTING' | 'SEALING' | 'TYPING' | 'VALIDATING' | 'WITNESSING'>('IDLE');
    const [interactionText, setInteractionText] = useState<string | null>(null);

    const [timerActive, setTimerActive] = useState(false);
    const [timerMode, setTimerMode] = useState<'open' | 'pomodoro'>('open');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const checkTimer = useCallback(async () => {
        const [savedFocusTime, savedFocusMode] = await StorageService.multiGet(['focusStartTime', 'focusTimerMode']);
        if (savedFocusTime[1]) {
            setStartTime(parseInt(savedFocusTime[1], 10));
            setTimerMode((savedFocusMode[1] || 'open') as 'open' | 'pomodoro');
            setTimerActive(true);
            setScannerState('POINTING');
        } else {
            setTimerActive(false);
            setStartTime(null);
            setScannerState('IDLE');
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkTimer();
        }, [checkTimer])
    );

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (timerActive && startTime) {
            const calcElapsed = () => Math.floor((Date.now() - startTime) / 1000);
            const initial = calcElapsed();
            setElapsedSeconds(timerMode === 'pomodoro' && initial >= 1500 ? 1500 : initial);

            interval = setInterval(() => {
                const elapsed = calcElapsed();
                if (timerMode === 'pomodoro' && elapsed >= 1500) {
                    setElapsedSeconds(1500);
                } else {
                    setElapsedSeconds(elapsed);
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, startTime, timerMode]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePress = useCallback(() => {
        if (timerActive) {
            router.push('/focus-timer');
            return;
        }

        // Debounce if already active
        if (scannerState !== 'IDLE') return;

        // Randomly choose an interaction
        const rand = Math.random();

        if (rand < 0.4) {
            // --- ACTION 1: HAPPY/APPROVED (40%) ---
            setScannerState('HAPPY');
            setInteractionText("YAY!"); // Clear interaction text
            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2000);
        } else if (rand < 0.65) {
            // --- ACTION 2: POINTING (25%) ---
            setScannerState('POINTING');
            setInteractionText("LOOK HERE.");

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2000);
        } else if (rand < 0.85) {
            // --- ACTION 3: SUSPICIOUS (20%) ---
            setScannerState('SEARCHING');
            setInteractionText("EXCUSE ME?");

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2500);
        } else {
            // --- ACTION 4: MOCKING (15%) ---
            setScannerState('WITNESSING');
            setInteractionText("DO YOUR WORK"); // Clear interaction text

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 3000);
        }

    }, [scannerState, timerActive, router]);

    return (
        <View
            className="rounded-[32px] p-6 flex-1 aspect-square items-center justify-center border overflow-hidden"
            style={{ borderColor: theme.border }}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                className="items-center justify-center relative w-full h-full"
            >
                {/* Custom Text Bubble for states other than MOCKING/APPROVED which have built-in calls */}
                {interactionText && !timerActive && (
                    <Animated.View
                        exiting={FadeOut}
                        className="absolute -top-4 z-50 px-4 py-2 rounded-xl mb-4"
                        style={{ backgroundColor: theme.text, pointerEvents: 'none' }}
                    >
                        <Text className="font-bold text-sm tracking-wide" style={{ color: theme.background }}>{interactionText}</Text>
                        <View className="absolute -bottom-1 left-1/2 -ml-1 w-2 h-2 rotate-45" style={{ backgroundColor: theme.text }} />
                    </Animated.View>
                )}

                {/* Active Timer Display */}
                {timerActive && (
                    <Animated.View
                        entering={FadeIn}
                        exiting={FadeOut}
                        className="absolute bottom-0 z-50 items-center pointer-events-none"
                    >
                        <View className="px-3 py-1.5 rounded-full flex-row items-center gap-2" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border, borderWidth: 1 }}>
                            <View className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                            <Text className="font-bold text-sm tracking-widest" style={{ color: theme.text }}>
                                {timerMode === 'pomodoro' ? formatTime(Math.max(0, 1500 - elapsedSeconds)) : formatTime(elapsedSeconds)}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                <View
                    className="items-center justify-center pointer-events-none"
                >
                    <View>
                        {/* Scaled down slightly to fit the widget comfortable */}
                        <Suspense fallback={<View style={{ width: 100, height: 100 }} />}>
                            <ScannerSprite
                                state={scannerState}
                                showLabels={false}
                            />
                        </Suspense>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

export const DayProgressWidgetCat = React.memo(DayProgressWidgetCatComponent);
