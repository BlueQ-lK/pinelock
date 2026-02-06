import { useEffect } from 'react';
import { Text, TextProps } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface AnimatedNumberProps extends TextProps {
    value: number;
    duration?: number;
    decimals?: number;
    suffix?: string;
    prefix?: string;
    delay?: number;
}

export function AnimatedNumber({
    value,
    duration = 2000,
    decimals = 0,
    suffix = '',
    prefix = '',
    delay = 0,
    ...textProps
}: AnimatedNumberProps) {
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        animatedValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.cubic),
        }, () => {
            // Optional: callback when animation completes
        });
    }, [value, duration]);

    const animatedProps = useAnimatedProps(() => {
        const currentValue = animatedValue.value;
        const formattedValue = decimals > 0
            ? currentValue.toFixed(decimals)
            : Math.round(currentValue).toString();

        return {
            text: `${prefix}${formattedValue}${suffix}`,
        } as any;
    });

    return (
        <AnimatedText
            {...textProps}
            animatedProps={animatedProps}
        />
    );
}
