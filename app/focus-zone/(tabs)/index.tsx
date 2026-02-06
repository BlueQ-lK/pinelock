import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWarRoom } from '../_context';
import { ScannerSprite } from '../../../components/dashboard/ScannerSprite';
import { useOnDeviceAI } from '../../../hooks/useOnDeviceAI';
import { Milestone } from '../../../types';
import { TacticalCard } from '../../../components/war-room/TacticalCard';
import { EditMilestoneModal } from '../../../components/war-room/EditMilestoneModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  milestones?: Milestone[];
  options?: { label: string; value: string; action: 'manual' }[];
}

export default function TacticalBoard() {
  const router = useRouter();
  const { goal, setDraftStack, draftStack } = useWarRoom();
  const {
    generateManualMilestone,
    isReady
  } = useOnDeviceAI();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'greeting' | 'manual'>('greeting');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial Greeting
    if (messages.length === 0 && goal) {
      setMessages([
        {
          id: 'init-1',
          role: 'ai',
          content: `Mission Control online. Target: "${goal.title}".\n\nDescribe the milestone(s) you want to create.`
        }
      ]);
      setMode('manual'); // Start in manual mode immediately
    }
  }, [goal]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const calculateGoalDeadline = (): Date => {
    if (!goal?.startDate || !goal?.durationValue || !goal?.durationUnit) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    const start = new Date(goal.startDate);
    const deadline = new Date(start);
    if (goal.durationUnit === 'year') deadline.setFullYear(start.getFullYear() + goal.durationValue);
    else if (goal.durationUnit === 'months') deadline.setMonth(start.getMonth() + goal.durationValue);
    else deadline.setDate(start.getDate() + goal.durationValue);
    return deadline;
  };





  const handleManualSubmit = async () => {
    if (!inputText.trim() || !goal) return;

    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // Add User Message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    }]);

    const deadline = calculateGoalDeadline();

    // Generate milestones directly (validation removed to reduce API calls)
    try {
      const milestones = await generateManualMilestone(goal, text, deadline);

      if (milestones.length > 0) {
        // DEADLINE SAFETY NET: Check all deadlines
        const invalidMilestones = milestones.filter(m => new Date(m.deadline) > deadline);

        if (invalidMilestones.length > 0) {
          setMessages(prev => [...prev, {
            id: `ai-deadline-error-${Date.now()}`,
            role: 'ai',
            content: `Timeline Conflict: Your goal ends on ${deadline.toDateString()}, but some milestones extend beyond that.\n\nPlease adjust your request to fit within your goal's timeframe.`
          }]);
          setIsProcessing(false);
          return;
        }

        setMessages(prev => [...prev, {
          id: `ai-manual-res-${Date.now()}`,
          role: 'ai',
          content: milestones.length === 1 ? "Milestone drafted successfully." : `${milestones.length} milestones drafted successfully.`,
          milestones: milestones
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `ai-err-${Date.now()}`,
          role: 'ai',
          content: "Failed to generate milestone. Please try again."
        }]);
      }
    } catch (error: any) {
      console.error("Chat Submit Error:", error);
      const isOverloaded = error?.message?.includes('overloaded') || error?.status === 'UNAVAILABLE' || (typeof error?.message === 'string' && error.message.includes('503'));

      setMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        role: 'ai',
        content: isOverloaded
          ? "AI Control is overloaded with transmissions. Please wait 30 seconds and try again."
          : "Tactical protocol error. AI communication failed. Please try again."
      }]);
    }

    setIsProcessing(false);
  };

  const toggleSelection = (milestone: Milestone) => {
    const next = new Set(selectedIds);
    if (next.has(milestone.id)) next.delete(milestone.id);
    else next.add(milestone.id);
    setSelectedIds(next);
  };

  const handleDeploy = () => {
    // Collect all selected milestones from all messages
    const allMilestones: Milestone[] = [];
    messages.forEach(m => {
      if (m.milestones) {
        m.milestones.forEach(ms => {
          if (selectedIds.has(ms.id)) {
            allMilestones.push(ms);
          }
        });
      }
    });

    if (allMilestones.length === 0) return;

    setDraftStack(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const distinctive = allMilestones.filter(m => !existingIds.has(m.id));
      return [...prev, ...distinctive];
    });

    router.push('/focus-zone/staged');
  };

  const handleSaveEdit = (updated: Milestone) => {
    setMessages(prev => prev.map(msg => {
      if (!msg.milestones) return msg;

      const hasMilestone = msg.milestones.some(m => m.id === updated.id);
      if (!hasMilestone) return msg;

      return {
        ...msg,
        milestones: msg.milestones.map(m => m.id === updated.id ? updated : m)
      };
    }));
    setEditingMilestone(null);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAi = item.role === 'ai';
    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        layout={Layout.springify()}
        className={`mb-6 ${isAi ? 'items-start' : 'items-end'}`}
      >
        <View className={`max-w-[85%] p-4 rounded-2xl ${isAi ? 'bg-gray-50 rounded-tl-none border border-green-200' : 'bg-black rounded-tr-none'
          }`}>
          <Text className={`text-sm font-medium leading-5 ${isAi ? 'text-black' : 'text-white'}`}>
            {item.content}
          </Text>
        </View>



        {/* Milestones Attachment */}
        {item.milestones && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -ml-2" contentContainerStyle={{ paddingLeft: 8 }}>
            {item.milestones.map((ms, idx) => (
              <View key={ms.id} className="mr-3 scale-90 origin-top-left">
                <TacticalCard
                  milestone={ms}
                  isSelected={selectedIds.has(ms.id)}
                  onToggle={() => toggleSelection(ms)}
                  onEdit={() => setEditingMilestone(ms)}
                  index={idx}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header - Fixed at top */}
      <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row justify-between items-center bg-white z-10">
        <View>
          <Text className="text-xs font-bold text-gray-400 tracking-widest mb-1">WAR ROOM</Text>
          <Text className="text-2xl font-black">STRATEGY</Text>
        </View>
        <View className="scale-75 origin-right h-24 w-24 justify-center items-center">
          <ScannerSprite
            state={isProcessing ? 'ANALYZING' : selectedIds.size > 0 ? 'APPROVED' : 'IDLE'}
            showLabels={false}
          />
        </View>
      </View>

      {/* Chat + Input Area - Responds to keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 24, paddingBottom: 20 }}
          keyboardDismissMode="interactive"
        />

        {/* Input / Action Bar */}
        <View className="p-4 bg-white border-t border-gray-100">
          {selectedIds.size > 0 ? (
            <TouchableOpacity
              onPress={handleDeploy}
              className="w-full bg-swiss-red py-4 rounded-xl flex-row justify-center items-center gap-2"
            >
              <Text className="text-white font-black tracking-wide">DEPLOY INTEL ({selectedIds.size})</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          ) : mode === 'manual' ? (
            <View className="flex-row gap-2 items-center">
              <TextInput
                className="flex-1 bg-gray-100 p-4 rounded-xl font-medium"
                placeholder="Describe your milestone..."
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleManualSubmit}
                editable={!isProcessing}
              />
              <TouchableOpacity
                onPress={handleManualSubmit}
                disabled={!inputText.trim() || isProcessing}
                className={`p-4 rounded-xl ${!inputText.trim() ? 'bg-gray-200' : 'bg-black'}`}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-xs text-gray-400 font-medium">Awaiting orders...</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>


      <EditMilestoneModal
        visible={!!editingMilestone}
        milestone={editingMilestone}
        onClose={() => setEditingMilestone(null)}
        onSave={handleSaveEdit}
      />
    </View >
  );
}
