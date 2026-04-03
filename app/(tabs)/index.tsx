import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { StorageService } from '../../utils/StorageService';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { calculateDaysLeft } from '../../utils/milestoneUtils';
import { DateWidget } from '../../components/dashboard/DateWidget';
import { DayProgressWidgetCat } from '../../components/dashboard/DayProgressWidgetCat';
import { YearProgressWidgetCat } from '../../components/dashboard/YearProgressWidgetCat';
import { MotivationCard } from '../../components/dashboard/MotivationCard';
import { MilestoneCard } from '../../components/dashboard/MilestoneCard';
import { Milestone } from '../../types';
import { VictoryOverlay } from '../../components/dashboard/VictoryOverlay';
import { checkInToday } from '../../utils/streakUtils';


const DashboardSkeleton = () => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section Skeleton */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Animated.View style={animatedStyle} className="w-40 h-8 bg-gray-100 rounded-lg mb-2" />
          <Animated.View style={animatedStyle} className="w-24 h-4 bg-gray-100 rounded" />
        </View>
        <View className="flex-row gap-3">
          <Animated.View style={animatedStyle} className="w-10 h-10 bg-gray-100 rounded-full" />
          <Animated.View style={animatedStyle} className="w-10 h-10 bg-gray-100 rounded-full" />
        </View>
      </View>

      {/* Top Row Widgets Skeleton */}
      <View className="flex-row gap-4 mb-6">
        <Animated.View style={animatedStyle} className="flex-1 h-32 bg-gray-100 rounded-3xl" />
        <Animated.View style={animatedStyle} className="flex-1 h-32 bg-gray-100 rounded-3xl" />
      </View>

      {/* War Path Summary Skeleton */}
      <View className="mb-8">
        <Animated.View style={animatedStyle} className="w-24 h-4 bg-gray-100 rounded mb-4 ml-2" />
        <Animated.View style={animatedStyle} className="h-20 bg-gray-100 rounded-2xl" />
      </View>

      {/* Primary Action Skeleton */}
      <Animated.View style={animatedStyle} className="h-[300px] bg-gray-100 rounded-[32px] mb-8" />

      {/* Year Progress Skeleton */}
      <View className="mb-8">
        <Animated.View style={animatedStyle} className="h-32 bg-gray-100 rounded-3xl" />
      </View>

      {/* Motivation Skeleton */}
      <Animated.View style={animatedStyle} className="w-32 h-4 bg-gray-100 rounded mb-4 ml-2" />
      <Animated.View style={animatedStyle} className="h-40 bg-gray-100 rounded-[32px]" />
    </ScrollView>
  );
};

const CURRENT_YEAR = new Date().getFullYear().toString();

export default function Dashboard() {
  const router = useRouter();
  const [goal, setGoal] = useState('Loading...');
  const [motivation, setMotivation] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | undefined>(undefined);
  const [milestoneStack, setMilestoneStack] = useState<Milestone[]>([]);


  const completedCount = useMemo(() =>
    milestoneStack.filter(m => m.status === 'COMPLETED').length,
    [milestoneStack]);

  const loadData = useCallback(async () => {
    const [
      savedGoal,
      savedMotivation,
      savedActiveFocusVal,
    ] = await StorageService.multiGet([
      'mainGoal',
      'motivation',
      'focusStartTime',
    ]);

    if (savedGoal[1]) setGoal(savedGoal[1]);
    if (savedMotivation[1]) setMotivation(savedMotivation[1]);

    // Replaced JSON.parse with StorageService.getJSON and updated logic for milestones and focus history
    const parsedActive = await StorageService.getJSON<Milestone>('activeMilestone');
    if (parsedActive && Array.isArray(parsedActive.todos)) { // Changed 'checklist' to 'todos' to match Milestone type
      setActiveMilestone(calculateDaysLeft(parsedActive)); // Apply calculateDaysLeft
    } else {
      setActiveMilestone(undefined); // Use undefined for no active milestone
    }

    const parsedStack = await StorageService.getJSON<Milestone[]>('milestoneStack');
    if (parsedStack && Array.isArray(parsedStack)) {
      const filteredStack = parsedStack.filter(m => !m.isArchived).map(calculateDaysLeft); // Filter and apply calculateDaysLeft
      setMilestoneStack(filteredStack);
      // If there's no active milestone but there are milestones in the stack, set the first non-archived one as active
      if (!parsedActive && filteredStack.length > 0) {
        setActiveMilestone(filteredStack[0]);
      }
    } else {
      setMilestoneStack([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCompleteMilestone = async () => {
    if (!activeMilestone) return;

    setShowVictory(true);

    try {
      const savedStack = await StorageService.getItem('milestoneStack');
      const fullStack: Milestone[] = savedStack ? JSON.parse(savedStack) : [];

      // 2. Update the specific milestone in the FULL stack
      const updatedFullStack = fullStack.map(m =>
        m.id === activeMilestone.id ? { ...m, status: 'COMPLETED' as const } : m
      );

      // 3. Find next pending (that is NOT archived)
      // We look through updatedFullStack, respecting order
      const nextMilestone = updatedFullStack.find(m => m.status === 'PENDING' && !m.isArchived);

      const updates: [string, string][] = [
        ['milestoneStack', JSON.stringify(updatedFullStack)]
      ];

      if (nextMilestone) {
        // Mark it as active in the full stack
        // Note: We need to find it by ID to be safe
        const index = updatedFullStack.findIndex(m => m.id === nextMilestone.id);
        if (index !== -1) {
          updatedFullStack[index].status = 'ACTIVE';
          updates.push(['activeMilestone', JSON.stringify(updatedFullStack[index])]);
          // Update nextMilestone ref for local state uses
          Object.assign(nextMilestone, updatedFullStack[index]);
        }
      } else {
        updates.push(['activeMilestone', '']); // Remove activeMilestone by setting to empty string
      }

      // 4. Save the FULL stack
      await StorageService.multiSet(updates);

      // 5. Update Local State (Filtered)
      // We filter out archived ones for the UI
      const filteredStack = updatedFullStack.filter(m => !m.isArchived);

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
            removeClippedSubviews={true}
          >
            {/* Header Section */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="font-black text-2xl tracking-tighter">LOCKIN {CURRENT_YEAR}</Text>
                <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em]">FOCUS DASHBOARD</Text>

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
                      {completedCount}
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
