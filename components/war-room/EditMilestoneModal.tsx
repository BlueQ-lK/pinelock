import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Milestone, Todo } from '../../types';

interface EditMilestoneModalProps {
    visible: boolean;
    milestone: Milestone | null;
    onClose: () => void;
    onSave: (updated: Milestone) => void;
}

export function EditMilestoneModal({ visible, milestone, onClose, onSave }: EditMilestoneModalProps) {
    const [edited, setEdited] = useState<Milestone | null>(null);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        setEdited(milestone);
    }, [milestone]);

    if (!visible || !edited) return null;

    const handleAddTodo = () => {
        if (!newTodo.trim()) return;
        const todo: Todo = {
            id: Date.now().toString(),
            task: newTodo.trim(),
            completed: false
        };
        setEdited({
            ...edited,
            todos: [...(edited.todos || []), todo]
        });
        setNewTodo('');
    };

    const handleRemoveTodo = (id: string) => {
        setEdited({
            ...edited,
            todos: edited.todos?.filter(t => t.id !== id) || []
        });
    };

    const handleUpdateTodo = (id: string, text: string) => {
        setEdited({
            ...edited,
            todos: edited.todos?.map(t => t.id === id ? { ...t, task: text } : t) || []
        });
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-white rounded-t-3xl h-[85%] w-full overflow-hidden">
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
                        <Text className="text-xl font-black">EDIT INTEL</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                            <Ionicons name="close" size={20} color="black" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
                        <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Mission Title</Text>
                        <TextInput
                            value={edited.title}
                            onChangeText={t => setEdited({ ...edited, title: t })}
                            className="text-2xl font-black mb-6 border-b border-gray-200 pb-2"
                            multiline
                        />

                        <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Briefing</Text>
                        <TextInput
                            value={edited.description}
                            onChangeText={t => setEdited({ ...edited, description: t })}
                            className="text-base font-medium text-gray-600 mb-8 leading-6 bg-gray-50 p-4 rounded-xl"
                            multiline
                            textAlignVertical="top"
                            style={{ minHeight: 100 }}
                        />

                        <Text className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Tactical Steps</Text>
                        <View className="space-y-3 mb-8">
                            {edited.todos?.map((todo, i) => (
                                <View key={todo.id} className="flex-row items-start gap-3">
                                    <View className="mt-3 w-1.5 h-1.5 rounded-full bg-swiss-red" />
                                    <TextInput
                                        value={todo.task}
                                        onChangeText={(text) => handleUpdateTodo(todo.id, text)}
                                        className="flex-1 text-base font-medium border-b border-gray-100 pb-2"
                                        multiline
                                    />
                                    <TouchableOpacity onPress={() => handleRemoveTodo(todo.id)} className="p-2">
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View className="flex-row items-center gap-3 mb-12">
                            <TextInput
                                value={newTodo}
                                onChangeText={setNewTodo}
                                placeholder="Add new step..."
                                className="flex-1 bg-gray-100 p-4 rounded-xl font-medium"
                                onSubmitEditing={handleAddTodo}
                            />
                            <TouchableOpacity
                                onPress={handleAddTodo}
                                disabled={!newTodo.trim()}
                                className={`p-4 rounded-xl ${!newTodo.trim() ? 'bg-gray-200' : 'bg-black'}`}
                            >
                                <Ionicons name="add" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <View className="p-6 border-t border-gray-100 bg-white">
                        <TouchableOpacity
                            onPress={() => onSave(edited)}
                            className="w-full bg-black py-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-black tracking-widest">UPDATE INTEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
