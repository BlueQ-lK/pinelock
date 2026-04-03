import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService } from '../utils/StorageService';
import { Milestone, Todo } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TacticalPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ─── AM-1: Full stack cache for direct writing (avoid read-on-write) ────────
  const fullStackRef = useRef<Milestone[]>([]);
  // Debounce timer for saving to AsyncStorage
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if this milestone is the active one
  const isSessionActive = milestone?.status === 'ACTIVE';

  useEffect(() => {
    // AM-2: Removed redundant Keyboard.addListener for height targeting.
    // Rely completely on KeyboardAvoidingView.
    // However, we still need a visual boolean flag for AM-3 (pause sprite).
    // React Native's Keyboard API is clean for just checking open/close.
    import('react-native').then(({ Keyboard }) => {
      const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    });
  }, []);

  useEffect(() => {
    const loadMilestoneData = async () => {
      // Load full stack so we have it for saving without an async read
      const stack = await StorageService.getJSON<Milestone[]>('milestoneStack');
      if (stack) fullStackRef.current = stack;

      if (params.milestone) {
        if (typeof params.milestone === 'string') {
          try {
            const parsed = JSON.parse(params.milestone);
            setMilestone(parsed);
            await StorageService.setItem('activeMilestone', JSON.stringify(parsed));
          } catch (e) {
            console.error("Failed to parse milestone param", e);
            router.replace('/(tabs)');
            return;
          }
        }
      } else {
        const saved = await StorageService.getJSON<Milestone>('activeMilestone');
        if (saved) {
          setMilestone(saved);
        } else {
          router.replace('/(tabs)');
        }
      }
    };
    loadMilestoneData();
  }, [params.milestone]);

  // ─── AM-1: Immediate state update, debounced storage write ──────────────────
  const saveMilestoneState = useCallback((updatedMilestone: Milestone) => {
    // 1. Instant UI update
    setMilestone(updatedMilestone);

    // 2. Debounced AsyncStorage write
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      // Async write active cache
      if (updatedMilestone.status === 'ACTIVE') {
        await StorageService.setItem('activeMilestone', JSON.stringify(updatedMilestone));
      }
      // Async write stack cache using our ref instead of reading from storage
      const stack = fullStackRef.current;
      const updatedStack = stack.map((m: Milestone) => m.id === updatedMilestone.id ? updatedMilestone : m);
      fullStackRef.current = updatedStack; // sync ref
      await StorageService.setItem('milestoneStack', JSON.stringify(updatedStack));
    }, 400); // 400ms debounce
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  const handleToggleTodo = (todoId: string) => {
    if (!milestone || !isSessionActive) return;
    const updatedTodos = milestone.todos?.map(t =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    ) || [];
    saveMilestoneState({ ...milestone, todos: updatedTodos });
  };

  const handleAddTodo = () => {
    if (!milestone || !newTodo.trim()) return;
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      task: newTodo.trim(),
      completed: false
    };
    const updatedTodos = [...(milestone.todos || []), newTodoItem];
    saveMilestoneState({ ...milestone, todos: updatedTodos });
    setNewTodo('');
    // Ensure we scroll to the bottom when adding
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleDeleteTodo = (todoId: string) => {
    if (!milestone) return;
    const updatedTodos = milestone.todos?.filter(t => t.id !== todoId) || [];
    saveMilestoneState({ ...milestone, todos: updatedTodos });
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.task);
  };

  const saveEdit = () => {
    if (!milestone || !editingId) return;
    if (!editingText.trim()) return;
    const updatedTodos = milestone.todos?.map(t =>
      t.id === editingId ? { ...t, task: editingText.trim() } : t
    ) || [];
    saveMilestoneState({ ...milestone, todos: updatedTodos });
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* AM-2: Rely entirely on KeyboardAvoidingView w/ behavior="padding" */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View className="px-6 py-4 bg-white flex-row gap-4 items-center z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-swiss-black rounded-full">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="font-black text-lg tracking-tight">TACTICAL PLAN</Text>
          </View>
          <View />
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 220 }}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
        >
          {/* Bento Momentum Card */}
          <View className="flex-row gap-3 mb-4">
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
          </View>

          <View className="px-6 space-y-0">
            {milestone.todos?.map((todo, index) => (
              <View
                key={todo.id}
                className={`flex-row items-center gap-4 py-4 ${index !== (milestone.todos?.length || 0) - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* Minimal Checkbox */}
                <TouchableOpacity
                  onPress={() => handleToggleTodo(todo.id)}
                  disabled={!isSessionActive}
                  className={`w-6 h-6 rounded-sm border-2 items-center justify-center ${todo.completed ? 'bg-black border-black' : 'border-gray-300'} ${!isSessionActive && !todo.completed ? 'opacity-40' : ''}`}
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
                      <Text className={`font-bold text-base tracking-tight ${todo.completed ? 'text-gray-600 line-through font-medium' : 'text-black'}`}>
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

            {/* Add Input */}
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
                  }, 100);
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

        <View className="absolute bottom-0 left-0 right-0 items-center" pointerEvents="none">
          <Image source={require('../assets/images/waves2.png')} className='w-full h-20' />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
