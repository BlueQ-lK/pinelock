import { View, Text, TouchableOpacity, FlatList, Alert, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Milestone } from '../types';

export default function ArchivedMilestonesScreen() {
    const router = useRouter();
    const [archivedMilestones, setArchivedMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const savedStack = await AsyncStorage.getItem('milestoneStack');
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
                            const savedStack = await AsyncStorage.getItem('milestoneStack');
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

                                await AsyncStorage.setItem('milestoneStack', JSON.stringify(all));
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
        <View className="bg-gray-50 p-4 rounded-2xl mb-3 border border-gray-100 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
                <Text className="font-bold  text-xs mb-1 uppercase tracking-wider">{item.deadline}</Text>
                <Text className="font-bold text-black text-lg">{item.title}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleRestore(item.id)}
                className="bg-white p-2 rounded-full border border-gray-200 shadow-sm"
            >
                <Ionicons name="refresh" size={20} color="black" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-6 py-4 bg-white flex-row gap-4 items-center z-10 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-swiss-black rounded-full">
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="font-black text-lg tracking-tight">ARCHIVES</Text>
                <View className="w-10" />
            </View>

            <FlatList
                data={archivedMilestones}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View className="items-center justify-center mt-20 opacity-50">
                        <Ionicons name="documents-outline" size={48} color="#ccc" />
                        <Text className="text-gray-400 font-bold mt-4 text-center">No archived milestones found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
