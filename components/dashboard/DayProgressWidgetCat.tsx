import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
    FadeOut,
} from 'react-native-reanimated';
import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// C-1: Lazy load ScannerSprite
const ScannerSprite = lazy(() => import('./ScannerSprite').then(m => ({ default: m.ScannerSprite })));

function DayProgressWidgetCatComponent() { // Renamed the function
    const { theme } = useTheme();
    // --- State Mapping ---
    // IDLE -> Neutral
    // SEARCHING -> Suspicious
    // MOCKING -> Angry
    // APPROVED -> Happy
    const [scannerState, setScannerState] = useState<'IDLE' | 'ANALYZING' | 'HAPPY' | 'SEARCHING' | 'POINTING' | 'SEALING' | 'TYPING' | 'VALIDATING' | 'WITNESSING'>('IDLE');
    const [interactionText, setInteractionText] = useState<string | null>(null);


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

    return (
        <View
            className="rounded-[32px] p-6 flex-1 aspect-square items-center justify-center border overflow-hidden"
            style={{ borderColor: theme.border }}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                className="items-center justify-center relative w-full h-full"
            >
                {/* Custom Text Bubble for states other than MOCKING/APPROVED which have built-in calls */}
                {interactionText && (
                    <Animated.View
                        exiting={FadeOut}
                        className="absolute -top-4 z-50 px-4 py-2 rounded-xl mb-4"
                        style={{ backgroundColor: theme.text, pointerEvents: 'none' }}
                    >
                        <Text className="font-bold text-sm tracking-wide" style={{ color: theme.background }}>{interactionText}</Text>
                        <View className="absolute -bottom-1 left-1/2 -ml-1 w-2 h-2 rotate-45" style={{ backgroundColor: theme.text }} />
                    </Animated.View>
                )}

                <View
                    className="items-center justify-center pointer-events-none"
                >
                    <View>
                        {/* Scaled down slightly to fit the widget comfortable */}
                        <Suspense fallback={<View style={{ width: 100, height: 100 }} />}>
                            <ScannerSprite
                                state={scannerState}
                                showLabels={false}
                            />
                        </Suspense>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

export const DayProgressWidgetCat = React.memo(DayProgressWidgetCatComponent);
