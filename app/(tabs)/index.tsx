import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { DateWidget } from '../../components/dashboard/DateWidget';
import { DayProgressWidgetCat } from '../../components/dashboard/DayProgressWidgetCat';
import { YearProgressWidgetCat } from '../../components/dashboard/YearProgressWidgetCat';
import { MotivationCard } from '../../components/dashboard/MotivationCard';
import { MilestoneCard } from '../../components/dashboard/MilestoneCard';
import { MilestoneStack } from '../../components/dashboard/MilestoneStack';
import { Milestone } from '../../types';
import { VictoryOverlay } from '../../components/dashboard/VictoryOverlay';
import { ScannerSprite } from '../../components/dashboard/ScannerSprite';
import { useAI } from '../../contexts/AIContext';
import { checkInToday } from '../../utils/streakUtils';
// ... imports


const DashboardSkeleton = () => (
  <ScrollView
    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    showsVerticalScrollIndicator={false}
  >
    {/* Header Section Skeleton */}
    <View className="flex-row justify-between items-center mb-8">
      <View>
        <View className="w-40 h-8 bg-gray-100 rounded-lg mb-2 animate-pulse" />
        <View className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
      </View>
      <View className="flex-row gap-3">
        <View className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
        <View className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
      </View>
    </View>

    {/* Top Row Widgets Skeleton */}
    <View className="flex-row gap-4 mb-6">
      <View className="flex-1 h-32 bg-gray-100 rounded-3xl animate-pulse" />
      <View className="flex-1 h-32 bg-gray-100 rounded-3xl animate-pulse" />
    </View>

    {/* War Path Summary Skeleton */}
    <View className="mb-8">
      <View className="w-24 h-4 bg-gray-100 rounded mb-4 ml-2 animate-pulse" />
      <View className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
    </View>

    {/* Primary Action Skeleton */}
    <View className="h-[300px] bg-gray-100 rounded-[32px] mb-8 animate-pulse" />

    {/* Year Progress Skeleton */}
    <View className="mb-8">
      <View className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
    </View>

    {/* Motivation Skeleton */}
    <View className="w-32 h-4 bg-gray-100 rounded mb-4 ml-2 animate-pulse" />
    <View className="h-40 bg-gray-100 rounded-[32px] animate-pulse" />
  </ScrollView>
);

export default function Dashboard() {
  const router = useRouter();
  const [goal, setGoal] = useState('Loading...');
  const [motivation, setMotivation] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | undefined>(undefined);
  const [milestoneStack, setMilestoneStack] = useState<Milestone[]>([]);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [focusSessionCount, setFocusSessionCount] = useState(0);

  const { generate, isReady } = useAI();
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = async () => {
    const savedGoal = await AsyncStorage.getItem('mainGoal');
    const savedMotivation = await AsyncStorage.getItem('motivation');
    const savedActive = await AsyncStorage.getItem('activeMilestone');
    const savedStack = await AsyncStorage.getItem('milestoneStack');

    if (savedGoal) setGoal(savedGoal);
    if (savedMotivation) setMotivation(savedMotivation);

    // Calculate daysLeft for milestones
    const calculateDaysLeft = (milestone: Milestone): Milestone => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(milestone.deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...milestone, daysLeft: Math.max(0, daysLeft) };
    };

    if (savedActive) {
      const parsedActive = JSON.parse(savedActive);
      if (!parsedActive.isArchived) {
        setActiveMilestone(calculateDaysLeft(parsedActive));
      }
    }
    if (savedStack) {
      const parsedStack: Milestone[] = JSON.parse(savedStack);
      setMilestoneStack(parsedStack.filter(m => !m.isArchived).map(calculateDaysLeft));
    }

    const savedActiveFocus = await AsyncStorage.getItem('focusStartTime');
    setIsFocusActive(!!savedActiveFocus);

    const savedHistory = await AsyncStorage.getItem('focusSessionHistory');
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setFocusSessionCount(history.length);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const generateBattlePlan = async (currentGoal: string, currentMotivation: string) => {
    if (isGenerating || !isReady) return;
    setIsGenerating(true);

    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const todayStr = currentDate.toISOString().split('T')[0];

      const prompt = `You are a strategic planning AI. The user has a goal: "${currentGoal}". Motivation: "${currentMotivation}". 
      
      CRITICAL DATE INFORMATION:
      - TODAY IS: ${todayStr}
      - CURRENT YEAR IS: ${currentYear}
      - ALL DEADLINES MUST BE AFTER ${todayStr}
      - NEVER use past dates or past years like 2024
      - Only use dates in ${currentYear} or ${currentYear + 1}
      
      Create a tactical plan with 5 distinct, sequential milestones to achieve this goal. 
      Return ONLY a raw JSON array. No markdown, no code blocks. 
      Each object must have: 
      - title (string)
      - description (string)
      - deadline (MUST BE FUTURE DATE in format YYYY-MM-DD, starting from ${todayStr})
      - impact ('HIGH' or 'CRITICAL')
      - tasks (array of strings, 3-5 actionable steps per milestone)
      
      IMPORTANT: First milestone should be 2-3 weeks from today (${todayStr}). Space milestones 3-4 weeks apart.
      
      Example format for TODAY being ${todayStr}:
      [{"title": "...", "description": "...", "deadline": "${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}", "impact": "HIGH", "tasks": ["step 1", "step 2"]}]`;

      const response = await generate(prompt);

      // Clean request
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const plan = JSON.parse(jsonStr);

      const newMilestones: Milestone[] = plan.map((item: any, index: number) => {
        let deadline = item.deadline;
        const deadlineDate = new Date(deadline);

        // Aggressive date correction - if date is in the past or invalid, fix it
        if (!deadline || isNaN(deadlineDate.getTime()) || deadlineDate < currentDate) {
          const futureDate = new Date(currentDate);
          futureDate.setDate(futureDate.getDate() + (14 * (index + 1)));
          deadline = futureDate.toISOString().split('T')[0];
        }

        return {
          id: Date.now().toString() + index,
          title: item.title,
          description: item.description,
          deadline: deadline,
          impact: item.impact,
          status: index === 0 ? 'ACTIVE' : 'PENDING',
          order: index,
          todos: item.tasks?.map((t: string, i: number) => ({
            id: `todo-${Date.now()}-${index}-${i}`,
            task: t,
            completed: false
          })) || []
        };
      });

      const firstActive = newMilestones[0];

      setMilestoneStack(newMilestones);
      setActiveMilestone(firstActive);

      await AsyncStorage.setItem('milestoneStack', JSON.stringify(newMilestones));
      await AsyncStorage.setItem('activeMilestone', JSON.stringify(firstActive));

    } catch (e) {
      console.error('Failed to generate battle plan:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Only auto-generate if we have a goal, no milestones, AI is ready, and we aren't already generating
    if (goal && goal !== 'Loading...' && milestoneStack.length === 0 && !activeMilestone && isReady && !isGenerating) {
      generateBattlePlan(goal, motivation);
    }
  }, [goal, motivation, milestoneStack, activeMilestone, isReady]);

  const handleCompleteMilestone = async () => {
    if (!activeMilestone) return;

    setShowVictory(true);

    try {
      // 1. Get the FULL stack from storage (including archived)
      const savedStack = await AsyncStorage.getItem('milestoneStack');
      const fullStack: Milestone[] = savedStack ? JSON.parse(savedStack) : [];

      // 2. Update the specific milestone in the FULL stack
      const updatedFullStack = fullStack.map(m =>
        m.id === activeMilestone.id ? { ...m, status: 'COMPLETED' as const } : m
      );

      // 3. Find next pending (that is NOT archived)
      // We look through updatedFullStack, respecting order
      const nextMilestone = updatedFullStack.find(m => m.status === 'PENDING' && !m.isArchived);

      if (nextMilestone) {
        // Mark it as active in the full stack
        // Note: We need to find it by ID to be safe
        const index = updatedFullStack.findIndex(m => m.id === nextMilestone.id);
        if (index !== -1) {
          updatedFullStack[index].status = 'ACTIVE';
          await AsyncStorage.setItem('activeMilestone', JSON.stringify(updatedFullStack[index]));
          // Update nextMilestone ref for local state uses
          Object.assign(nextMilestone, updatedFullStack[index]);
        }
      } else {
        await AsyncStorage.removeItem('activeMilestone');
      }

      // 4. Save the FULL stack
      await AsyncStorage.setItem('milestoneStack', JSON.stringify(updatedFullStack));

      // 5. Update Local State (Filtered)
      // We filter out archived ones for the UI
      const filteredStack = updatedFullStack.filter(m => !m.isArchived);

      // Re-calculate days left (helper function logic)
      const calculateDaysLeft = (milestone: Milestone): Milestone => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(milestone.deadline);
        deadline.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...milestone, daysLeft: Math.max(0, daysLeft) };
      };

      setMilestoneStack(filteredStack.map(calculateDaysLeft));
      setActiveMilestone(nextMilestone ? calculateDaysLeft(nextMilestone) : undefined);

      // Auto-advance streak
      await checkInToday();

    } catch (e) {
      console.error("Failed to complete milestone", e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {goal === 'Loading...' ? (
        <DashboardSkeleton />
      ) : (
        <>
          <VictoryOverlay
            visible={showVictory}
            onClose={() => setShowVictory(false)}
          />
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="font-black text-2xl tracking-tighter">LOCKIN {new Date().getFullYear()}</Text>

              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push('/focus-timer')}
                  className="bg-black rounded-full p-3"
                >
                  <Ionicons name="timer-outline" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/focus-zone')}
                  className="bg-swiss-red rounded-full p-3"
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>

              </View>
            </View>

            {/* Top Row Widgets */}
            <View className="flex-row gap-4 mb-6">
              <DateWidget />
              <DayProgressWidgetCat />
            </View>

            {/* War Path Summary Widget */}
            <TouchableOpacity
              onPress={() => router.push('/milestones')}
              className="mb-8"
            >
              <Text className="font-bold text-xs text-gray-400 tracking-widest mb-4 ml-2">FOCUS PATH</Text>
              <View className="bg-white p-5 rounded-2xl  border border-gray-100 flex-row justify-between items-center">
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-swiss-red rounded-xl items-center justify-center ">
                    <Text className="text-white font-black text-xl">
                      {milestoneStack.filter(m => m.status === 'COMPLETED').length}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-black text-lg">FOCUS LOG</Text>
                    <Text className="text-xs text-gray-500 font-medium">
                      {milestoneStack.length} Milestones Scheduled
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-50 p-3 rounded-full">
                  <Ionicons name="chevron-forward" size={20} color="black" />
                </View>
              </View>
            </TouchableOpacity>
            {/* Primary Action: Milestone */}
            {isGenerating ? (
              <View className="bg-black p-6 rounded-[32px] mb-8 min-h-[300px] items-center justify-center">
                <Text className="text-white font-bold text-lg mb-2">GENERATING FOCUS PLAN...</Text>
                <Text className="text-gray-400 text-xs tracking-widest">ANALYZING FOCUS PATH</Text>
              </View>
            ) : (
              <MilestoneCard
                milestone={activeMilestone}
                onPress={() => {
                  if (activeMilestone) {
                    router.push({
                      pathname: '/active-milestone',
                      params: { milestone: JSON.stringify(activeMilestone) }
                    });
                  } else {
                    router.push('/focus-zone');
                  }
                }}
                onComplete={handleCompleteMilestone}
              />
            )}

            {/* Year Progress Widget */}
            <View className="mb-8">
              <YearProgressWidgetCat />
            </View>

            {/* Motivation Section */}
            <Text className="font-bold text-xs text-gray-400 tracking-widest mb-4 ml-2">YOUR CONTRACT</Text>
            <MotivationCard
              goal={goal}
              motivation={motivation}
              onEdit={() => router.push('/(onboarding)')}
            />

          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
