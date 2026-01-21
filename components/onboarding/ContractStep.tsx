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
        ['#1a1a1a', '#FF3B30']
      )
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + KNOB_WIDTH,
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
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text className="font-black text-5xl text-black tracking-tighter mb-8 leading-none">
            THE CONTRACT.
          </Text>
        </Animated.View>

        {/* Bento Grid */}
        <View className="flex-col gap-4">

          {/* Main Card: Objective */}
          <Animated.View
            entering={FadeInDown.delay(500)}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-swiss-red" />
                <Text className="font-bold text-xs text-gray-400 tracking-widest uppercase">OBJECTIVE</Text>
              </View>
              {onEditGoal && (
                <TouchableOpacity onPress={onEditGoal} className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="text-black font-bold text-[10px] tracking-widest">EDIT</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="font-bold text-3xl text-black leading-8 tracking-tight mb-2">
              {goal}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(600)}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-swiss-red" />
                <Text className="font-bold text-xs text-gray-400 tracking-widest uppercase">MOTIVATION</Text>
              </View>
              {onEditMotivation && (
                <TouchableOpacity onPress={onEditMotivation} className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="text-black font-bold text-[10px] tracking-widest">EDIT</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              className="font-medium text-lg text-black leading-6"
              numberOfLines={10}
            >
              "{motivation}"
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(700)}
            className=" bg-swiss-red p-5 rounded-3xl justify-between"
          >
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full" />
              <Text className="font-bold text-xs text-white tracking-widest uppercase">Timeline</Text>
            </View>
            <View>
              <Text className="font-bold text-7xl text-center text-white tracking-tighter leading-none">
                {durationValue}
              </Text>
              <Text className="font-bold text-lg text-center text-black tracking-widest uppercase">
                {durationUnit === 'year' ? 'YEAR' : (durationValue === 1 ? durationUnit.slice(0, -1) : durationUnit)}
              </Text>
            </View>
          </Animated.View>

          {/* Legal Text */}
          <Animated.View entering={FadeInDown.delay(800)} className="mt-4 px-2">
            <Text className="font-medium text-sm text-gray-400 text-center leading-5">
              By sliding below, I legally bind myself to this objective for <Text className="text-black font-bold">{getDurationText()}</Text>. Breach of contract results in personal failure.
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
          className="bg-white rounded-full justify-center overflow-hidden relative shadow-lg"
          style={{ height: SLIDER_HEIGHT, width: SLIDER_WIDTH }}
        >
          {/* Progress Fill */}
          <Animated.View
            className="absolute left-0 top-0 bottom-0 bg-swiss-red rounded-full"
            style={fillStyle}
          />
          {/* Background Text */}
          <Animated.Text
            className="absolute w-full text-center font-bold text-gray-500 tracking-widest text-lg"
            style={textStyle}
          >
            SLIDE TO LOCK IN
          </Animated.Text>


          {/* Success Text */}
          <Animated.Text
            className="absolute w-full text-center font-black text-white tracking-widest text-lg"
            style={successTextStyle}
          >
            COMMITTING...
          </Animated.Text>

          {/* Knob */}
          <GestureDetector gesture={gesture}>
            <Animated.View
              className="absolute left-0 top-0 bottom-0 rounded-full justify-center items-center shadow-sm"
              style={[{ width: KNOB_WIDTH, height: SLIDER_HEIGHT, borderRadius: SLIDER_HEIGHT / 2 }, knobStyle]}
            >
              <Ionicons name="arrow-forward" size={32} color="white" />
            </Animated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* Success Modal Sequence (Recycled logic, updated style) */}
      <Modal visible={showSplash} animationType="fade" transparent={false}>
        <View className="flex-1 bg-black justify-center items-center relative overflow-hidden">

          {/* Phase 1: Mission */}
          {sequenceStep === 1 && (
            <Animated.View
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              className="px-8 items-center"
            >
              <Text className="font-bold text-sm text-gray-500 tracking-[0.3em] mb-8">CONTRACT ACCEPTED</Text>
              <Text className="font-black text-5xl text-white text-center leading-[1.1] tracking-tight">{goal}</Text>
            </Animated.View>
          )}

          {/* Phase 3: Duration */}
          {sequenceStep === 3 && (
            <Animated.View
              entering={FadeIn.duration(500)}
              exiting={FadeOut.duration(500)}
              className="px-8 items-center"
            >
              <Text className="font-bold text-sm text-gray-500 tracking-[0.3em] mb-8">TIMELINE LOCKED</Text>
              <Text className="font-black text-8xl text-swiss-red text-center">{getDurationText()}</Text>
            </Animated.View>
          )}

          {/* Phase 5: The Contract Status */}
          {sequenceStep >= 5 && (
            <Animated.View
              entering={FadeIn.duration(800)}
              className="flex-1 bg-swiss-red w-full h-full absolute top-0 left-0 z-20"
            >
              <SafeAreaView className="flex-1 px-8 justify-between py-12">
                <View className="mt-12">
                  <Animated.View entering={FadeInDown.delay(500).duration(800)} className="mb-12">
                    <View className="flex-row items-center gap-3 mb-2">
                      <View className="w-3 h-3 bg-white rounded-full" />
                      <Text className="text-white/80 font-bold text-sm tracking-[0.2em]">STATUS REPORT</Text>
                    </View>
                    <Text className="text-white font-black text-6xl tracking-tighter leading-none mb-1">CONTRACT</Text>
                    <Text className="text-black font-black text-6xl tracking-tighter leading-none">SIGNED.</Text>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(1200).duration(800)} className="mb-10">
                    <View className="w-full h-[1px] bg-white/30 mb-6" />
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-white/60 font-bold text-[10px] tracking-widest mb-1">DURATION</Text>
                        <Text className="text-white font-black text-2xl tracking-tight">{getDurationText()}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white/60 font-bold text-[10px] tracking-widest mb-1">PENALTY</Text>
                        <Text className="text-white font-black text-2xl tracking-tight">FAILURE</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>

                <Animated.View entering={FadeInDown.delay(2500).duration(800)}>
                  <TouchableOpacity
                    onPress={onLockIn}
                    className="bg-black py-6 rounded-full items-center shadow-2xl w-full border border-white/10"
                  >
                    <Text className="text-white font-black text-xl tracking-[0.2em]">
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

