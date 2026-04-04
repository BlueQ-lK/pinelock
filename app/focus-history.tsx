import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface SessionHistory {
    id: string;
    date: string;
    duration: number;
    note: string;
}

// ─── FH-2: Updated item heights for new Mission Control style ───────────
const ITEM_BASE_HEIGHT = 140;    // row with no note (px, including mb-4)
const ITEM_NOTE_HEIGHT = 200;    // row with note present (px, including mb-4)
// ─────────────────────────────────────────────────────────────────────────────

export default function FocusHistoryScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const [history, setHistory] = useState<SessionHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('focusSessionHistory');
                if (savedHistory) {
                    setHistory(JSON.parse(savedHistory));
                }
            } catch (e) {
                console.error('Failed to load session history', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase();
    };

    // ─── FH-2: Precompute per-item offsets once when history changes ──────
    const itemLayout = useMemo(() => {
        const offsets: number[] = [];
        let offset = 0;
        for (const item of history) {
            offsets.push(offset);
            offset += item.note ? ITEM_NOTE_HEIGHT : ITEM_BASE_HEIGHT;
        }
        return offsets;
    }, [history]);

    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: history[index]?.note ? ITEM_NOTE_HEIGHT : ITEM_BASE_HEIGHT,
            offset: itemLayout[index] ?? 0,
            index,
        }),
        [history, itemLayout]
    );

    const renderItem = useCallback(({ item, index }: { item: SessionHistory; index: number }) => (
        <Animated.View
            entering={index < 10 ? FadeInDown.delay(index * 50) : undefined}
            className="mb-4 p-6 rounded-[32px] border"
            style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
            }}
        >
            <View className="mb-4">
                <Text className="font-bold text-[10px] tracking-[0.2em] uppercase opacity-50 mb-1" style={{ color: theme.textSecondary }}>Mission Date</Text>
                <Text className="font-black text-xs" style={{ color: theme.text }}>{formatDate(item.date)}</Text>
            </View>

            <View className="flex-row justify-between items-end">
                <View>
                    <Text className="font-bold text-[10px] tracking-[0.2em] uppercase opacity-50 mb-1" style={{ color: theme.textSecondary }}>Focus Duration</Text>
                    <Text className="font-black text-4xl tracking-tighter" style={{ color: theme.accent, fontFamily: 'monospace' }}>
                        {formatTime(item.duration)}
                    </Text>
                </View>

                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
                    <Ionicons name="flash-outline" size={20} color={theme.accent} />
                </View>
            </View>

            {item.note && (
                <View className="mt-4 p-4 rounded-2xl border-l-4" style={{ backgroundColor: theme.surfaceAlt, borderLeftColor: theme.accent }}>
                    <Text className="font-bold text-[10px] tracking-widest opacity-50 mb-1 uppercase" style={{ color: theme.textSecondary }}>Mission Intel</Text>
                    <Text className="text-sm font-medium leading-5 italic" style={{ color: theme.text }}>
                        "{item.note}"
                    </Text>
                </View>
            )}
        </Animated.View>
    ), [theme]);

    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header Area with Accent Background */}
            <View
                className="p-8 pb-12 rounded-b-[48px] shadow-lg mb-4 flex-row items-start gap-4"
                style={{ backgroundColor: theme.accent, paddingTop: insets.top + 20 }}
            >
                <View className=" flex-row gap-4 items-center z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: theme.text }}>
                        <Ionicons name="arrow-back" size={24} color={theme.background} />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="font-black text-lg tracking-tight" style={{ color: theme.accentForeground }}>FOCUS LOG</Text>
                    </View>
                    <View />
                </View>
            </View>



            {/* List Content */}
            <View className="flex-1 px-5">
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                ) : history.length === 0 ? (
                    <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-10">
                        <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: theme.surfaceAlt }}>
                            <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} />
                        </View>
                        <Text className="font-black text-2xl tracking-tighter text-center mb-2 uppercase" style={{ color: theme.text }}>NO MISSIONS YET</Text>
                        <Text className="font-bold text-center tracking-wide opacity-50" style={{ color: theme.textSecondary }}>Complete a focus session to build your history.</Text>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                        showsVerticalScrollIndicator={false}
                        getItemLayout={getItemLayout}
                        removeClippedSubviews={true}
                    />
                )}
            </View>
        </View>
    );
}

