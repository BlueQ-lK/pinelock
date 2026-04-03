import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { differenceInSeconds, endOfYear } from 'date-fns';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { ScannerSprite } from '../dashboard/ScannerSprite';
import { useTheme } from '../../contexts/ThemeContext';

interface TimeLeftStepProps {
  onNext: () => void;
}

export function TimeLeftStep({ onNext }: TimeLeftStepProps) {
  const { theme } = useTheme();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [spriteState, setSpriteState] = useState<'SEARCHING' | 'POINTING'>('SEARCHING');
  const [buttonLayout, setButtonLayout] = useState<{ y: number; height: number; width: number } | null>(null);

  // Sprite Animation Values
  const spriteX = useSharedValue(200); // Roughly above "S" in WAITS, beside TIME
  const spriteY = useSharedValue(56); // Height of TIME row
  const spriteScale = useSharedValue(0);
  const spriteOpacity = useSharedValue(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const end = endOfYear(now);
      const diff = differenceInSeconds(end, now);

      const days = Math.floor(diff / (3600 * 24));
      const hours = Math.floor((diff % (3600 * 24)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Sprite Appearance
    spriteOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    spriteScale.value = withDelay(500, withTiming(0.8, { duration: 500 }));

    return () => {
      clearInterval(interval);
    };
  }, []); // Removed buttonLayout dependency as we don't move to button anymore

  const spriteStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: spriteX.value },
      { translateY: spriteY.value },
      { scale: spriteScale.value }
    ],
    opacity: spriteOpacity.value
  } as any));

  return (
    <View className="flex-1 justify-between py-10 px-6 relative" style={{ backgroundColor: theme.background }}>
      {/* Sprite Layer */}
      <Animated.View style={[spriteStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, alignItems: 'center' }]} pointerEvents="none">
        <ScannerSprite state={spriteState} showLabels={false} disableHover />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} className="mt-10">
        <Text className="font-black text-6xl tracking-tighter leading-none" style={{ color: theme.text }}>
          TIME
        </Text>
        <Text className="font-black text-6xl tracking-tighter leading-none" style={{ color: theme.accent }}>
          WAITS FOR
        </Text>
        <Text className="font-black text-6xl tracking-tighter leading-none" style={{ color: theme.text }}>
          NO ONE.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600)} className="items-start">
        <Text className="font-bold text-sm tracking-widest mb-2" style={{ color: theme.textSecondary }}>REMAINING IN 2025</Text>
        <View className="flex-row items-baseline gap-2">
          <Text className="font-black text-8xl tracking-tighter" style={{ color: theme.text }}>
            {timeLeft.days}
          </Text>
          <Text className="font-bold text-2xl" style={{ color: theme.text }}>DAYS</Text>
        </View>
        <View className="flex-row gap-6 mt-4">
          <View>
            <Text className="font-black text-3xl" style={{ color: theme.textSecondary }}>{timeLeft.hours.toString().padStart(2, '0')}</Text>
            <Text className="font-bold text-xs" style={{ color: theme.textSecondary }}>HRS</Text>
          </View>
          <View>
            <Text className="font-black text-3xl" style={{ color: theme.textSecondary }}>{timeLeft.minutes.toString().padStart(2, '0')}</Text>
            <Text className="font-bold text-xs" style={{ color: theme.textSecondary }}>MIN</Text>
          </View>
          <View>
            <Text className="font-black text-3xl" style={{ color: theme.accent }}>{timeLeft.seconds.toString().padStart(2, '0')}</Text>
            <Text className="font-bold text-xs" style={{ color: theme.accent }}>SEC</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(900)}>
        <TouchableOpacity
          onLayout={(event) => {
            const { y, height, width } = event.nativeEvent.layout;
            // Only set if different to avoid loops/re-renders if strict
            if (!buttonLayout || Math.abs(buttonLayout.y - y) > 1) {
              setButtonLayout({ y, height, width });
            }
          }}
          onPress={onNext}
          className="w-full py-5 rounded-full items-center mb-8"
          style={{ backgroundColor: theme.text }}
        >
          <Text className="font-bold text-lg tracking-widest" style={{ color: theme.background }}>BEGIN PROTOCOL</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
