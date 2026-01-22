import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Milestone, Todo } from '../types';
import { BoatingSprite } from '../components/dashboard/BoatingSprite';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TacticalPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Check if this milestone is the active one
  const isSessionActive = milestone?.status === 'ACTIVE';

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (params.milestone) {
      try {
        setMilestone(JSON.parse(params.milestone as string));
      } catch (e) {
        console.error("Failed to parse milestone", e);
      }
    } else {
      loadActiveMilestone();
    }
  }, [params.milestone]);

  const loadActiveMilestone = async () => {
    const saved = await AsyncStorage.getItem('activeMilestone');
    if (saved) setMilestone(JSON.parse(saved));
  };

  const saveMilestone = async (updatedMilestone: Milestone) => {
    setMilestone(updatedMilestone);

    // Only save to activeMilestone if this is actually the active milestone
    if (updatedMilestone.status === 'ACTIVE') {
      await AsyncStorage.setItem('activeMilestone', JSON.stringify(updatedMilestone));
    }

    // Always update the milestone stack
    const stackStr = await AsyncStorage.getItem('milestoneStack');
    if (stackStr) {
      const stack: Milestone[] = JSON.parse(stackStr);
      const updatedStack = stack.map(m => m.id === updatedMilestone.id ? updatedMilestone : m);
      await AsyncStorage.setItem('milestoneStack', JSON.stringify(updatedStack));
    }
  };

  const handleToggleTodo = (todoId: string) => {
    if (!milestone || !isSessionActive) return;
    const updatedTodos = milestone.todos?.map(t =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    ) || [];
    saveMilestone({ ...milestone, todos: updatedTodos });
  };

  const handleAddTodo = () => {
    if (!milestone || !newTodo.trim()) return;
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      task: newTodo.trim(),
      completed: false
    };
    const updatedTodos = [...(milestone.todos || []), newTodoItem];
    saveMilestone({ ...milestone, todos: updatedTodos });
    setNewTodo('');
    // Small delay to allow list to update before scrolling
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleDeleteTodo = (todoId: string) => {
    if (!milestone) return;
    const updatedTodos = milestone.todos?.filter(t => t.id !== todoId) || [];
    saveMilestone({ ...milestone, todos: updatedTodos });
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.task);
  };

  const saveEdit = () => {
    if (!milestone || !editingId) return;
    if (!editingText.trim()) {
      return;
    }
    const updatedTodos = milestone.todos?.map(t =>
      t.id === editingId ? { ...t, task: editingText.trim() } : t
    ) || [];
    saveMilestone({ ...milestone, todos: updatedTodos });
    setEditingId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  if (!milestone) return <View className="flex-1 bg-white" />;

  const completedCount = milestone.todos?.filter(t => t.completed).length || 0;
  const totalCount = milestone.todos?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/*  Header */}
        <View className="px-6 py-4 bg-white flex-row justify-between items-center z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="font-black text-lg tracking-tight">TACTICAL PLAN</Text>
          </View>
          <View />
        </View>


        <ScrollView
          ref={scrollRef}
          className="flex-1 "
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(220, keyboardHeight + 100) }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bento Momentum & Metadata */}
          <View className="flex-row gap-3 mb-4">
            {/* Momentum Card - Large */}
            <View className="flex-1 bg-white p-6 rounded-[24px] border border-gray-200">
              <Text className="text-zinc-600 text-[10px] font-black tracking-[0.2em] uppercase mb-2">Momentum Status</Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-black text-6xl font-black tracking-tighter leading-none">
                  {Math.round(progress)}%
                </Text>
                <View className="bg-swiss-red/10 px-2 py-0.5 rounded">
                  <Text className="text-swiss-red text-[10px] font-black uppercase">Active</Text>
                </View>
              </View>
              {/* Visual Progress Bar */}
              <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
                <View className="h-full bg-swiss-red" style={{ width: `${progress}%` }} />
              </View>
              <Text className="text-[10px] font-bold text-gray-600 mt-2 uppercase">
                {completedCount}/{totalCount} STEPS COMPLETE
              </Text>
            </View>
          </View>

          {/* Task List Header */}
          <View className="px-1 mb-4 flex-row justify-between items-center">
            <Text className="font-black text-sm tracking-[0.2em] uppercase text-black">Target Objectives</Text>
            <View className="h-[2px] flex-1 bg-black ml-4" />
          </View>

          <View className="px-6 space-y-0">
            {milestone.todos?.map((todo, index) => (
              <View
                key={todo.id}
                className={`flex-row items-center gap-4 py-4 ${index !== (milestone.todos?.length || 0) - 1 ? 'border-b border-gray-100' : ''
                  }`}
              >
                {/* Minimal Checkbox */}
                <TouchableOpacity
                  onPress={() => handleToggleTodo(todo.id)}
                  disabled={!isSessionActive}
                  className={`w-6 h-6 rounded-sm border-2 items-center justify-center ${todo.completed ? 'bg-black border-black' : 'border-gray-300'
                    } ${!isSessionActive && !todo.completed ? 'opacity-40' : ''}`}
                >
                  {todo.completed && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </TouchableOpacity>

                {/* Task Content */}
                <View className="flex-1">
                  {editingId === todo.id ? (
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={editingText}
                        onChangeText={setEditingText}
                        className="flex-1 font-bold text-base text-black"
                        autoFocus
                        multiline
                        onSubmitEditing={saveEdit}
                      />
                      <View className="flex-row gap-2">
                        <TouchableOpacity onPress={saveEdit}>
                          <Ionicons name="checkmark-circle" size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cancelEdit}>
                          <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={isSessionActive ? () => handleToggleTodo(todo.id) : undefined}
                      onLongPress={() => startEditing(todo)}
                      className="flex-1 py-1 justify-center"
                    >
                      <Text className={`font-bold text-base tracking-tight ${todo.completed ? 'text-gray-600 line-through font-medium' : 'text-black'
                        }`}>
                        {todo.task}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Minimal Actions */}
                {editingId !== todo.id && (
                  <View className="flex-row-reverse gap-3">
                    <TouchableOpacity onPress={() => handleDeleteTodo(todo.id)} className="opacity-100">
                      <Ionicons name="trash-outline" size={18} color="red" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {/* Google Keep style Add Input */}
            <View className="mt-8 flex-row items-center border-t border-gray-100 pt-6">
              <View className="w-6 h-6 items-center justify-center mr-4">
                <Ionicons name="add" size={24} color="#9CA3AF" />
              </View>
              <TextInput
                value={newTodo}
                onChangeText={setNewTodo}
                placeholder="List item"
                multiline
                placeholderTextColor="#9CA3AF"
                className="flex-1 font-bold text-base text-black"
                onSubmitEditing={handleAddTodo}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 400);
                }}
              />
              {newTodo.length > 0 && (
                <TouchableOpacity onPress={handleAddTodo} className="ml-4 p-3 bg-black rounded-full">
                  <Text className="font-black text-sm text-white uppercase tracking-widest">Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* The Supervisor at the bottom */}
        <View className="absolute bottom-0 left-0 right-0 items-center">
          <BoatingSprite isBoat={true} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
