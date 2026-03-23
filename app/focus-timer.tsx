import { View, Text, TouchableOpacity, AppState, AppStateStatus, Platform, TextInput } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    FadeIn,
    FadeInDown,
    ZoomIn
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { WorkoutSprite } from '../components/dashboard/WorkoutSprite';
import { ScannerSprite } from '../components/dashboard/ScannerSprite';
import { MusicPlayer } from '../components/dashboard/MusicPlayer';
import { BoatingSprite } from '../components/dashboard/BoatingSprite';

type TimerState = 'idle' | 'active' | 'complete';

const MOTIVATIONAL_QUOTES = [
    "Small steps lead to big victories.",
    "Every minute counts. You showed up.",
    "Consistency beats intensity.",
    "You're building something great.",
    "Progress, not perfection.",
    "The grind doesn't lie.",
    "Focus is your superpower.",
    "Winners show up daily.",
    "One session closer to your goal.",
    "Discipline is freedom.",
    "You chose growth today.",
    "This is how champions are made.",
];

type TimerMode = 'open' | 'pomodoro';

export default function FocusTimerScreen() {
    const router = useRouter();
    const [timerMode, setTimerMode] = useState<TimerMode>('open');
    const [sessionNote, setSessionNote] = useState('');
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const [hasSaved, setHasSaved] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [goal, setGoal] = useState('');
    const [quote, setQuote] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const shareCardRef = useRef<ViewShot>(null);

    // Refs for safe background saving on unmount
    const elapsedSecondsRef = useRef(0);
    const sessionNoteRef = useRef('');
    const timerStateRef = useRef<TimerState>('idle');
    const hasSavedRef = useRef(false);

    useEffect(() => {
        elapsedSecondsRef.current = elapsedSeconds;
    }, [elapsedSeconds]);

    useEffect(() => {
        sessionNoteRef.current = sessionNote;
    }, [sessionNote]);

    useEffect(() => {
        timerStateRef.current = timerState;
    }, [timerState]);

    useEffect(() => {
        hasSavedRef.current = hasSaved;
    }, [hasSaved]);

    const loadGoal = async () => {
        const savedGoal = await AsyncStorage.getItem('mainGoal');
        if (savedGoal) setGoal(savedGoal);
    };

    const checkActiveSession = async () => {
        const savedStartTime = await AsyncStorage.getItem('focusStartTime');
        if (savedStartTime) {
            const start = parseInt(savedStartTime, 10);
            const savedMode = await AsyncStorage.getItem('focusTimerMode') as TimerMode | null;
            if (savedMode) setTimerMode(savedMode);
            setStartTime(start);
            setTimerState('active');
            const elapsed = Math.floor((Date.now() - start) / 1000);
            setElapsedSeconds(elapsed);
        }
    };

    const handleEnd = useCallback(async (forcedElapsed?: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        let finalElapsed = forcedElapsed ?? elapsedSeconds;
        if (!forcedElapsed && startTime) {
            finalElapsed = Math.floor((Date.now() - startTime) / 1000);
            if (timerMode === 'pomodoro' && finalElapsed > 1500) finalElapsed = 1500;
        }

        await AsyncStorage.removeItem('focusStartTime');

        setElapsedSeconds(finalElapsed);
        const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setQuote(randomQuote);
        setTimerState('complete');
        setHasSaved(false);
    }, [elapsedSeconds, startTime, timerMode]);

    const saveSession = useCallback(async () => {
        if (timerStateRef.current !== 'complete' || hasSavedRef.current) return;

        setHasSaved(true);
        hasSavedRef.current = true;

        try {
            const savedHistory = await AsyncStorage.getItem('focusSessionHistory');
            const history = savedHistory ? JSON.parse(savedHistory) : [];
            const newSession = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                duration: elapsedSecondsRef.current,
                note: sessionNoteRef.current.trim()
            };
            await AsyncStorage.setItem('focusSessionHistory', JSON.stringify([newSession, ...history]));
            console.log('Session saved successfully');
        } catch (e) {
            console.error('Failed to save session history', e);
        }
    }, []);

    // Handle background saving on unmount (system gesture navigation)
    useEffect(() => {
        return () => {
            saveSession();
        };
    }, [saveSession]);

    useEffect(() => {
        loadGoal();
        checkActiveSession();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (timerState === 'active' && startTime) {
            intervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);

                if (timerMode === 'pomodoro' && elapsed >= 1500) {
                    setElapsedSeconds(1500);
                    handleEnd(1500);
                } else {
                    setElapsedSeconds(elapsed);
                }
            }, 1000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [timerState, startTime, timerMode]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return mins > 0 ? `${mins} min` : `${seconds} sec`;
    };

    const handleStart = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const now = Date.now();
        setStartTime(now);
        setTimerState('active');
        setElapsedSeconds(0);
        await AsyncStorage.setItem('focusStartTime', now.toString());
        await AsyncStorage.setItem('focusTimerMode', timerMode);
    };

    const updateSessionNote = (text: string) => {
        setSessionNote(text);
    };

    const handleShare = async () => {
        try {
            if (shareCardRef.current) {
                const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
                await Sharing.shareAsync(uri);
            }
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    const handleSave = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted' && shareCardRef.current) {
                const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
                await MediaLibrary.saveToLibraryAsync(uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.error('Save failed:', e);
        }
    };

    const handleClose = async () => {
        await saveSession();
        router.back();
    };

    const handleNewSession = async () => {
        await saveSession();
        setStartTime(null);
        setTimerState('idle');
        setElapsedSeconds(0);
        setSessionNote('');
        setHasSaved(false);
    };

    const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                {/* Common Header */}
                <View className="flex-row justify-between items-center px-6 py-4 z-10">
                    <TouchableOpacity onPress={handleClose} className="p-2 -ml-2 bg-white rounded-full">
                        <Ionicons name="close" size={28} color="black" />
                    </TouchableOpacity>
                    {timerState === 'active' || timerState === 'complete' ? (
                        <View className="bg-white px-3 py-1 rounded-full z-10">
                            <Text className="text-black font-bold text-sm tracking-widest">LOCKED IN</Text>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => router.push('/focus-history')} className="bg-white px-3 py-1 rounded-full z-10">
                            <Text className="text-black font-bold text-sm tracking-widest">SESSION LOG</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {(timerState === 'idle' || timerState === 'active') && (
                    <View className='flex-row justify-center items-center z-10'>
                        <MusicPlayer />
                    </View>
                )}

                {/* IDLE STATE (Swiss-Bento Redesign) */}
                {timerState === 'idle' && (
                    <View className="flex-1 px-6 justify-center">
                        <Animated.View entering={FadeInDown.delay(200)}>
                            <View className="mb-12">
                                <View className="flex-row items-center gap-2 bg-black self-start px-3 py-1 rounded-full mb-4">
                                    <View className="w-1.5 h-1.5 rounded-full bg-swiss-red animate-pulse" />
                                    <Text className="text-white font-black text-[10px] tracking-[0.3em] uppercase">READY</Text>
                                </View>
                                <Text className="text-black font-black text-6xl tracking-tighter uppercase leading-[54px] italic">
                                    LOCK IN
                                </Text>
                            </View>
                        </Animated.View>

                        {/* Sprite Bento Card */}
                        <Animated.View entering={FadeInDown.delay(400)}>
                            <View className="bg-gray-50 border-2 border-gray-200 rounded-[40px] p-8 mb-8 items-center relative overflow-hidden">
                                <View className="scale-110">
                                    <ScannerSprite
                                        state={'IDLE'}
                                        items={{ bandana: true }}
                                    />
                                </View>
                            </View>
                        </Animated.View>

                        {/* Pomodoro Toggle */}
                        <Animated.View entering={FadeInDown.delay(300)}>
                            <View className="mb-8 flex-row bg-gray-100 p-1 rounded-full self-start">
                                <TouchableOpacity
                                    onPress={() => setTimerMode('open')}
                                    className={`px-6 py-3 rounded-full ${timerMode === 'open' ? 'bg-white border border-black/5' : ''}`}
                                >
                                    <Text className={`font-bold text-xs ${timerMode === 'open' ? 'text-black' : 'text-gray-400'} tracking-widest uppercase`}>OPEN</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setTimerMode('pomodoro')}
                                    className={`px-6 py-3 rounded-full ${timerMode === 'pomodoro' ? 'bg-white border border-black/5' : ''}`}
                                >
                                    <Text className={`font-bold text-xs ${timerMode === 'pomodoro' ? 'text-black' : 'text-gray-400'} tracking-widest uppercase`}>POMODORO</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* Goal Bento Badge */}
                        {goal && (
                            <Animated.View entering={FadeInDown.delay(500)}>
                                <View className="bg-white border-2 border-gray-100 rounded-[28px] p-6 mb-12 flex-row items-center gap-4">
                                    <View className="w-10 h-10 rounded-full bg-black items-center justify-center">
                                        <Ionicons name="flash" size={20} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-400 font-black text-[10px] tracking-[0.2em] uppercase mb-1">WORKING ON</Text>
                                        <Text className="text-black font-black text-lg uppercase tracking-tight" numberOfLines={1}>{goal}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        )}

                        {/* Start Button */}
                        <Animated.View entering={ZoomIn.delay(600)}>
                            <View className="items-center">
                                <TouchableOpacity
                                    onPress={handleStart}
                                    className="bg-swiss-red w-full h-20 rounded-[24px] flex-row items-center justify-center shadow-xl shadow-swiss-red/20 gap-4 px-12"
                                >
                                    <MaterialCommunityIcons name="power" size={28} color="white" />
                                    <Text className="text-white font-black text-xl tracking-[0.2em] uppercase">START</Text>
                                </TouchableOpacity>
                                <Text className="text-gray-300 font-bold text-[10px] tracking-widest uppercase mt-4">Start your focus session</Text>
                            </View>
                        </Animated.View>
                    </View>
                )}

                {/* ACTIVE STATE */}
                {timerState === 'active' && (
                    <View className="flex-1 justify-center items-center px-8">
                        {/* Timer centered */}
                        <View className="items-center justify-center flex-1">
                            <Animated.View entering={FadeIn}>
                                <Text className="text-black font-black text-8xl tracking-tighter leading-none italic">
                                    {timerMode === 'pomodoro' ? formatTime(Math.max(0, 1500 - elapsedSeconds)) : formatTime(elapsedSeconds)}
                                </Text>
                            </Animated.View>

                            <View className="mt-12">
                                <WorkoutSprite isActive={true} />
                            </View>
                        </View>

                        {goal && (
                            <View
                                className="bg-white border-2 border-gray-100 rounded-[28px] p-6 mb-12 flex-row items-center gap-4"
                            >
                                <View className="w-10 h-10 rounded-full bg-black items-center justify-center">
                                    <Ionicons name="flash" size={20} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-400 font-black text-[10px] tracking-[0.2em] uppercase mb-1">WORKING ON</Text>
                                    <Text className="text-black font-black text-lg uppercase tracking-tight" numberOfLines={1}>{goal}</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => handleEnd()}
                            className="bg-black px-12 py-5 rounded-full mb-8 shadow-lg"
                        >
                            <Text className="text-white font-black tracking-widest">END SESSION</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* COMPLETE STATE (Previous Red Design + New Buttons) */}
                {timerState === 'complete' && (
                    <View className="flex-1 px-6">
                        <Animated.View entering={FadeIn} className="flex-1 justify-center">
                            <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
                                <View className="bg-swiss-red rounded-3xl p-8 items-center shadow-xl shadow-swiss-red/30">
                                    <View className="flex-row items-center gap-2 bg-white/20 self-start px-3 py-1 rounded-full mb-6">
                                        <View className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <Text className="text-white font-black text-[10px] tracking-[0.3em] uppercase">SESSION COMPLETE</Text>
                                    </View>

                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Ionicons name="flame" size={24} color="white" />
                                        <Text className="text-white font-black text-5xl">
                                            {formatDuration(elapsedSeconds)}
                                        </Text>
                                    </View>

                                    {/* Celebration Sprite */}
                                    <View className="mb-6 scale-75">
                                        <ScannerSprite state="APPROVED" />
                                    </View>

                                    {sessionNote.trim().length > 0 && (
                                        <View className="bg-black/20 px-4 py-3 rounded-xl mb-6 w-full items-center">
                                            <Text className="text-white font-bold text-sm text-center">"{sessionNote}"</Text>
                                        </View>
                                    )}

                                    <Text className="text-white font-medium text-lg text-center italic leading-6 mb-6">
                                        "{quote}"
                                    </Text>

                                    <View className="border-t border-white/20 pt-4 w-full items-center">
                                        <Text className="text-white/60 font-bold text-xs">{today}</Text>
                                        <Text className="text-white font-black text-sm tracking-widest mt-1">
                                            LOCKIN26
                                        </Text>
                                    </View>
                                </View>
                            </ViewShot>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200)}>
                            <View className="mt-6 mb-4">
                                <TextInput
                                    value={sessionNote}
                                    onChangeText={updateSessionNote}
                                    placeholder="Add a session note..."
                                    placeholderTextColor="#9CA3AF"
                                    className="bg-gray-100 px-4 py-4 rounded-xl text-black font-bold text-base border border-gray-200"
                                    returnKeyType="done"
                                />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(300)}>
                            <View className="pb-8">
                                <View className="flex-row gap-3 mb-4">
                                    <TouchableOpacity
                                        onPress={handleSave}
                                        className="flex-1 bg-white border-2 border-black py-4 rounded-xl items-center flex-row justify-center gap-2"
                                    >
                                        <Ionicons name="download-outline" size={20} color="black" />
                                        <Text className="text-black font-black text-xs tracking-widest">SAVE</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleShare}
                                        className="flex-1 bg-white border-2 border-black py-4 rounded-xl items-center flex-row justify-center gap-2"
                                    >
                                        <Ionicons name="share-outline" size={20} color="black" />
                                        <Text className="text-black font-black text-xs tracking-widest">SHARE</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={handleNewSession}
                                    className="bg-black py-4 rounded-xl items-center shadow-lg"
                                >
                                    <Text className="text-white font-black tracking-widest uppercase">NEW SESSION</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                )}
                {(timerState === 'idle' || timerState === 'active') && (
                    <View className="absolute top-0 left-0 right-0 items-center" style={{ transform: [{ scaleY: -1 }] }}>
                        <BoatingSprite isBoat={false} />
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}
