import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15).stiffness(100).delay(delay)}
            className={`rounded-[32px] p-6 border border-gray-100 shadow-sm ${isLarge ? 'w-full mb-4' : 'flex-1'} ${highlight ? 'bg-swiss-red' : 'bg-white'}`}
            style={{
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12
            }}
        >
            <Text className={`text-xs font-bold tracking-[0.2em] mb-3 ${highlight ? 'text-white' : 'text-gray-400'}`}>
                {label.toUpperCase()}
            </Text>
            <Text className={`font-black tracking-tighter leading-none mb-1 ${isLarge ? 'text-7xl' : 'text-4xl'} ${highlight ? 'text-white' : 'text-black'}`}>
                {value}
            </Text>
            {subtext && (
                <Text className={`font-medium text-xs ${highlight ? 'text-white' : 'text-gray-500'}`}>
                    {subtext}
                </Text>
            )}
        </Animated.View>
    );
});

const MilestoneRow = React.memo(function MilestoneRow({ title, status, index }: { title: string, status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'FAILED', index: number }) {
    const isCompleted = status === 'COMPLETED';

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15).stiffness(100).delay(200 + (index * 60))}
            className="flex-row items-center mb-4"
        >
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isCompleted ? 'bg-swiss-red' : 'bg-gray-100'}`}>
                {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                    <View className="w-2 h-2 rounded-full bg-gray-300" />
                )}
            </View>
            <Text className={`flex-1 font-bold text-sm ${isCompleted ? 'text-black' : 'text-gray-400 line-through'}`}>
                {title}
            </Text>
        </Animated.View>
    );
});

export default function RecapPage() {
    const router = useRouter();
    const [stats, setStats] = useState<RecapStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const shareViewRef = useRef<View>(null);

    // Animation values for progressive counting could go here

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
            <View className="flex-1 bg-white items-center justify-center">
                <Text className="font-bold tracking-widest text-xs">CALCULATING RESULTS...</Text>
            </View>
        );
    }

    if (!stats) {
        return (
            <View className="flex-1 bg-white items-center justify-center p-8">
                <Text className="text-xl font-black mb-4">NO DATA FOUND</Text>
                <TouchableOpacity
                    onPress={handleStartNew}
                    className="bg-black py-4 px-8 rounded-full"
                >
                    <Text className="text-white font-bold">START NEW GOAL</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.springify().damping(15).stiffness(100).delay(100)} className="mb-8 flex-row items-center justify-between mr-9">
                    <View>
                        <Text className="font-bold text-xs text-swiss-red tracking-[0.3em] mb-2">MISSION DEBRIEF</Text>
                        <Text className="font-black text-5xl tracking-tighter leading-tight text-black">
                            TIME&apos;S UP.
                        </Text>
                        <Text className="font-medium text-lg text-gray-400 mt-2">
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
                <Animated.View entering={FadeInDown.springify().damping(15).stiffness(100).delay(250)} className="mb-8 p-6 bg-white rounded-[32px]">
                    <Text className="font-bold text-xs text-gray-400 tracking-widest mb-2">OBJECTIVE</Text>
                    <Text className="font-black text-2xl mb-4">{stats.goalTitle}</Text>
                    <View className="h-[1px] bg-gray-100 w-full mb-4" />
                    <Text className="font-bold text-xs text-gray-400 tracking-widest mb-2">MOTIVATION</Text>
                    <Text className="font-medium text-base text-gray-600 italic">&quot;{stats.motivation}&quot;</Text>

                    <View className="h-[1px] bg-gray-100 w-full my-4" />

                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="font-bold text-xs text-gray-400 tracking-widest mb-1">STARTED</Text>
                            <Text className="font-bold text-sm text-black">
                                {new Date(stats.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="font-bold text-xs text-gray-400 tracking-widest mb-1">ENDED</Text>
                            <Text className="font-bold text-sm text-black">
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
                    <Text className="font-black text-xl mb-6 tracking-tight">ATTACK LOG</Text>
                    <View className="bg-white rounded-[32px] p-6">
                        {stats.milestones.length === 0 ? (
                            <Text className="text-gray-400 font-medium text-center py-4">No milestones tracked.</Text>
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
                className="absolute bottom-0 left-0 right-0 bg-white/90 blur-xl px-6 py-4 pb-8 border-t border-gray-100/50 flex-row gap-4"
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.05,
                    shadowRadius: 20
                }}
            >
                <TouchableOpacity
                    onPress={handleShare}
                    className="flex-1 bg-gray-100 py-5 rounded-full items-center justify-center"
                >
                    <Ionicons name="share-outline" size={24} color="black" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleStartNew}
                    className="flex-[3] bg-swiss-black py-5 rounded-full items-center justify-center shadow-lg shadow-red-200"
                >
                    <Text className="text-white font-black text-lg tracking-widest">START NEW GOAL</Text>
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
                        backgroundColor: '#FF3B30', // Swiss Red
                        padding: 32,
                        justifyContent: 'space-between'
                    }}
                    ref={shareViewRef}
                    collapsable={false}
                >
                    {/* Header Badge */}
                    <View className="flex-row justify-between items-start">
                        <View className="bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
                            <Text className="text-white/90 font-bold text-[10px] tracking-[0.3em] uppercase">
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
                            <Ionicons name="medal" size={24} color="rgba(255,255,255,0.8)" />
                            <Text className="text-white/80 font-bold text-sm tracking-widest uppercase">
                                OBJECTIVE COMPLETE
                            </Text>
                        </View>

                        <Text
                            className="text-white font-black text-5xl leading-[50px] tracking-tight mb-6"
                            adjustsFontSizeToFit
                            numberOfLines={3}
                        >
                            {stats?.goalTitle.toUpperCase() || 'GOAL'}
                        </Text>

                        <View className="h-1 w-20 bg-white/30 rounded-full mb-8" />

                        <View className="flex-row gap-4 mb-8">
                            <View className="bg-white/20 px-5 py-4 rounded-2xl border border-white/10 flex-1">
                                <Text className="text-white/60 font-bold text-[10px] tracking-widest uppercase mb-1">
                                    COMPLETION
                                </Text>
                                <Text className="text-white font-black text-4xl tracking-tighter">
                                    {stats?.completionPercentage}%
                                </Text>
                            </View>
                            <View className="bg-white/20 px-5 py-4 rounded-2xl border border-white/10 flex-1">
                                <Text className="text-white/60 font-bold text-[10px] tracking-widest uppercase mb-1">
                                    DURATION
                                </Text>
                                <Text className="text-white font-black text-4xl tracking-tighter">
                                    {stats?.daysElapsed}D
                                </Text>
                            </View>
                        </View>

                        <View className="bg-black/10 px-6 py-4 rounded-2xl border border-white/5 mx-[-8]">
                            <Text className="text-white font-medium text-lg italic text-center">
                                &quot;{stats?.motivation}&quot;
                            </Text>
                        </View>
                    </View>

                    {/* Footer Section */}
                    <View className="flex-row justify-between items-end">
                        <View>
                            <Text className="text-white/60 text-[10px] font-bold tracking-[0.4em] mb-2 uppercase">SECURED ON</Text>
                            <Text className="text-white font-black text-2xl tracking-tighter">LOCKIN 2026</Text>
                            <View className="mt-1 flex-row gap-2 items-center">
                                <View className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                                <Text className="text-white/50 text-[9px] font-bold uppercase">System Optimal</Text>
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
                            <View className="bg-white px-3 py-1 rounded-full -mt-2 border border-swiss-red shadow-sm">
                                <Text className="text-swiss-red font-black text-[10px] tracking-widest uppercase">VERIFIED</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
