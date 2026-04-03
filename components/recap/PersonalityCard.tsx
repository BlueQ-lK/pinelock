import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { PersonalityConfig } from '../../utils/personalityTypes';

interface PersonalityCardProps {
    personality: PersonalityConfig;
    delay?: number;
}

export function PersonalityCard({ personality, delay = 0 }: PersonalityCardProps) {
    return (
        <Animated.View
            entering={ZoomIn.delay(delay).springify()}
            className="w-full mb-6"
        >
            <LinearGradient
                colors={personality.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-[40px] p-8 items-center justify-center"
                style={{
                    elevation: 8,
                    shadowColor: personality.gradient[0],
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                }}
            >
                {/* Emoji */}
                <Text className="text-7xl mb-4">{personality.emoji}</Text>

                {/* Label */}
                <Text className="text-white/80 text-xs font-black tracking-[0.3em] uppercase mb-2">
                    YOUR GOAL PERSONALITY
                </Text>

                {/* Personality Name */}
                <Text className="text-white text-3xl font-black tracking-tight text-center mb-3">
                    {personality.name}
                </Text>

                {/* Description */}
                <Text className="text-white/90 text-base font-medium text-center leading-relaxed">
                    {personality.description}
                </Text>
            </LinearGradient>
        </Animated.View>
    );
}
