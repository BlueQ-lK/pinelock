import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { getRecapStats, resetGoalData, RecapStats } from '../utils/goalStatus';
import { useTheme } from '../contexts/ThemeContext';

// C-1: Lazy load ScannerSprite
const ScannerSprite = lazy(() => import('../components/dashboard/ScannerSprite').then(m => ({ default: m.ScannerSprite })));

const StatCard = React.memo(function StatCard({
    label,
    value,
    subtext,
    delay = 0,
    isLarge = false,
    highlight = false
}: {
    label: string,
    value: string | number,
    subtext?: string,
    delay?: number,
    isLarge?: boolean,
    highlight?: boolean
}) {
    const { theme } = useTheme();
    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15).stiffness(100).delay(delay)}
            className={`rounded-[32px] p-6 border shadow-sm ${isLarge ? 'w-full mb-4' : 'flex-1'}`}
            style={{
                backgroundColor: highlight ? theme.accent : theme.surface,
                borderColor: theme.border,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12
            }}
        >
            <Text
                className={`text-xs font-bold tracking-[0.2em] mb-3`}
                style={{ color: highlight ? theme.textAlt : theme.textSecondary }}
            >
                {label.toUpperCase()}
            </Text>
            <Text
                className={`font-black tracking-tighter leading-none mb-1 ${isLarge ? 'text-7xl' : 'text-4xl'}`}
                style={{ color: highlight ? theme.textAlt : theme.text }}
            >
                {value}
            </Text>
            {subtext && (
                <Text
                    className={`font-medium text-xs`}
                    style={{ color: highlight ? theme.textAlt : theme.textSecondary, opacity: 0.8 }}
                >
                    {subtext}
                </Text>
            )}
        </Animated.View>
    );
});

const MilestoneRow = React.memo(function MilestoneRow({ title, status, index }: { title: string, status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'FAILED', index: number }) {
    const { theme } = useTheme();
    const isCompleted = status === 'COMPLETED';

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15).stiffness(100).delay(200 + (index * 60))}
            className="flex-row items-center mb-4"
        >
            <View
                className={`w-8 h-8 rounded-full items-center justify-center mr-3`}
                style={{ backgroundColor: isCompleted ? theme.accent : theme.surfaceAlt }}
            >
                {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color={theme.textAlt} />
                ) : (
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.border }} />
                )}
            </View>
            <Text
                className={`flex-1 font-bold text-sm ${!isCompleted ? 'line-through' : ''}`}
                style={{ color: isCompleted ? theme.text : theme.textSecondary }}
            >
                {title}
            </Text>
        </Animated.View>
    );
});

export default function RecapPage() {
    const { theme, themeName } = useTheme();
    const router = useRouter();
    const [stats, setStats] = useState<RecapStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const shareViewRef = useRef<View>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getRecapStats();
            setStats(data);
        } catch (e) {
            console.error('Recap stats failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartNew = async () => {
        await resetGoalData();
        router.replace('/(onboarding)');
    };

    const handleShare = async () => {
        if (!stats) return;
        setIsSharing(true);
        // allow the hidden view to render before capturing
        setTimeout(async () => {
            try {
                if (shareViewRef.current) {
                    const uri = await captureRef(shareViewRef, {
                        format: "png",
                        quality: 0.9,
                        result: "tmpfile",
                    });

                    await Sharing.shareAsync(uri, {
                        dialogTitle: 'Mission Debrief',
                        mimeType: 'image/png',
                        UTI: 'public.png'
                    });
                }
            } catch (error) {
                console.error("Share failed", error);
            } finally {
                setIsSharing(false);
            }
        }, 100);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <Text className="font-bold tracking-widest text-xs" style={{ color: theme.textSecondary }}>CALCULATING RESULTS...</Text>
            </View>
        );
    }

    if (!stats) {
        return (
            <View className="flex-1 items-center justify-center p-8" style={{ backgroundColor: theme.background }}>
                <Text className="text-xl font-black mb-4" style={{ color: theme.text }}>NO DATA FOUND</Text>
                <TouchableOpacity
                    onPress={handleStartNew}
                    className="py-4 px-8 rounded-full"
                    style={{ backgroundColor: theme.text }}
                >
                    <Text className="font-bold" style={{ color: theme.background }}>START NEW GOAL</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <StatusBar barStyle={themeName === 'dark' || themeName === 'catppuccin' ? 'light-content' : 'dark-content'} />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.springify().damping(15).stiffness(100).delay(100)} className="mb-8 flex-row items-center justify-between mr-9">
                    <View>
                        <Text className="font-bold text-xs tracking-[0.3em] mb-2" style={{ color: theme.accent }}>MISSION DEBRIEF</Text>
                        <Text className="font-black text-5xl tracking-tighter leading-tight" style={{ color: theme.text }}>
                            TIME&apos;S UP.
                        </Text>
                        <Text className="font-medium text-lg mt-2" style={{ color: theme.textSecondary }}>
                            Let&apos;s review your performance.
                        </Text>
                    </View>
                    <View>
                        <Suspense fallback={<View className="w-24 h-24" />}>
                            <ScannerSprite
                                state="IDLE"
                                showLabels={true}
                                excitementLevel={stats.completionPercentage >= 90 ? 3 : 1}
                            />
                        </Suspense>
                    </View>
                </Animated.View>

                {/* Goal Summary */}
                <Animated.View
                    entering={FadeInDown.springify().damping(15).stiffness(100).delay(250)}
                    className="mb-8 p-6 rounded-[32px]"
                    style={{ backgroundColor: theme.surface }}
                >
                    <Text className="font-bold text-xs tracking-widest mb-2" style={{ color: theme.textSecondary }}>OBJECTIVE</Text>
                    <Text className="font-black text-2xl mb-4" style={{ color: theme.text }}>{stats.goalTitle}</Text>
                    <View className="h-[1px] w-full mb-4" style={{ backgroundColor: theme.border }} />
                    <Text className="font-bold text-xs tracking-widest mb-2" style={{ color: theme.textSecondary }}>MOTIVATION</Text>
                    <Text className="font-medium text-base italic" style={{ color: theme.textSecondary }}>&quot;{stats.motivation}&quot;</Text>

                    <View className="h-[1px] w-full my-4" style={{ backgroundColor: theme.border }} />

                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="font-bold text-xs tracking-widest mb-1" style={{ color: theme.textSecondary }}>STARTED</Text>
                            <Text className="font-bold text-sm" style={{ color: theme.text }}>
                                {new Date(stats.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="font-bold text-xs tracking-widest mb-1" style={{ color: theme.textSecondary }}>ENDED</Text>
                            <Text className="font-bold text-sm" style={{ color: theme.text }}>
                                {new Date(stats.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Hero Stat */}
                <StatCard
                    label="COMPLETION RATE"
                    value={`${stats.completionPercentage}%`}
                    subtext={stats.completionPercentage >= 80 ? "EXCEPTIONAL PERFORMANCE" : "ROOM FOR IMPROVEMENT"}
                    isLarge
                    highlight
                    delay={400}
                />

                {/* Secondary Stats Grid */}
                <View className="flex-row gap-4 mb-4">
                    <StatCard
                        label="MILESTONES"
                        value={`${stats.completedMilestones}/${stats.totalMilestones}`}
                        subtext="CONQUERED"
                        delay={500}
                    />
                    <StatCard
                        label="DURATION"
                        value={stats.daysElapsed}
                        subtext="DAYS ACTIVE"
                        delay={600}
                    />
                </View>

                {/* Milestone Timeline */}
                <Animated.View entering={FadeInDown.springify().damping(15).stiffness(100).delay(700)} className="mt-8 mb-8">
                    <Text className="font-black text-xl mb-6 tracking-tight" style={{ color: theme.text }}>ATTACK LOG</Text>
                    <View className="rounded-[32px] p-6" style={{ backgroundColor: theme.surface }}>
                        {stats.milestones.length === 0 ? (
                            <Text className="font-medium text-center py-4" style={{ color: theme.textSecondary }}>No milestones tracked.</Text>
                        ) : (
                            stats.milestones.map((m, i) => (
                                <MilestoneRow key={m.id} title={m.title} status={m.status} index={i} />
                            ))
                        )}
                    </View>
                </Animated.View>

            </ScrollView>

            {/* Footer Actions */}
            <Animated.View
                entering={FadeInUp.springify().damping(15).stiffness(100).delay(1000)}
                className="absolute bottom-0 left-0 right-0 px-6 py-4 pb-8 border-t flex-row gap-4"
                style={{
                    backgroundColor: theme.background + 'EE', // Semi-transparent
                    borderTopColor: theme.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.05,
                    shadowRadius: 20
                }}
            >
                <TouchableOpacity
                    onPress={handleShare}
                    className="flex-1 py-5 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.surfaceAlt }}
                >
                    <Ionicons name="share-outline" size={24} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleStartNew}
                    className="flex-[3] py-5 rounded-full items-center justify-center shadow-lg"
                    style={{ backgroundColor: theme.text, shadowColor: theme.accent }}
                >
                    <Text className="font-black text-lg tracking-widest" style={{ color: theme.background }}>START NEW GOAL</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Hidden Share Card View */}
            {isSharing && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: -5000,
                        width: 420,
                        height: 600,
                        backgroundColor: theme.accent,
                        padding: 32,
                        justifyContent: 'space-between'
                    }}
                    ref={shareViewRef}
                    collapsable={false}
                >
                    {/* Header Badge */}
                    <View className="flex-row justify-between items-start">
                        <View className="px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                            <Text className="font-bold text-[10px] tracking-[0.3em] uppercase" style={{ color: theme.textAlt }}>
                                MISSION DEBRIEF
                            </Text>
                        </View>
                        <View className="mb-6 items-center">
                            <Suspense fallback={<View className="h-48" />}>
                                <ScannerSprite state="HAPPY" showLabels={false} excitementLevel={3} />
                            </Suspense>
                        </View>
                    </View>
                    {/* Main Content */}
                    <View className="flex-1 justify-center my-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="medal" size={24} color={theme.textAlt} style={{ opacity: 0.8 }} />
                            <Text className="font-bold text-sm tracking-widest uppercase" style={{ color: theme.textAlt, opacity: 0.8 }}>
                                OBJECTIVE COMPLETE
                            </Text>
                        </View>

                        <Text
                            className="font-black text-5xl leading-[50px] tracking-tight mb-6"
                            adjustsFontSizeToFit
                            numberOfLines={3}
                            style={{ color: theme.textAlt }}
                        >
                            {stats?.goalTitle.toUpperCase() || 'GOAL'}
                        </Text>

                        <View className="h-1 w-20 rounded-full mb-8" style={{ backgroundColor: theme.textAlt, opacity: 0.3 }} />

                        <View className="flex-row gap-4 mb-8">
                            <View className="px-5 py-4 rounded-2xl border flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text className="font-bold text-[10px] tracking-widest uppercase mb-1" style={{ color: theme.textAlt, opacity: 0.6 }}>
                                    COMPLETION
                                </Text>
                                <Text className="font-black text-4xl tracking-tighter" style={{ color: theme.textAlt }}>
                                    {stats?.completionPercentage}%
                                </Text>
                            </View>
                            <View className="px-5 py-4 rounded-2xl border flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Text className="font-bold text-[10px] tracking-widest uppercase mb-1" style={{ color: theme.textAlt, opacity: 0.6 }}>
                                    DURATION
                                </Text>
                                <Text className="font-black text-4xl tracking-tighter" style={{ color: theme.textAlt }}>
                                    {stats?.daysElapsed}D
                                </Text>
                            </View>
                        </View>

                        <View className="px-6 py-4 rounded-2xl border mx-[-8]" style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <Text className="font-medium text-lg italic text-center" style={{ color: theme.textAlt }}>
                                &quot;{stats?.motivation}&quot;
                            </Text>
                        </View>
                    </View>

                    {/* Footer Section */}
                    <View className="flex-row justify-between items-end">
                        <View>
                            <Text className="text-[10px] font-bold tracking-[0.4em] mb-2 uppercase" style={{ color: theme.textAlt, opacity: 0.6 }}>SECURED ON</Text>
                            <Text className="font-black text-2xl tracking-tighter" style={{ color: theme.textAlt }}>LOCKIN 2026</Text>
                            <View className="mt-1 flex-row gap-2 items-center">
                                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                                <Text className="text-[9px] font-bold uppercase" style={{ color: theme.textAlt, opacity: 0.5 }}>System Optimal</Text>
                            </View>
                        </View>

                        {/* Character Stamp */}
                        <View className="items-center justify-center -mr-4 -mb-4">
                            <View className="scale-75">
                                <ScannerSprite
                                    state="APPROVED"
                                    showLabels={false}
                                    excitementLevel={3}
                                />
                            </View>
                            <View className="px-3 py-1 rounded-full -mt-2 border shadow-sm" style={{ backgroundColor: theme.background, borderColor: theme.accent }}>
                                <Text className="font-black text-[10px] tracking-widest uppercase" style={{ color: theme.accent }}>VERIFIED</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
