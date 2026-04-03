import { useEffect, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Milestone } from '../../types';
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface MilestoneCardProps {
  onPress: () => void;
  onComplete?: () => void;
  milestone?: Milestone;
}

function PulsingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const { theme } = useTheme();

  return <Animated.View style={[animatedStyle, { backgroundColor: theme.accentForeground }]} className="w-2 h-2 rounded-full" />;
}

function MilestoneCardComponent({ onPress, onComplete, milestone }: MilestoneCardProps) {
  const { theme } = useTheme();

  if (!milestone) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View
          className="rounded-[32px] p-8 mb-6"
          style={{ backgroundColor: theme.accent }}
        >
          <View className="flex-row justify-between items-start">
            <View className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <Text className="font-bold text-[10px] tracking-widest" style={{ color: theme.accentForeground }}>PRIORITY: IMMEDIATE</Text>
            </View>
            <View className="p-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="add" size={20} color={theme.accentForeground} />
            </View>
          </View>

          <Text className="font-bold text-xs tracking-widest mb-1" style={{ color: theme.accentForeground, opacity: 0.8 }}>CURRENT OBJECTIVE</Text>
          <Text className="font-black text-3xl mb-2 uppercase" style={{ color: theme.textAlt }}>Create Your First Milestone</Text>
          <Text className="font-medium text-sm leading-5" style={{ color: theme.accentForeground, opacity: 0.9 }}>
            Focus is built one step at a time. Tap to set your first milestone.
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View
        className="rounded-[32px] p-8 mb-6"
        style={{ backgroundColor: theme.accent, padding: 32, borderRadius: 32 }}
      >
        <View className="flex-row justify-between items-start mb-8">
          <View className="flex-row items-center gap-2">
            <PulsingDot />
            <Text className="font-bold text-[10px] tracking-widest" style={{ color: theme.accentForeground }}>CURRENT FOCUS</Text>
          </View>
          <View className={`px-3 py-1 rounded-full flex-row items-center gap-1 ${(milestone.daysLeft !== undefined && milestone.daysLeft <= 3) ? 'bg-yellow-400' : ''}`} style={!(milestone.daysLeft !== undefined && milestone.daysLeft <= 3) ? { backgroundColor: 'rgba(0,0,0,0.2)' } : {}}>
            {(milestone.daysLeft !== undefined && milestone.daysLeft <= 3) && (
              <Ionicons name="warning" size={12} color="black" />
            )}
            <Text className={`font-bold text-xs ${(milestone.daysLeft !== undefined && milestone.daysLeft <= 3) ? 'text-black' : ''}`} style={!(milestone.daysLeft !== undefined && milestone.daysLeft <= 3) ? { color: theme.accentForeground } : {}}>
              {milestone.daysLeft} DAYS LEFT
            </Text>
          </View>
        </View>

        <Text className="font-bold text-xs tracking-widest mb-2" style={{ color: theme.accentForeground, opacity: 0.8 }}>OBJECTIVE</Text>
        <Text className="font-black text-3xl leading-9 mb-8" style={{ color: theme.textAlt }}>
          {milestone.title}
        </Text>

        <View className="flex-row items-center justify-between border-t pt-4" style={{ borderTopColor: 'rgba(255,255,255,0.2)' }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="flag" size={14} color="rgba(255,255,255,0.8)" />
            <Text className="font-bold text-xs tracking-widest" style={{ color: theme.accentForeground, opacity: 0.8 }}>DEADLINE: {milestone.deadline}</Text>
          </View>

          {onComplete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="px-4 py-2 rounded-full flex-row items-center gap-2"
              style={{ backgroundColor: theme.accentForeground }}
            >
              <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
              <Text className="font-bold text-xs tracking-widest" style={{ color: theme.accent }}>COMPLETE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MilestoneCard = memo(MilestoneCardComponent);
