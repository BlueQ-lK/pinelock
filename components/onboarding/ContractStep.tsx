import { View, Text, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolateColor,
  FadeOut
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { DurationUnit } from './GoalInputStep';
import { useTheme } from '../../contexts/ThemeContext';

interface ContractStepProps {
  goal: string;
  motivation: string;
  durationUnit?: DurationUnit;
  durationValue?: number;
  onLockIn: () => void;
  onEditGoal?: () => void;
  onEditMotivation?: () => void;
}

const SLIDER_HEIGHT = 72;
const SLIDER_WIDTH = Dimensions.get('window').width - 48; // px-6 * 2
const KNOB_WIDTH = 72;

export function ContractStep({
  goal,
  motivation,
  durationUnit = 'year',
  durationValue = 1,
  onLockIn,
  onEditGoal,
  onEditMotivation
}: ContractStepProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [sequenceStep, setSequenceStep] = useState(0);
  const context = useSharedValue(0);

  const getDurationText = () => {
    if (durationUnit === 'year') return '1 YEAR';
    const unit = durationValue === 1 ? durationUnit.slice(0, -1) : durationUnit;
    return `${durationValue} ${unit.toUpperCase()}`;
  };

  const handleSuccess = () => {
    setShowSplash(true);
    setSequenceStep(1); // Mission In

    // Mission Out
    setTimeout(() => setSequenceStep(2), 2500);

    // Why In
    setTimeout(() => setSequenceStep(3), 3000);

    // Why Out
    setTimeout(() => setSequenceStep(4), 5500);

    // Finale (Status Report)
    setTimeout(() => {
      setSequenceStep(5);
    }, 6000);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateX.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      if (isLocked) return;
      const newValue = context.value + event.translationX;
      translateX.value = Math.min(Math.max(newValue, 0), SLIDER_WIDTH - KNOB_WIDTH);
    })
    .onEnd(() => {
      if (isLocked) return;
      if (translateX.value > SLIDER_WIDTH - KNOB_WIDTH - 20) {
        translateX.value = withSpring(SLIDER_WIDTH - KNOB_WIDTH);
        runOnJS(setIsLocked)(true);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(handleSuccess)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const knobStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      backgroundColor: interpolateColor(
        translateX.value,
        [0, SLIDER_WIDTH - KNOB_WIDTH],
        [theme.textSecondary, theme.accent]
      )
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + KNOB_WIDTH,
      backgroundColor: theme.accent,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - (translateX.value / (SLIDER_WIDTH - KNOB_WIDTH))
    };
  });

  const successTextStyle = useAnimatedStyle(() => {
    return {
      opacity: translateX.value / (SLIDER_WIDTH - KNOB_WIDTH)
    };
  });

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text className="font-black text-5xl tracking-tighter mb-8 leading-none" style={{ color: theme.text }}>
            THE CONTRACT.
          </Text>
        </Animated.View>

        {/* Bento Grid */}
        <View className="flex-col gap-4">

          {/* Main Card: Objective */}
          <Animated.View
            entering={FadeInDown.delay(500)}
            className="p-6 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                <Text className="font-bold text-xs tracking-widest uppercase" style={{ color: theme.textSecondary }}>OBJECTIVE</Text>
              </View>
              {onEditGoal && (
                <TouchableOpacity onPress={onEditGoal} className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                  <Text className="font-bold text-[10px] tracking-widest" style={{ color: theme.text }}>EDIT</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="font-bold text-3xl leading-8 tracking-tight mb-2" style={{ color: theme.text }}>
              {goal}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(600)}
            className="p-6 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                <Text className="font-bold text-xs tracking-widest uppercase" style={{ color: theme.textSecondary }}>MOTIVATION</Text>
              </View>
              {onEditMotivation && (
                <TouchableOpacity onPress={onEditMotivation} className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.surfaceAlt }}>
                  <Text className="font-bold text-[10px] tracking-widest" style={{ color: theme.text }}>EDIT</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              className="font-medium text-lg leading-6"
              numberOfLines={10}
              style={{ color: theme.text }}
            >
              &quot;{motivation}&quot;
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(700)}
            className="p-5 rounded-3xl justify-between"
            style={{ backgroundColor: theme.accent }}
          >
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full" />
              <Text className="font-bold text-xs tracking-widest uppercase" style={{ color: theme.textAlt }}>Timeline</Text>
            </View>
            <View>
              <Text className="font-bold text-7xl text-center tracking-tighter leading-none" style={{ color: theme.textAlt }}>
                {durationValue}
              </Text>
              <Text className="font-bold text-lg text-center tracking-widest uppercase" style={{ color: theme.textAlt, opacity: 0.8 }}>
                {durationUnit === 'year' ? 'YEAR' : (durationValue === 1 ? durationUnit.slice(0, -1) : durationUnit)}
              </Text>
            </View>
          </Animated.View>

          {/* Legal Text */}
          <Animated.View entering={FadeInDown.delay(800)} className="mt-4 px-2">
            <Text className="font-medium text-sm text-center leading-5" style={{ color: theme.textSecondary }}>
              By sliding below, I legally bind myself to this objective for <Text className="font-bold" style={{ color: theme.text }}>{getDurationText()}</Text>. Breach of contract results in personal failure.
            </Text>
          </Animated.View>

        </View>
      </ScrollView>

      {/* Fixed Bottom Slider */}
      <Animated.View
        entering={FadeInDown.delay(900)}
        className="absolute bottom-10 left-6 right-6"
      >
        <View
          className="rounded-full justify-center overflow-hidden relative shadow-lg"
          style={{ height: SLIDER_HEIGHT, width: SLIDER_WIDTH, backgroundColor: theme.surface }}
        >
          {/* Progress Fill */}
          <Animated.View
            className="absolute left-0 top-0 bottom-0 rounded-full"
            style={fillStyle}
          />
          {/* Background Text */}
          <Animated.Text
            className="absolute w-full text-center font-bold tracking-widest text-lg"
            style={[textStyle, { color: theme.textSecondary }]}
          >
            SLIDE TO LOCK IN
          </Animated.Text>


          {/* Success Text */}
          <Animated.Text
            className="absolute w-full text-center font-black tracking-widest text-lg"
            style={[successTextStyle, { color: theme.textAlt }]}
          >
            COMMITTING...
          </Animated.Text>

          {/* Knob */}
          <GestureDetector gesture={gesture}>
            <Animated.View
              className="absolute left-0 top-0 bottom-0 rounded-full justify-center items-center shadow-sm"
              style={[{ width: KNOB_WIDTH, height: SLIDER_HEIGHT, borderRadius: SLIDER_HEIGHT / 2 }, knobStyle]}
            >
              <Ionicons name="arrow-forward" size={32} color={theme.textAlt} />
            </Animated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* Success Modal Sequence (Recycled logic, updated style) */}
      <Modal visible={showSplash} animationType="fade" transparent={false}>
        <View className="flex-1 justify-center items-center relative overflow-hidden" style={{ backgroundColor: theme.background }}>

          {/* Phase 1: Mission */}
          {sequenceStep === 1 && (
            <Animated.View
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              className="px-8 items-center"
            >
              <Text className="font-bold text-sm tracking-[0.3em] mb-8" style={{ color: theme.textSecondary }}>CONTRACT ACCEPTED</Text>
              <Text className="font-black text-5xl text-center leading-[1.1] tracking-tight" style={{ color: theme.text }}>{goal}</Text>
            </Animated.View>
          )}

          {/* Phase 3: Duration */}
          {sequenceStep === 3 && (
            <Animated.View
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              className="px-8 items-center"
            >
              <Text className="font-bold text-sm tracking-[0.3em] mb-8" style={{ color: theme.textSecondary }}>TIMELINE LOCKED</Text>
              <Text className="font-black text-8xl text-center" style={{ color: theme.accent }}>{getDurationText()}</Text>
            </Animated.View>
          )}

          {/* Phase 5: The Contract Status */}
          {sequenceStep >= 5 && (
            <Animated.View
              entering={FadeIn.duration(800)}
              className="flex-1 w-full h-full absolute top-0 left-0 z-20"
              style={{ backgroundColor: theme.accent }}
            >
              <SafeAreaView className="flex-1 px-8 justify-between py-12">
                <View className="mt-12">
                  <Animated.View entering={FadeInDown.delay(500).duration(800)} className="mb-12">
                    <View className="flex-row items-center gap-3 mb-2">
                      <View className="w-3 h-3 bg-white rounded-full" />
                      <Text className="font-bold text-sm tracking-[0.2em]" style={{ color: theme.textAlt, opacity: 0.8 }}>STATUS REPORT</Text>
                    </View>
                    <Text className="font-black text-6xl tracking-tighter leading-none mb-1" style={{ color: theme.textAlt }}>CONTRACT</Text>
                    <Text className="font-black text-6xl tracking-tighter leading-none" style={{ color: theme.text }}>SIGNED.</Text>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(1200).duration(800)} className="mb-10">
                    <View className="w-full h-[1px] mb-6" style={{ backgroundColor: theme.textAlt, opacity: 0.3 }} />
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="font-bold text-[10px] tracking-widest mb-1" style={{ color: theme.textAlt, opacity: 0.6 }}>DURATION</Text>
                        <Text className="font-black text-2xl tracking-tight" style={{ color: theme.textAlt }}>{getDurationText()}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-[10px] tracking-widest mb-1" style={{ color: theme.textAlt, opacity: 0.6 }}>PENALTY</Text>
                        <Text className="font-black text-2xl tracking-tight" style={{ color: theme.textAlt }}>FAILURE</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>

                <Animated.View entering={FadeInDown.delay(2500).duration(800)}>
                  <TouchableOpacity
                    onPress={onLockIn}
                    className="py-6 rounded-full items-center shadow-2xl w-full border"
                    style={{ backgroundColor: theme.text, borderColor: theme.border }}
                  >
                    <Text className="font-black text-xl tracking-[0.2em]" style={{ color: theme.background }}>
                      BEGIN EXECUTION
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </SafeAreaView>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

