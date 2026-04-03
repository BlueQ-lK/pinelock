import { View, Text, TouchableOpacity, FlatList, Alert, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../utils/StorageService';
import { Ionicons } from '@expo/vector-icons';
import { Milestone } from '../types';
import { useTheme } from '../contexts/ThemeContext';

export default function ArchivedMilestonesScreen() {
    const { theme, themeName } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [archivedMilestones, setArchivedMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const savedStack = await StorageService.getItem('milestoneStack');
            if (savedStack) {
                const all: Milestone[] = JSON.parse(savedStack);
                // Filter only archived
                const archived = all.filter(m => m.isArchived);
                setArchivedMilestones(archived.sort((a, b) => a.order - b.order));
            }
        } catch (e) {
            console.error('Failed to load archived milestones', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        Alert.alert(
            "Restore Milestone",
            "This milestone will be moved back to your active focus plan.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Restore",
                    onPress: async () => {
                        try {
                            const savedStack = await StorageService.getItem('milestoneStack');
                            if (savedStack) {
                                let all: Milestone[] = JSON.parse(savedStack);
                                all = all.map(m => {
                                    if (m.id === id) {
                                        // Remove isArchived flag
                                        const { isArchived, ...rest } = m;
                                        return { ...rest, status: 'PENDING' }; // Reset to PENDING if restored
                                    }
                                    return m;
                                });

                                await StorageService.setItem('milestoneStack', JSON.stringify(all));
                                loadData(); // Reload to refresh list
                            }
                        } catch (e) {
                            Alert.alert("Error", "Failed to restore milestone");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Milestone }) => (
        <View className="p-4 rounded-2xl mb-3 border flex-row items-center justify-between" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <View className="flex-1 mr-4">
                <Text className="font-bold text-xs mb-1 uppercase tracking-wider" style={{ color: theme.textSecondary }}>{item.deadline}</Text>
                <Text className="font-bold text-lg" style={{ color: theme.text }}>{item.title}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleRestore(item.id)}
                className="p-2 rounded-full border shadow-sm"
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
            >
                <Ionicons name="refresh" size={20} color={theme.text} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }} className="flex-1">
            <StatusBar barStyle={themeName === 'dark' || themeName === 'catppuccin' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View className="px-6 py-4 flex-row gap-4 items-center z-10 border-b" style={{ backgroundColor: theme.background, borderBottomColor: theme.border }}>
                <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: theme.text }}>
                    <Ionicons name="arrow-back" size={24} color={theme.background} />
                </TouchableOpacity>
                <Text className="font-black text-lg tracking-tight" style={{ color: theme.text }}>ARCHIVES</Text>
                <View className="w-10" />
            </View>

            <FlatList
                data={archivedMilestones}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View className="items-center justify-center mt-20 opacity-50">
                        <Ionicons name="documents-outline" size={48} color={theme.textSecondary} />
                        <Text className="font-bold mt-4 text-center" style={{ color: theme.textSecondary }}>No archived milestones found</Text>
                    </View>
                }
            />
        </View>
    );
}
