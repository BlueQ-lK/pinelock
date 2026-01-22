import { View, Text, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    runOnJS,
    cancelAnimation,
    SharedValue,
    interpolate,
    withDelay
} from 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WorkoutSpriteProps {
    isActive: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WorkoutSprite({ isActive }: WorkoutSpriteProps) {
    // We use a slightly smaller width than full screen to account for paddings
    const containerWidth = SCREEN_WIDTH - 64;

    return (
        <View
            style={{ width: containerWidth }}
            className="items-center justify-center h-48 rounded-3xl overflow-hidden bg-gray-50/50 border border-gray-100"
        >
            {!isActive ? (
                <IdleSprite />
            ) : (
                <DinoGame />
            )}
        </View>
    );
}

function IdleSprite() {
    const breath = useSharedValue(1);

    useEffect(() => {
        breath.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scaleY: breath.value }]
    }));

    return (
        <View className="items-center">
            <Animated.View style={style} className="w-20 h-20 bg-black rounded-full items-center justify-center shadow-lg">
                <View className="absolute top-4 w-full h-3 opacity-90" style={{ backgroundColor: '#FF3B30' }} />
                <View className="flex-row gap-3 mt-1">
                    <View className="w-2 h-2 bg-white rounded-full" />
                    <View className="w-2 h-2 bg-white rounded-full" />
                </View>
            </Animated.View>
            <Text className="text-gray-400 text-[10px] font-black mt-6 tracking-[0.3em] uppercase">Ready to focus</Text>
        </View>
    );
}

// --- DINO GAME ---

const OBSTACLE_SPEED = 100; // Even slower for maximum relaxation

function DinoGame() {
    const spriteY = useSharedValue(0);
    const spriteHover = useSharedValue(0);
    const [obstacles, setObstacles] = useState<{ id: number; type: 'CACTUS_SMALL' | 'CACTUS_LARGE' | 'ROCK'; x: number }[]>([]);
    const nextObstacleId = useRef(0);
    const lastSpawnTime = useRef(0);
    const nextSpawnDelay = useRef(2000);

    useEffect(() => {
        let lastTime = Date.now();
        const loop = setInterval(() => {
            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            setObstacles(prev => {
                const moved = prev.map(o => ({ ...o, x: o.x - (OBSTACLE_SPEED * dt) }));
                const valid = moved.filter(o => o.x > -100);

                if (now - lastSpawnTime.current > nextSpawnDelay.current) {
                    lastSpawnTime.current = now;
                    nextSpawnDelay.current = Math.random() * 2000 + 2000; // Set next delay: 2s to 4s

                    const rand = Math.random();
                    let type: 'CACTUS_SMALL' | 'CACTUS_LARGE' | 'ROCK';
                    if (rand < 0.33) type = 'CACTUS_SMALL';
                    else if (rand < 0.66) type = 'CACTUS_LARGE';
                    else type = 'ROCK';

                    valid.push({
                        id: nextObstacleId.current++,
                        type,
                        x: SCREEN_WIDTH
                    });
                }
                return valid;
            });
        }, 16);
        return () => clearInterval(loop);
    }, []);

    useEffect(() => {
        spriteHover.value = withRepeat(
            withSequence(
                withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
    }, []);

    useEffect(() => {
        const spriteX = 50;
        const threats = obstacles.filter(o => o.x > spriteX);
        if (threats.length > 0) {
            const nearest = threats.sort((a, b) => a.x - b.x)[0];
            const distance = nearest.x - spriteX;
            if (distance < 40 && spriteY.value === 0) {
                runOnJS(triggerJump)();
            }
        }
    }, [obstacles]);

    const triggerJump = () => {
        spriteY.value = withSequence(
            withTiming(-70, { duration: 550, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: 550, easing: Easing.in(Easing.cubic) })
        );
    };

    const spriteStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: spriteY.value + spriteHover.value }]
    }));

    return (
        <View className="w-full h-full relative">
            <ParallaxCloud top={20} speed={15} scale={1} delay={0} />
            <ParallaxCloud top={40} speed={25} scale={0.6} delay={2000} />
            <ParallaxCloud top={15} speed={10} scale={0.8} delay={4000} />

            <View className="absolute bottom-10 w-full h-1">
                <MovingGround />
            </View>

            <View className="absolute bottom-10 w-full">
                {obstacles.map(o => (
                    <Obstacle key={o.id} type={o.type} x={o.x} />
                ))}
            </View>

            <View className="absolute left-8 bottom-10 z-30">
                <Animated.View style={spriteStyle}>
                    <DinoSpriteVisual spriteY={spriteY} spriteHover={spriteHover} />
                </Animated.View>
            </View>
        </View>
    );
}

function DinoSpriteVisual({ spriteY, spriteHover }: { spriteY: SharedValue<number>, spriteHover: SharedValue<number> }) {
    // Eyes animation: widen when jumping
    const eyeStyle = useAnimatedStyle(() => {
        const isJumping = spriteY.value < -10;
        return {
            transform: [
                { scaleY: withTiming(isJumping ? 1.4 : 1, { duration: 100 }) },
                { scaleX: withTiming(isJumping ? 1.2 : 1, { duration: 100 }) }
            ] as any
        };
    });

    // Mouth animation: open "O" when jumping, breathing when hovering
    const mouthStyle = useAnimatedStyle(() => {
        const isJumping = spriteY.value < -10;
        // Interpolate hover for breathing effect (-3 to 3)
        const hoverScale = interpolate(spriteHover.value, [-3, 3], [0.9, 1.1]);

        return {
            height: withTiming(isJumping ? 10 : 3, { duration: 100 }), // Open mouth
            width: withTiming(isJumping ? 10 : 8, { duration: 100 }), // Narrower when open
            borderRadius: withTiming(isJumping ? 10 : 2, { duration: 100 }), // Round when open
            transform: [
                { scaleX: isJumping ? 1 : hoverScale }
            ] as any,
        };
    });

    return (
        <View className="w-14 h-14 bg-black rounded-full items-center justify-center shadow-lg">
            <View className="absolute top-3 w-full h-2 opacity-90" style={{ backgroundColor: '#FF3B30' }} />
            <View className="flex-row gap-2 mt-1">
                <Animated.View style={eyeStyle} className="w-2 h-2 bg-white rounded-full" />
                <Animated.View style={eyeStyle} className="w-2 h-2 bg-white rounded-full" />
            </View>
            <Animated.View style={mouthStyle} className="bg-white mt-1" />
        </View>
    );
}

function Obstacle({ type, x }: { type: 'CACTUS_SMALL' | 'CACTUS_LARGE' | 'ROCK', x: number }) {
    const bottomOffset = type === 'ROCK' ? -12 : -6;
    return (
        <View className="absolute" style={{ left: x, bottom: bottomOffset }}>
            {type === 'ROCK' ? (
                <MaterialCommunityIcons name="image-filter-hdr" size={55} color="#6B7280" />
            ) : type === 'CACTUS_LARGE' ? (
                <MaterialCommunityIcons name="cactus" size={55} color="#059669" />
            ) : (
                <MaterialCommunityIcons name="cactus" size={55} color="#10B981" />
            )}
        </View>
    );
}

function MovingGround() {
    const offset = useSharedValue(0);

    useEffect(() => {
        // Seamless loop matching the pattern width
        offset.value = withRepeat(
            withTiming(-100, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }]
    }));

    // Generate random ground texture dots like Chrome Dino
    const groundDots = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: i * 100 + Math.random() * 60,
        width: Math.random() > 0.5 ? 2 : 4,
    }));

    return (
        <View className="w-full h-4 overflow-hidden relative">
            {/* Main road line */}
            <View className="absolute top-0 w-full h-[2px] bg-gray-400" />

            {/* Moving ground texture */}
            <Animated.View style={[style, { flexDirection: 'row', width: 3000, height: 4 }]}>
                {groundDots.map(dot => (
                    <View
                        key={dot.id}
                        className="absolute top-2 h-[2px] bg-gray-300"
                        style={{
                            left: dot.x,
                            width: dot.width,
                        }}
                    />
                ))}
            </Animated.View>
        </View>
    );
}

function ParallaxCloud({ top, speed, scale, delay }: { top: number, speed: number, scale: number, delay: number }) {
    const x = useSharedValue(SCREEN_WIDTH + 100);

    useEffect(() => {
        const duration = 20000 + (Math.random() * 10000); // 20-30s per pass
        x.value = withDelay(delay, withRepeat(
            withTiming(-150, { duration: duration / (speed / 10), easing: Easing.linear }),
            -1,
            false
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { scale }
        ] as any
    }));

    return (
        <Animated.View style={[style as any, { position: 'absolute', top, left: 0 }]}>
            <MaterialCommunityIcons name="cloud" size={40} color="#e5e7eb" style={{ opacity: 0.8 } as any} />
        </Animated.View>
    );
}
