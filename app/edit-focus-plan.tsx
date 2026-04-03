import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../utils/StorageService';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addYears, addMonths, addDays } from 'date-fns';
import { Milestone, LockedGoal } from '../types';
import { useTheme } from '../contexts/ThemeContext';

let cachedLocked: Milestone[] | null = null;
let cachedEditable: Milestone[] | null = null;
let cachedArchived: Milestone[] | null = null;
let cachedGoal: LockedGoal | null = null;

export default function EditFocusPlanScreen() {
    const { theme, themeName } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [lockedMilestones, setLockedMilestones] = useState<Milestone[]>(cachedLocked || []);
    const [editableMilestones, setEditableMilestones] = useState<Milestone[]>(cachedEditable || []);
    const [archivedMilestones, setArchivedMilestones] = useState<Milestone[]>(cachedArchived || []);
    const [goal, setGoal] = useState<LockedGoal | null>(cachedGoal);
    const [loading, setLoading] = useState(!cachedEditable);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateId, setActiveDateId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!cachedEditable) {
            setLoading(true);
        }
        try {
            const savedStack = await StorageService.getItem('milestoneStack');
            if (savedStack) {
                const all: Milestone[] = JSON.parse(savedStack);
                // Sort by order first to ensure correct initial state
                all.sort((a, b) => a.order - b.order);

                const locked = all.filter(m => m.status === 'COMPLETED');
                const editable = all.filter(m => m.status !== 'COMPLETED' && !m.isArchived);
                const archived = all.filter(m => m.status !== 'COMPLETED' && m.isArchived);

                cachedLocked = locked;
                cachedEditable = editable;
                cachedArchived = archived;

                setLockedMilestones(locked);
                setEditableMilestones(editable);
                setArchivedMilestones(archived);
            }

            // Load Goal for date constraints
            const title = await AsyncStorage.getItem('mainGoal');
            if (title) {
                const motivation = await AsyncStorage.getItem('motivation');
                const unit = await AsyncStorage.getItem('durationUnit');
                const value = await AsyncStorage.getItem('durationValue');
                const startDate = await AsyncStorage.getItem('goalStartDate');

                const goalObj = {
                    title,
                    motivation: motivation || '',
                    durationUnit: unit as any,
                    durationValue: value ? parseInt(value) : undefined,
                    startDate: startDate || undefined
                };
                cachedGoal = goalObj;
                setGoal(goalObj);
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

    const handleArchive = (id: string) => {
        const milestone = editableMilestones.find(m => m.id === id);

        if (!milestone) return;

        if (milestone.status === 'ACTIVE') {
            Alert.alert(
                "Restricted",
                "You cannot archive the currently active milestone. Please complete it or drag another milestone to the top first."
            );
            return;
        }

        Alert.alert(
            "Archive Milestone",
            "This milestone will be hidden from your dashboard. It cannot be deleted, only archived.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: () => {
                        setEditableMilestones(prev => prev.filter(m => m.id !== id));
                        setArchivedMilestones(prev => [...prev, { ...milestone, isArchived: true }]);
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        try {
            // Combine locked + editable + archived
            // We need to re-assign 'order' property based on the final list (only for visible ones usually, but let's keep order for active)
            const visible = [...lockedMilestones, ...editableMilestones].map((m, index) => ({
                ...m,
                order: index
            }));

            // Re-integrate archived milestones (keep their existing data/order or push to end? Order doesn't matter for archived)
            const combined = [...visible, ...archivedMilestones];

            // Also check status consistency (First non-completed should be ACTIVE, others PENDING)
            // But we should respect if Drag makes a Pending one first.
            let foundActive = false;
            const finalizedStatus = combined.map(m => {
                if (m.status === 'COMPLETED') return m;

                // Archived items should never be active
                if (m.isArchived) {
                    return { ...m, status: 'PENDING' as const };
                }

                if (!foundActive) {
                    foundActive = true;
                    return { ...m, status: 'ACTIVE' as const };
                }
                return { ...m, status: 'PENDING' as const };
            });

            const updates: [string, string][] = [['milestoneStack', JSON.stringify(finalizedStatus)]];

            // Update activeMilestone too
            const active = finalizedStatus.find(m => m.status === 'ACTIVE');
            if (active) {
                updates.push(['activeMilestone', JSON.stringify(active)]);
            } else {
                updates.push(['activeMilestone', '']);
            }
            await StorageService.multiSet(updates);

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
                        { borderColor: theme.border, backgroundColor: theme.background },
                        isActive && {
                            backgroundColor: theme.surface,
                            borderColor: theme.accent,
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
                    ]}
                >
                    <View className="flex-row items-center gap-4">
                        {/* Drag Handle Indicator */}
                        <TouchableOpacity onPressIn={drag} className="p-2 opacity-50">
                            <Ionicons name="menu" size={20} color={theme.text} />
                        </TouchableOpacity>

                        <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-1">
                                {/* Editable Deadline Badge */}
                                <TouchableOpacity
                                    onPress={() => handleDatePress(item.id)}
                                    className="self-start px-2 py-1 rounded text-xs flex-row gap-1 items-center"
                                    style={{ backgroundColor: theme.surfaceAlt }}
                                >
                                    <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                                    <Text className="text-[10px] font-bold tracking-wide" style={{ color: theme.text }}>
                                        {item.deadline}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                value={item.title}
                                onChangeText={(t) => handleTextChange(item.id, 'title', t)}
                                className="font-black text-xl py-0"
                                style={{ color: theme.text }}
                                placeholder="Milestone Title"
                                placeholderTextColor={theme.textSecondary}
                                multiline
                            />
                            {/* Optional Description - Keep it minimal */}
                            {item.description ? (
                                <TextInput
                                    value={item.description}
                                    onChangeText={(t) => handleTextChange(item.id, 'description', t)}
                                    className="text-xs font-medium mt-1"
                                    style={{ color: theme.textSecondary }}
                                    placeholder="Add context..."
                                    placeholderTextColor={theme.textSecondary}
                                    multiline
                                />
                            ) : null}
                        </View>

                        {/* Archive Button */}
                        <TouchableOpacity
                            onPress={() => handleArchive(item.id)}
                            className="p-2 ml-2 rounded-full"
                            style={{ backgroundColor: theme.surfaceAlt }}
                        >
                            <Ionicons name="archive-outline" size={18} color={theme.danger} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [handleTextChange, handleDatePress, handleArchive]);

    if (loading) {
        return (
            <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }} className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }} className="flex-1">
                <StatusBar barStyle={themeName === 'dark' || themeName === 'catppuccin' ? 'light-content' : 'dark-content'} />
                {/* Header */}
                <View className="px-6 py-4 flex-row justify-between items-center z-10" style={{ backgroundColor: theme.background }}>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: theme.text }}>
                            <Ionicons name="arrow-back" size={24} color={theme.background} />
                        </TouchableOpacity>
                        <Text className="font-black text-lg tracking-tight" style={{ color: theme.text }}>EDIT MILESTONES</Text>
                    </View>
                    <TouchableOpacity onPress={handleSave} className="px-5 py-2 rounded-full" style={{ backgroundColor: theme.text }}>
                        <Text className="font-bold text-xs tracking-wider" style={{ color: theme.background }}>SAVE</Text>
                    </TouchableOpacity>
                </View>

                {/* Sub Header for Archives Link */}
                <View className="px-6 pb-2 items-end">
                    <TouchableOpacity onPress={() => router.push('/archived-milestones')}>
                        <Text className="font-bold text-[10px] tracking-widest underline" style={{ color: theme.textSecondary }}>VIEW ARCHIVES</Text>
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
                                    <Text className="font-black text-[10px] tracking-[0.2em] uppercase mb-4 ml-1" style={{ color: theme.textSecondary }}>
                                        LOCKED IN HISTORY
                                    </Text>
                                    <View className="p-4 rounded-3xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                        {lockedMilestones.map((m, i) => (
                                            <View key={m.id} className={`flex-row items-center gap-3 ${i < lockedMilestones.length - 1 ? 'mb-4 border-b pb-4' : ''}`} style={{ borderBottomColor: theme.border }}>
                                                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: theme.surfaceAlt }}>
                                                    <Ionicons name="lock-closed" size={12} color={theme.textSecondary} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-bold line-through text-md" style={{ color: theme.textSecondary }}>{m.title}</Text>
                                                    <Text className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>{m.deadline}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View className="flex-row items-center mb-6">
                                <View className="w-1 h-4 mr-3" style={{ backgroundColor: theme.accent }} />
                                <Text className="font-black text-[10px] tracking-[0.2em] uppercase" style={{ color: theme.text }}>
                                    Strategic Timeline
                                </Text>
                            </View>
                        </View>
                    }
                />

                {showDatePicker && (
                    <View className="absolute bottom-0 left-0 right-0 shadow-2xl rounded-t-[32px] z-50 p-6 border-t items-center pb-10" style={{ backgroundColor: theme.surface, borderTopColor: theme.border }}>
                        <View className="w-full flex-row justify-between items-center mb-4">
                            <Text className="font-black text-lg" style={{ color: theme.text }}>Reschedule</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)} className="px-4 py-2 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                                <Text className="font-bold text-xs" style={{ color: theme.text }}>DONE</Text>
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
                            textColor={theme.text}
                        />
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    rowItem: {
        paddingVertical: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
    }
});
