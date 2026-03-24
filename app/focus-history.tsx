import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface SessionHistory {
    id: string;
    date: string;
    duration: number;
    note: string;
}

export default function FocusHistoryScreen() {
    const router = useRouter();
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

    const renderItem = ({ item, index }: { item: SessionHistory; index: number }) => (
        <Animated.View
            entering={FadeInDown.delay(Math.min(index * 50, 500))}
            className="mb-3 px-6 py-3 bg-white border-2 border-zinc-300 rounded-full"
        >
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                    <Text className="text-black font-black text-xl tracking-widest uppercase">{formatDate(item.date)}</Text>
                </View>

                <View className="flex-row items-center gap-4">
                    <Text className="text-black font-black text-2xl tracking-tighter font-mono">
                        {formatTime(item.duration)}
                    </Text>
                </View>
            </View>
            {item.note ? (
                <View className="border-b border-zinc-300" />
            ) : null}
            {item.note ? (
                <View className="bg-gray-50 px-3 rounded-full mx-auto">
                    <Text
                        className="text-black text-sm font-bold italic"
                    >
                        {item.note}
                    </Text>
                </View>
            ) : null}
        </Animated.View>
    );

    return (
        <View className="flex-1">
            <View className="bg-swiss-black absolute w-full h-2/4 rounded-b-full " />
            <View className="bg-swiss-red absolute w-full h-2/4 bottom-0 rounded-t-full" />
            <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4 px-6 py-4 z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 bg-swiss-red rounded-full">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="font-black text-lg tracking-tight text-white">SESSION LOG</Text>
                    </View>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="black" />
                    </View>
                ) : history.length === 0 ? (
                    <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-10">
                        <Ionicons name="folder-open-outline" size={64} color="#F3F4F6" className="mb-6" />
                        <Text className="text-black font-black text-2xl tracking-tight text-center mb-2 uppercase italic">NO SESSIONS YET</Text>
                        <Text className="text-gray-400 font-bold text-center tracking-wide">Complete a focus session to build your history.</Text>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}

            </View>
        </View>
    );
}
