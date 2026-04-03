import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useWarRoom } from '../_context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function StagedMilestonesScreen() {
    const { draftStack, setDraftStack, deployStack } = useWarRoom();

    // Date Picker State
    const [editingDateId, setEditingDateId] = useState<string | null>(null);
    const [tempDate, setTempDate] = useState(new Date());

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newStack = [...draftStack];
        if (direction === 'up' && index > 0) {
            [newStack[index], newStack[index - 1]] = [newStack[index - 1], newStack[index]];
        } else if (direction === 'down' && index < newStack.length - 1) {
            [newStack[index], newStack[index + 1]] = [newStack[index + 1], newStack[index]];
        }
        setDraftStack(newStack);
    };

    const handleDatePress = (id: string, currentDeadline: string) => {
        setEditingDateId(id);
        setTempDate(new Date(currentDeadline));
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || tempDate;
        if (Platform.OS === 'android') {
            setEditingDateId(null);
        }

        if (selectedDate && editingDateId) {
            setDraftStack(prev => prev.map(m => {
                if (m.id === editingDateId) {
                    return { ...m, deadline: currentDate.toISOString().split('T')[0] };
                }
                return m;
            }));
        }

        if (Platform.OS === 'android' && selectedDate) {
            setEditingDateId(null);
        }
    };

    const closeDatePicker = () => {
        setEditingDateId(null);
    };

    const handleRemove = (id: string) => {
        setDraftStack(prev => prev.filter(m => m.id !== id));
    };

    return (
        <View className="flex-1 bg-white">
            <View className="px-6 py-4 flex-row justify-between items-end border-b border-gray-100">
                <View>
                    <Text className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Staging Area</Text>
                    <Text className="text-2xl font-black">{draftStack.length} INTEL STAGED</Text>
                </View>
                {draftStack.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setDraftStack([])}
                        className="bg-gray-100 px-3 py-1 rounded-full"
                    >
                        <Text className="text-[10px] font-bold text-gray-500">CLEAR ALL</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                <Text className="text-xs font-bold text-gray-400 mb-6 tracking-widest">
                    ARRANGE SEQUENCE & ADJUST DEADLINES
                </Text>

                {draftStack.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20 opacity-50">
                        <Ionicons name="layers-outline" size={64} color="#D1D5DB" />
                        <Text className="text-gray-400 font-medium mt-4 text-center max-w-[200px]">
                            No intel currently staged. Generate and select milestones in &quot;Quick Actions&quot;.
                        </Text>
                    </View>
                ) : (
                    draftStack.map((milestone, index) => (
                        <View key={milestone.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex-row items-start gap-4 ">
                            {/* Reorder Controls */}
                            <View className="items-center gap-1 pt-1">
                                <TouchableOpacity
                                    onPress={() => handleMove(index, 'up')}
                                    disabled={index === 0}
                                    className={index === 0 ? 'opacity-20' : 'opacity-100'}
                                >
                                    <Ionicons name="caret-up" size={24} color="black" />
                                </TouchableOpacity>
                                <Text className="font-bold text-gray-500 text-xs">{index + 1}</Text>
                                <TouchableOpacity
                                    onPress={() => handleMove(index, 'down')}
                                    disabled={index === draftStack.length - 1}
                                    className={index === draftStack.length - 1 ? 'opacity-20' : 'opacity-100'}
                                >
                                    <Ionicons name="caret-down" size={24} color="black" />
                                </TouchableOpacity>
                            </View>

                            {/* Content */}
                            <View className="flex-1 pt-1">
                                <View className="flex-row justify-between items-start mb-2">
                                    <Text className="font-black text-lg text-gray-900 leading-tight flex-1 mr-2">
                                        {milestone.title}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => handleRemove(milestone.id)}
                                        className="-mt-1 -mr-1 p-1"
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>

                                {/* Date Display / Edit Trigger */}
                                <TouchableOpacity
                                    onPress={() => handleDatePress(milestone.id, milestone.deadline)}
                                    className={`flex-row items-center gap-2 self-start px-3 py-2 rounded-lg border ${editingDateId === milestone.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'
                                        }`}
                                >
                                    <Ionicons name="calendar-outline" size={14} color={editingDateId === milestone.id ? "#2563eb" : "#6b7280"} />
                                    <Text className={`text-xs font-bold ${editingDateId === milestone.id ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {milestone.deadline}
                                    </Text>
                                    <Ionicons name="pencil" size={10} color={editingDateId === milestone.id ? "#2563eb" : "#9ca3af"} />
                                </TouchableOpacity>

                                {/* iOS Date Picker Inline */}
                                {editingDateId === milestone.id && Platform.OS === 'ios' && (
                                    <View className="mt-4 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                        <View className="flex-row justify-between items-center bg-gray-100 px-4 py-2 border-b border-gray-200">
                                            <Text className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Target Date</Text>
                                            <TouchableOpacity onPress={closeDatePicker} className="bg-white px-3 py-1 rounded-full ">
                                                <Text className="text-black font-bold text-xs">Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={new Date(milestone.deadline)}
                                            mode="date"
                                            display="inline"
                                            onChange={onDateChange}
                                            minimumDate={new Date()}
                                            style={{ height: 320, width: '100%' }}
                                            textColor="black"
                                            themeVariant="light"
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    )))}

                {/* Android Date Picker */}
                {Platform.OS === 'android' && editingDateId && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}
            </ScrollView>

            {draftStack.length > 0 && (
                <View className="absolute bottom-6 left-6 right-6">
                    <TouchableOpacity
                        onPress={deployStack}
                        className="w-full bg-swiss-red py-4 rounded-xl flex-row justify-center items-center gap-2 "
                    >
                        <Text className="text-white font-black tracking-wide">CONFIRM & START DEPLOYMENT</Text>
                        <Ionicons name="checkmark-done" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

