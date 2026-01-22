import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withSpring,
    withRepeat,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { useState, useCallback, useEffect, useRef } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { Accelerometer } from 'expo-sensors';
import { ScannerSprite } from './ScannerSprite';

export function DayProgressWidgetCat() {
    // --- State Mapping ---
    // IDLE -> Neutral
    // SEARCHING -> Suspicious
    // MOCKING -> Angry
    // APPROVED -> Happy
    const [scannerState, setScannerState] = useState<'IDLE' | 'ANALYZING' | 'HAPPY' | 'SEARCHING' | 'POINTING' | 'SEALING' | 'TYPING' | 'VALIDATING' | 'WITNESSING'>('IDLE');
    const [interactionText, setInteractionText] = useState<string | null>(null);

    // Gravity Offset (Gyroscope)
    const gravityX = useSharedValue(0);
    const gravityY = useSharedValue(0);

    // Accelerometer logic
    useEffect(() => {
        let subscription: any;

        const subscribe = async () => {
            subscription = Accelerometer.addListener(data => {
                const SENSITIVITY = 50; // Reduced sensitivity for larger sprite
                gravityX.value = withSpring(-data.x * SENSITIVITY, { damping: 10, stiffness: 60 });
                gravityY.value = withSpring(data.y * SENSITIVITY, { damping: 10, stiffness: 60 });
            });

            Accelerometer.setUpdateInterval(50);
        };

        subscribe();

        return () => {
            subscription?.remove();
        };
    }, []);

    const handlePress = useCallback(() => {
        // Debounce if already active
        if (scannerState !== 'IDLE') return;

        // Randomly choose an interaction
        const rand = Math.random();

        if (rand < 0.4) {
            // --- ACTION 1: HAPPY/APPROVED (40%) ---
            setScannerState('HAPPY');
            setInteractionText("YAY!"); // Clear interaction text
            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2000);
        } else if (rand < 0.65) {
            // --- ACTION 2: POINTING (25%) ---
            setScannerState('POINTING');
            setInteractionText("LOOK HERE.");

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2000);
        } else if (rand < 0.85) {
            // --- ACTION 3: SUSPICIOUS (20%) ---
            setScannerState('SEARCHING');
            setInteractionText("EXCUSE ME?");

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 2500);
        } else {
            // --- ACTION 4: MOCKING (15%) ---
            setScannerState('WITNESSING');
            setInteractionText("DO YOUR WORK"); // Clear interaction text

            setTimeout(() => {
                setScannerState('IDLE');
                setInteractionText(null);
            }, 3000);
        }

    }, [scannerState]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: gravityX.value },
                { translateY: gravityY.value },
            ] as any
        };
    });

    return (
        <Animated.View
            entering={FadeIn.delay(200)}
            className="bg-white rounded-[32px] p-6 flex-1 aspect-square items-center justify-center border border-gray-100 shadow-sm overflow-hidden"
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                className="items-center justify-center relative w-full h-full"
            >
                {/* Custom Text Bubble for states other than MOCKING/APPROVED which have built-in calls */}
                {interactionText && (
                    <Animated.View
                        entering={FadeIn}
                        exiting={FadeOut}
                        className="absolute -top-4 z-50 bg-black px-4 py-2 rounded-xl mb-4"
                        style={{ pointerEvents: 'none' }}
                    >
                        <Text className="text-white font-bold text-sm tracking-wide">{interactionText}</Text>
                        <View className="absolute -bottom-1 left-1/2 -ml-1 w-2 h-2 bg-black rotate-45" />
                    </Animated.View>
                )}

                <Animated.View
                    style={animatedStyle}
                    className="items-center justify-center pointer-events-none"
                >
                    <View>
                        {/* Scaled down slightly to fit the widget comfortable */}
                        <ScannerSprite
                            state={scannerState}
                            showLabels={false}
                        />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}
