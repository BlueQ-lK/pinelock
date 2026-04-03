import { View, Text } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface MotivationCardProps {
  goal: string;
  motivation: string;
  onEdit?: () => void;
}

function MotivationCardComponent({ goal, motivation, onEdit }: MotivationCardProps) {
  const { theme } = useTheme();
  
  return (
    <View className="rounded-[32px] p-8 mb-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-row items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
          <Text className="font-bold text-[10px] tracking-widest" style={{ color: theme.textSecondary }}>SIGNED CONTRACT</Text>
        </View>
        <Ionicons name="lock-closed" size={16} color={theme.text} />
      </View>

      {/* The Goal (North Star) */}
      <Text className="font-black text-3xl leading-9 mb-8 tracking-tight" style={{ color: theme.text }}>
        {goal}
      </Text>

      {/* The Fuel (Divider + Content) */}
      <View className="flex-row items-start gap-4">
        <View className="w-[2px] h-full rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.2 }} />
        <View className="flex-1">
          <Text className="font-bold text-[10px] tracking-widest mb-1" style={{ color: theme.textSecondary }}>THE PLEDGE</Text>
          <Text className="font-medium text-sm leading-6" style={{ color: theme.text }}>
            {motivation}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const MotivationCard = React.memo(MotivationCardComponent);