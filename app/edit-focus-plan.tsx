import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet, Platform, StatusBar } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addYears, addMonths, addDays } from 'date-fns';
import { Milestone, LockedGoal } from '../types';

export default function EditFocusPlanScreen() {
    const router = useRouter();
    const [lockedMilestones, setLockedMilestones] = useState<Milestone[]>([]);
    const [editableMilestones, setEditableMilestones] = useState<Milestone[]>([]);
    const [goal, setGoal] = useState<LockedGoal | null>(null);
    const [loading, setLoading] = useState(true);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateId, setActiveDateId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const savedStack = await AsyncStorage.getItem('milestoneStack');
            if (savedStack) {
                const all: Milestone[] = JSON.parse(savedStack);
                // Sort by order first to ensure correct initial state
                all.sort((a, b) => a.order - b.order);

                const locked = all.filter(m => m.status === 'COMPLETED');
                const editable = all.filter(m => m.status !== 'COMPLETED');

                setLockedMilestones(locked);
                setEditableMilestones(editable);
            }

            // Load Goal for date constraints
            const title = await AsyncStorage.getItem('mainGoal');
            if (title) {
                const motivation = await AsyncStorage.getItem('motivation');
                const unit = await AsyncStorage.getItem('durationUnit');
                const value = await AsyncStorage.getItem('durationValue');
                const startDate = await AsyncStorage.getItem('goalStartDate');

                setGoal({
                    title,
                    motivation: motivation || '',
                    durationUnit: unit as any,
                    durationValue: value ? parseInt(value) : undefined,
                    startDate: startDate || undefined
                });
            }
        } catch (e) {
            console.error('Failed to load milestones', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = ({ data }: { data: Milestone[] }) => {
        // Simply update the data array - preserve original deadlines
        // Users can manually adjust deadlines via date picker if needed
        setEditableMilestones(data);
    };

    const handleTextChange = (id: string, field: 'title' | 'description', text: string) => {
        setEditableMilestones(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: text } : m
        ));
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);

        if (selectedDate && activeDateId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Prevent picking a past date directly
            if (selectedDate < today) return;

            // Prevent picking a date beyond goal duration
            const goalEndDate = (() => {
                if (!goal?.startDate || !goal?.durationValue || !goal?.durationUnit) return undefined;
                const start = new Date(goal.startDate);
                switch (goal.durationUnit) {
                    case 'year': return addYears(start, goal.durationValue);
                    case 'months': return addMonths(start, goal.durationValue);
                    case 'days': return addDays(start, goal.durationValue);
                    default: return undefined;
                }
            })();

            if (goalEndDate && selectedDate > goalEndDate) return;

            const newDateStr = selectedDate.toISOString().split('T')[0];

            // --- NEW: Check for date collision across all milestones ---
            const allMilestones = [...lockedMilestones, ...editableMilestones];
            const collision = allMilestones.find(m => m.id !== activeDateId && m.deadline === newDateStr);

            if (collision) {
                Alert.alert(
                    "COLLISION DETECTED",
                    `Total focus required. You already have a milestone ("${collision.title}") locked for this date.`,
                    [{ text: "UNDERSTOOD" }]
                );
                return;
            }
            // --- END NEW ---

            setEditableMilestones(prev => {
                const index = prev.findIndex(m => m.id === activeDateId);
                if (index === -1) return prev;

                const oldDateStr = prev[index].deadline;

                // Calculate day difference roughly to avoid DST issues
                // Treat strings as UTC to get pure date diff
                const d1 = new Date(oldDateStr);
                const d2 = new Date(newDateStr);
                const diffTime = d2.getTime() - d1.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                // If no change, return
                if (diffDays === 0) return prev;

                const newMilestones = [...prev];

                // 1. Update the target milestone
                newMilestones[index] = { ...newMilestones[index], deadline: newDateStr };

                // 2. Adjust all subsequent milestones by the same number of days
                for (let i = index + 1; i < newMilestones.length; i++) {
                    const currentM = newMilestones[i];
                    const currentD = new Date(currentM.deadline);

                    // Add diffDays
                    currentD.setDate(currentD.getDate() + diffDays);

                    // Safety Check: If shifting back makes it past, clamp to Today (or keep it valid future)
                    // The user said "not past date from today".
                    if (currentD < today) {
                        currentD.setTime(today.getTime());
                    }

                    newMilestones[i] = {
                        ...currentM,
                        deadline: currentD.toISOString().split('T')[0]
                    };
                }

                return newMilestones;
            });
        }
    };

    const handleDatePress = (id: string) => {
        setActiveDateId(id);
        setShowDatePicker(true);
    };

    const handleSave = async () => {
        try {
            // Combine locked + editable
            // We need to re-assign 'order' property based on the final list
            const combined = [...lockedMilestones, ...editableMilestones].map((m, index) => ({
                ...m,
                order: index
            }));

            // Also check status consistency (First non-completed should be ACTIVE, others PENDING)
            // But we should respect if Drag makes a Pending one first.
            let foundActive = false;
            const finalizedStatus = combined.map(m => {
                if (m.status === 'COMPLETED') return m;
                if (!foundActive) {
                    foundActive = true;
                    return { ...m, status: 'ACTIVE' as const };
                }
                return { ...m, status: 'PENDING' as const };
            });

            await AsyncStorage.setItem('milestoneStack', JSON.stringify(finalizedStatus));

            // Update activeMilestone too
            const active = finalizedStatus.find(m => m.status === 'ACTIVE');
            if (active) {
                await AsyncStorage.setItem('activeMilestone', JSON.stringify(active));
            }

            Alert.alert('Plan Updated', 'Your tactical plan has been realigned.');
        } catch (e) {
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    // Render Item for Draggable List
    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Milestone>) => {
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    activeOpacity={1}
                    style={[
                        styles.rowItem,
                        isActive && styles.activeItem
                    ]}
                >
                    <View className="flex-row items-center gap-4">
                        {/* Drag Handle Indicator */}
                        <TouchableOpacity onPressIn={drag} className="p-2 opacity-50">
                            <Ionicons name="menu" size={20} color="#000" />
                        </TouchableOpacity>

                        <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-1">
                                {/* Editable Deadline Badge */}
                                <TouchableOpacity
                                    onPress={() => handleDatePress(item.id)}
                                    className="bg-gray-100 self-start px-2 py-1 rounded text-xs flex-row gap-1 items-center"
                                >
                                    <View className="w-1.5 h-1.5 bg-swiss-red rounded-full" />
                                    <Text className="text-[10px] font-bold text-gray-900 tracking-wide">
                                        {item.deadline}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                value={item.title}
                                onChangeText={(t) => handleTextChange(item.id, 'title', t)}
                                className="font-black text-xl text-black py-0"
                                placeholder="Milestone Title"
                                placeholderTextColor="#999"
                                multiline
                            />
                            {/* Optional Description - Keep it minimal */}
                            {item.description ? (
                                <TextInput
                                    value={item.description}
                                    onChangeText={(t) => handleTextChange(item.id, 'description', t)}
                                    className="text-xs text-gray-500 font-medium mt-1"
                                    placeholder="Add context..."
                                    placeholderTextColor="#CCC"
                                    multiline
                                />
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [handleTextChange, handleDatePress]);

    if (loading) return <View className="flex-1 bg-white" />;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <StatusBar barStyle="dark-content" />
                {/* Header */}
                <View className="px-6 py-4 bg-white flex-row justify-between items-center z-10">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="font-black text-lg tracking-tight">EDIT STRATEGY</Text>
                    <TouchableOpacity onPress={handleSave} className="bg-black px-5 py-2 rounded-full">
                        <Text className="text-white font-bold text-xs tracking-wider">SAVE</Text>
                    </TouchableOpacity>
                </View>

                <DraggableFlatList
                    data={editableMilestones}
                    onDragEnd={handleDragEnd}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListHeaderComponent={
                        <View>
                            {lockedMilestones.length > 0 && (
                                <View className="mb-8">
                                    <Text className="font-black text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-4 ml-1">
                                        LOCKED IN HISTORY
                                    </Text>
                                    <View className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                        {lockedMilestones.map((m, i) => (
                                            <View key={m.id} className={`flex-row items-center gap-3 ${i < lockedMilestones.length - 1 ? 'mb-4 border-b border-gray-100 pb-4' : ''}`}>
                                                <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center">
                                                    <Ionicons name="lock-closed" size={12} color="#999" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-bold text-gray-400 line-through text-md">{m.title}</Text>
                                                    <Text className="text-[10px] text-gray-400 font-bold">{m.deadline}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View className="flex-row items-center mb-6">
                                <View className="w-1 h-4 bg-swiss-red mr-3" />
                                <Text className="font-black text-[10px] text-black tracking-[0.2em] uppercase">
                                    Strategic Timeline
                                </Text>
                            </View>
                        </View>
                    }
                />

                {showDatePicker && (
                    <View className="absolute bottom-0 left-0 right-0 bg-white shadow-2xl rounded-t-[32px] z-50 p-6 border-t border-gray-100 items-center pb-10">
                        <View className="w-full flex-row justify-between items-center mb-4">
                            <Text className="font-black text-lg">Reschedule</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)} className="bg-gray-100 px-4 py-2 rounded-full">
                                <Text className="text-black font-bold text-xs">DONE</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={activeDateId ? new Date(editableMilestones.find(m => m.id === activeDateId)?.deadline || new Date()) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            minimumDate={new Date()}
                            maximumDate={(() => {
                                if (!goal?.startDate || !goal?.durationValue || !goal?.durationUnit) return undefined;
                                const start = new Date(goal.startDate);
                                switch (goal.durationUnit) {
                                    case 'year': return addYears(start, goal.durationValue);
                                    case 'months': return addMonths(start, goal.durationValue);
                                    case 'days': return addDays(start, goal.durationValue);
                                    default: return undefined;
                                }
                            })()}
                            style={Platform.OS === 'ios' ? { width: '100%', height: 160 } : undefined}
                            textColor="black"
                        />
                    </View>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    rowItem: {
        backgroundColor: 'white',
        paddingVertical: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6', // Very light gray border
    },
    activeItem: {
        backgroundColor: 'white',
        borderColor: '#FF3B30', // Swiss Red
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        transform: [{ scale: 1.02 }]
    }
});
