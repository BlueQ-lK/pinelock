import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, { SharedValue, FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, Easing, withDelay, useAnimatedProps, createAnimatedComponent, useAnimatedKeyboard } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ScannerSprite } from '../dashboard/ScannerSprite';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedPath = createAnimatedComponent(Path);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface MotivationStepProps {
  onNext: (motivation: string) => void;
  initialValue?: string;
}

const TARGET_LENGTH = 25; // Characters needed to "fill" the tank

const LiquidFill = ({ progress, width = 300, height = 64 }: { progress: SharedValue<number>, width?: number, height?: number }) => {
  const { theme } = useTheme();
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(withTiming(Math.PI * 2, { duration: 1000, easing: Easing.linear }), -1, false);
  }, []);

  const frontWaveProps = useAnimatedProps(() => {
    const x = width * progress.value;
    const amp = 10;
    const offset = Math.sin(time.value);
    const cp1x = x + (offset * amp);
    const cp2x = x - (offset * amp);

    return {
      d: `M 0 0 L ${x} 0 C ${cp1x} ${height * 0.33} ${cp2x} ${height * 0.66} ${x} ${height} L 0 ${height} Z`
    };
  });

  const backWaveProps = useAnimatedProps(() => {
    const x = width * progress.value;
    const offset = Math.cos(time.value);
    const cp1x = x - (offset * 12);
    const cp2x = x + (offset * 12);

    return {
      d: `M 0 0 L ${x} 0 C ${cp1x} ${height * 0.4} ${cp2x} ${height * 0.8} ${x} ${height} L 0 ${height} Z`
    };
  });

  return (
    <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'transparent' }}>
      <Svg width="100%" height="100%">
        <AnimatedPath animatedProps={backWaveProps} fill={theme.text + '33'} />
        <AnimatedPath animatedProps={frontWaveProps} fill={theme.accent} />
      </Svg>
    </View>
  );
};

export function MotivationStep({ onNext, initialValue = '' }: MotivationStepProps) {
  const { theme } = useTheme();
  const [motivation, setMotivation] = useState(initialValue);
  const [buttonWidth, setButtonWidth] = useState(0);

  const keyboard = useAnimatedKeyboard();

  // Animation Shared Values
  const progress = useSharedValue(initialValue.length / TARGET_LENGTH);
  const textShake = useSharedValue(0);
  const spriteY = useSharedValue(0); // For jumping/running

  const bubble1Y = useSharedValue(0);
  const bubble2Y = useSharedValue(0);
  const bubble3Y = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    height: withSpring(keyboard.height.value > 0 ? 8 : 64, { damping: 40, stiffness: 150 }),
    borderRadius: withSpring(keyboard.height.value > 0 ? 32 : 32),
    transform: [{ translateY: keyboard.height.value > 0 ? -keyboard.height.value + 70 : 0 }]
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(keyboard.height.value > 0 ? 0 : 1, { duration: 150 }),
  }));

  const spriteAnimatedStyle = useAnimatedStyle(() => {
    const isKeyboardOpen = keyboard.height.value > 0;
    const spriteTranslateX = (buttonWidth * progress.value) - 40;

    return {
      opacity: withTiming(
        progress.value > 0 && !isKeyboardOpen ? 1 : 0,
        { duration: 150 }
      ),
      transform: [
        { translateX: Math.max(0, spriteTranslateX) },
        { translateY: -keyboard.height.value },
        { scale: 0.6 }
      ]
    } as any;
  });



  useEffect(() => {
    const float = (val: any, delay: number) => {
      val.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(100, { duration: 0 }),
          withTiming(-60, { duration: 1500 + Math.random() * 1000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      ));
    };
    float(bubble1Y, 0);
    float(bubble2Y, 500);
    float(bubble3Y, 900);
  }, []);

  const handleTextChange = (text: string) => {
    setMotivation(text);
    const rawProgress = Math.min(text.length / TARGET_LENGTH, 1);
    progress.value = withSpring(rawProgress, { damping: 15, stiffness: 90, mass: 1 });
  };



  const buttonTextStyle = useAnimatedStyle(() => ({
    color: progress.value >= 0.5 ? theme.background : theme.textSecondary
  } as any));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-4">
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text className="font-black text-6xl tracking-tighter leading-none mb-2" style={{ color: theme.text }}>
              THE FUEL.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)}>
            <Text className="font-bold text-lg mb-8 leading-6" style={{ color: theme.textSecondary }}>
              When you are tired, burnt out, and want to quit, what will keep you going?
            </Text>

            <TextInput
              className="font-bold text-2xl border-l-4 pl-4 py-2 leading-tight"
              style={{ borderLeftColor: theme.accent, color: theme.text, minHeight: 100, textAlignVertical: 'top' }}
              placeholder="I need to prove them wrong..."
              placeholderTextColor={theme.textSecondary + '66'}
              value={motivation}
              onChangeText={handleTextChange}
              multiline
              autoFocus
              selectionColor={theme.accent}
            />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(700)} className="mt-10 mb-6">
          <View className="relative h-24 justify-end">
            <Animated.View
              style={[spriteAnimatedStyle, { position: 'absolute', bottom: 45, left: 0, zIndex: 50 } as any]}
            >
              <ScannerSprite
                state={motivation.length > 0 ? 'TYPING' : 'IDLE'}
                showLabels={false}
                reactionTrigger={motivation.length}
                excitementLevel={Math.floor((motivation.length / TARGET_LENGTH) * 4)}
              />
            </Animated.View>

            <AnimatedTouchableOpacity
              onPress={() => onNext(motivation)}
              disabled={progress.value < 1}
              onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
              style={[buttonAnimatedStyle, { backgroundColor: theme.surfaceAlt }]}
              className="w-full h-16 rounded-full items-center justify-center overflow-hidden relative"
            >
              <LiquidFill progress={progress} width={buttonWidth || 300} />

              <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, pointerEvents: 'none' }}>
                <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ translateY: bubble1Y.value }], opacity: progress.value > 0.1 ? 0.3 : 0 })), { position: 'absolute', left: '10%', bottom: -24, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.background }]} />
                <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ translateY: bubble2Y.value }], opacity: progress.value > 0.3 ? 0.2 : 0 })), { position: 'absolute', left: '50%', bottom: -24, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.background }]} />
                <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ translateY: bubble3Y.value }], opacity: progress.value > 0.6 ? 0.2 : 0 })), { position: 'absolute', right: '20%', bottom: -24, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.background }]} />
              </Animated.View>

              <Animated.Text style={[buttonTextStyle, labelAnimatedStyle]} className="font-bold text-lg tracking-widest z-10">
                {progress.value >= 1 ? "LOCK IT IN" : "SET MOTIVATION"}
              </Animated.Text>
            </AnimatedTouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
