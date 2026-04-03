import { View, Text, ScrollView, TouchableOpacity, InteractionManager } from 'react-native';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router'; // Or 'expo-router' based on your imports
import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { StorageService } from '../utils/StorageService';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Milestone } from '../types';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

// ─── M-4: React.memo for sprites to prevent unnecessary re-animations ─────────
// ─────────────────────────────────────────────────────────────────────────────

const FocusLogSkeleton = () => (
    <>
        <View className="px-6 py-4 bg-white flex-row justify-between items-center z-10">
            <View className="p-2 w-10 h-10" />
            <View className="w-32 h-6 bg-gray-100 rounded animate-pulse" />
            <View className="w-10 h-10" />
        </View>

        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            removeClippedSubviews={true}
        >
            <View className="flex-row flex-wrap gap-3 mb-8">
                <View className="w-full h-32 bg-gray-100 rounded-[24px] animate-pulse" />
                <View className="flex-1 h-24 bg-gray-100 rounded-[24px] animate-pulse" />
                <View className="flex-1 h-24 bg-gray-100 rounded-[24px] animate-pulse" />
            </View>

            <View className="px-1 mb-4 flex-row justify-between items-center">
                <View className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
            </View>

            <View className="gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} className="p-6 h-32 bg-gray-100 rounded-[24px] animate-pulse" />
                ))}
            </View>
        </ScrollView>
    </>
);

export default function WarPathScreen() {
    const router = useExpoRouter();
    const insets = useSafeAreaInsets();

    // ─── M-1: Removed module-level mutable cache ────────────────────────────
    // We now just use React state. A real global cache would use Context/Zustand,
    // but the immediate fix is to remove the active anti-pattern and just fetch.
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    // ────────────────────────────────────────────────────────────────────────

    const shareViewRef = useRef<View>(null);
    const [shareData, setShareData] = useState<{ milestone: Milestone, index: number } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const all = await StorageService.getJSON<Milestone[]>('milestoneStack');
            if (all) {
                const validMilestones = Array.isArray(all)
                    ? all.filter((m: any) =>
                        m &&
                        typeof m.id === 'string' &&
                        typeof m.title === 'string' &&
                        typeof m.order === 'number' &&
                        !m.isArchived
                    )
                    : [];
                setMilestones(validMilestones);
            }
        } catch (e) {
            console.error('Failed to load focus path', e);
            setMilestones([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // ─── M-5: InteractionManager instead of setTimeout(100) ──────────────────
    const handleShare = async (milestone: Milestone, index: number) => {
        try {
            setShareData({ milestone, index });

            InteractionManager.runAfterInteractions(async () => {
                if (shareViewRef.current) {
                    try {
                        const uri = await captureRef(shareViewRef, {
                            format: "png",
                            quality: 0.9,
                            result: "tmpfile",
                        });

                        await Sharing.shareAsync(uri, {
                            dialogTitle: 'Share your Success',
                            mimeType: 'image/png',
                            UTI: 'public.png'
                        });
                    } catch (err) {
                        console.error("Snapshot failed", err);
                    } finally {
                        // ─── M-2: Cleanup shareData to unmount the view ──────
                        setShareData(null);
                        // ──────────────────────────────────────────────────────
                    }
                }
            });
        } catch (error) {
            console.log(error);
            setShareData(null);
        }
    };
    // ────────────────────────────────────────────────────────────────────────

    // ─── M-3: Memoize expensive sorts & filters ─────────────────────────────
    const { sortedMilestones, completedCount, totalCount, progress } = useMemo(() => {
        const sorted = [...milestones]
            .filter(m => m && typeof m.order === 'number')
            .sort((a, b) => a.order - b.order);

        const compCount = sorted.filter(m => m.status === 'COMPLETED').length;
        const totCount = sorted.length;
        const prog = totCount > 0 ? (compCount / totCount) * 100 : 0;

        return {
            sortedMilestones: sorted,
            completedCount: compCount,
            totalCount: totCount,
            progress: prog
        };
    }, [milestones]);
    // ────────────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {loading ? (
                <FocusLogSkeleton />
            ) : (
                <>
                    {/* Header */}
                    <View className="px-6 py-2 bg-white flex-row gap-4 items-center z-10">
                        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-swiss-black rounded-full">
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="font-black text-lg tracking-tight">FOCUS LOG</Text>
                        </View>
                        <View />
                    </View>

                    <ScrollView className="flex-1 " contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                        {/* Bento Summary Grid */}
                        <View className="flex-row flex-wrap gap-3 mb-8">
                            <View className="w-full bg-swiss-red p-6 rounded-[24px] flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="text-white text-[10px] font-black tracking-[0.2em] uppercase mb-2">Completion Status</Text>
                                    <Text className="text-white text-6xl font-black tracking-tighter leading-none">
                                        {Math.round(progress)}%
                                    </Text>
                                </View>
                                <View className="w-20 h-20 items-center justify-center bg-white/20 rounded-full">
                                    <Ionicons name="analytics" size={40} color="white" />
                                </View>
                            </View>

                            <View className="flex-1 bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                                <Text className="text-gray-700 text-[10px] font-black tracking-[0.2em] uppercase mb-1">Cleared</Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-black text-6xl font-black">{completedCount}</Text>
                                    <Text className="text-gray-600 text-3xl font-bold">/ {totalCount}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                className="flex-1 bg-black p-5 rounded-[24px] flex justify-center items-center"
                                onPress={() => router.push('/edit-focus-plan')}
                            >
                                <Text className="text-white text-lg font-black tracking-[0.2em] uppercase mb-1">EDIT</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Timeline Header */}
                        <View className="px-1 mb-4 flex-row justify-between items-center">
                            <Text className="font-black text-sm tracking-[0.2em] uppercase text-black">Milestones</Text>
                        </View>
                        <View className="gap-3">
                            {sortedMilestones.map((milestone, index) => {
                                const isActive = milestone.status === 'ACTIVE';
                                const isCompleted = milestone.status === 'COMPLETED';

                                return (
                                    <TouchableOpacity
                                        key={`${milestone.id}-${milestone.order}`}
                                        className={`p-6 rounded-[24px] border-2 ${isActive ? 'bg-white border-swiss-red/20 ' :
                                            isCompleted ? 'bg-gray-50 border-gray-200' :
                                                'border-gray-200'
                                            }`}
                                        onPress={() => router.push({
                                            pathname: '/active-milestone',
                                            params: {
                                                milestone: JSON.stringify(milestone),
                                                isActive: isActive.toString()
                                            }
                                        })}
                                        activeOpacity={0.9}
                                    >
                                        <View className="flex-row justify-between items-start">
                                            <View className="flex-1">
                                                <Text className={`text-[10px] font-black  uppercase mb-2 ${isActive ? 'text-swiss-red' : 'text-gray-600'
                                                    }`}>
                                                    {milestone.deadline ? format(new Date(milestone.deadline), 'MMM d, yyyy') : '00.00.00'}
                                                </Text>
                                                <Text className={`text-2xl font-black tracking-tighter leading-none ${isCompleted ? 'text-gray-500' : 'text-black'
                                                    }`}>
                                                    {milestone.title}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-2">
                                                {isCompleted && (
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleShare(milestone, index);
                                                        }}
                                                        className="bg-black/5 w-8 h-8 items-center justify-center rounded-full"
                                                    >
                                                        <Ionicons name="share-social-outline" size={18} color="black" />
                                                    </TouchableOpacity>
                                                )}

                                                <View className={`w-8 h-8 rounded-full items-center justify-center border-2 z-10 ${isCompleted ? 'bg-swiss-red border-swiss-red' : 'bg-white border-gray-200'
                                                    }`}>
                                                    {isCompleted ? (
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    ) : (
                                                        <Text className="font-bold text-xs text-gray-400">
                                                            {index + 1}
                                                        </Text>
                                                    )}
                                                </View>

                                            </View>
                                        </View>

                                        <Text className="text-sm mt-4 text-zinc-950 font-bold leading-tight opacity-60">
                                            {milestone.description || 'Target objectives pending deployment.'}
                                        </Text>

                                        {isActive && (
                                            <View className="mt-4 flex-row items-center gap-2">
                                                <View className="bg-swiss-red px-3 py-1 rounded-full">
                                                    <Text className="text-white text-[9px] font-black tracking-widest uppercase">IN PROGRESS</Text>
                                                </View>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </>
            )}

            {/* ─── M-2: Share view only in DOM when shareData exists ──────────────── */}
            {shareData !== null && (
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
                                MISSION UPDATE
                            </Text>
                        </View>
                        <View className="flex-row gap-1">
                            <View className="w-2 h-2 rounded-full bg-white/40" />
                            <View className="w-2 h-2 rounded-full bg-white/40" />
                        </View>
                    </View>

                    {/* Main Content */}
                    <View className="flex-1 justify-center my-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="trophy" size={24} color="rgba(255,255,255,0.8)" />
                            <Text className="text-white/80 font-bold text-sm tracking-widest uppercase">
                                MILESTONE SECURED
                            </Text>
                        </View>

                        <Text
                            className="text-white font-black text-5xl leading-[50px] tracking-tight mb-8"
                            adjustsFontSizeToFit
                            numberOfLines={4}
                        >
                            {shareData?.milestone.title.toUpperCase() || ''}
                        </Text>

                        <View className="h-1 w-20 bg-white/30 rounded-full mb-6" />

                        <View className="self-start bg-white/20 px-5 py-3 rounded-xl border border-white/10">
                            <Text className="text-white font-bold text-sm tracking-widest uppercase">
                                {shareData?.milestone.deadline || ''}
                            </Text>
                        </View>
                    </View>

                    {/* Footer Section */}
                    <View className="flex-row justify-between items-end">
                        <View>
                            <Text className="text-white/60 text-[10px] font-bold tracking-[0.4em] mb-2 uppercase">DEPLOYED VIA</Text>
                            <Text className="text-white font-black text-2xl tracking-tighter">LOCKIN 2026</Text>
                            <View className="mt-1 flex-row gap-2 items-center">
                                <View className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                                <Text className="text-white/50 text-[9px] font-bold uppercase">System Online</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}
