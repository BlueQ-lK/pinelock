import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface SessionHistory {
    id: string;
    date: string;
    duration: number;
    note: string;
}

// ─── FH-2: Fixed item heights for getItemLayout ───────────────────────────
// mb-3 = 12px. Pill row: py-3 (12px top+bottom = 24px) + content ~28px ≈ 64px total with margin.
// With note: adds divider (~1px) + note row (~32px) ≈ 97px total.
const ITEM_BASE_HEIGHT = 64;    // row with no note (px, including mb-3)
const ITEM_NOTE_HEIGHT = 97;    // row with note present
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
            month: 'short',
            day: 'numeric'
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
    // ──────────────────────────────────────────────────────────────────────

    // ─── FH-1: Only animate the first 10 items ────────────────────────────
    const renderItem = useCallback(({ item, index }: { item: SessionHistory; index: number }) => (
        <Animated.View
            entering={index < 10 ? FadeInDown.delay(index * 50) : undefined}
            className="mb-3 px-6 py-3 border-2 rounded-full"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                    <Text className="font-black text-xl tracking-widest uppercase" style={{ color: theme.text }}>{formatDate(item.date)}</Text>
                </View>

                <View className="flex-row items-center gap-4">
                    <Text className="font-black text-2xl tracking-tighter font-mono" style={{ color: theme.text }}>
                        {formatTime(item.duration)}
                    </Text>
                </View>
            </View>
            {item.note ? (
                <View className="border-b" style={{ borderColor: theme.border }} />
            ) : null}
            {item.note ? (
                <View className="px-3 rounded-full mx-auto" style={{ backgroundColor: theme.surfaceAlt }}>
                    <Text className="text-sm font-bold italic" style={{ color: theme.textSecondary }}>
                        {item.note}
                    </Text>
                </View>
            ) : null}
        </Animated.View>
    ), [theme]);
    // ──────────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1">
            {/* ─── FH-3: LinearGradient replaces two large rounded Views ───────
                expo-linear-gradient runs on a single GPU pass with no overdraw,
                eliminating the expensive mask pass of the two rounded Views.   */}
            <LinearGradient
                colors={[theme.blackBackground, theme.accent]}
                locations={[0.42, 0.42]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* ─────────────────────────────────────────────────────────────── */}

            <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4 px-6 py-4 z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: theme.accent }}>
                        <Ionicons name="arrow-back" size={24} color={theme.accentForeground} />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="font-black text-lg tracking-tight" style={{ color: theme.textWhite }}>SESSION LOG</Text>
                    </View>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={theme.text} />
                    </View>
                ) : history.length === 0 ? (
                    <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-10">
                        <Ionicons name="folder-open-outline" size={64} color={theme.surfaceAlt} className="mb-6" />
                        <Text className="font-black text-2xl tracking-tight text-center mb-2 uppercase italic" style={{ color: theme.text }}>NO SESSIONS YET</Text>
                        <Text className="font-bold text-center tracking-wide" style={{ color: theme.textSecondary }}>Complete a focus session to build your history.</Text>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                        getItemLayout={getItemLayout}  // FH-2
                        removeClippedSubviews={true}
                    />
                )}

            </View>
        </View>
    );
}
