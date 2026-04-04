import { View, Text } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface MotivationCardProps {
  goal: string;
  motivation: string;
}

function MotivationCardComponent({ goal, motivation }: MotivationCardProps) {
  const { theme } = useTheme();

  return (
    <View className="rounded-[32px] p-2">
      <View className="flex-row items-start gap-4 mb-6">
        <View className="w-[2px] h-full rounded-full" style={{ backgroundColor: theme.accent }} />
        <View className="flex-1">
          <Text className="font-medium text-base leading-6" style={{ color: theme.accent }}>
            {motivation}
          </Text>
        </View>
      </View>
      {/* The Goal (North Star) */}
      <Text className="font-black text-3xl text-center mb-6 tracking-tight" style={{ color: theme.text }}>
        {goal}
      </Text>
    </View>
  );
}

export const MotivationCard = React.memo(MotivationCardComponent);