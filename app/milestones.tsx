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
import { useTheme } from '../contexts/ThemeContext';

// ─── M-4: React.memo for sprites to prevent unnecessary re-animations ─────────
// ─────────────────────────────────────────────────────────────────────────────

const FocusLogSkeleton = () => {
    const { theme } = useTheme();
    return (
        <>
            <View className="px-6 py-4 flex-row justify-between items-center z-10" style={{ backgroundColor: theme.background }}>
                <View className="p-2 w-10 h-10" />
                <View className="w-32 h-6 rounded animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                <View className="w-10 h-10" />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                removeClippedSubviews={true}
            >
                <View className="flex-row flex-wrap gap-3 mb-8">
                    <View className="w-full h-32 rounded-[24px] animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                    <View className="flex-1 h-24 rounded-[24px] animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                    <View className="flex-1 h-24 rounded-[24px] animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                </View>

                <View className="px-1 mb-4 flex-row justify-between items-center">
                    <View className="w-24 h-4 rounded animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                </View>

                <View className="gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} className="p-6 h-32 rounded-[24px] animate-pulse" style={{ backgroundColor: theme.surfaceAlt }} />
                    ))}
                </View>
            </ScrollView>
        </>
    );
};

export default function WarPathScreen() {
    const { theme } = useTheme();
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
        <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }}>
            {loading ? (
                <FocusLogSkeleton />
            ) : (
                <>
                    {/* Header */}
                    <View className="px-6 py-2 flex-row gap-4 items-center z-10" style={{ backgroundColor: theme.background }}>
                        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: theme.text }}>
                            <Ionicons name="arrow-back" size={24} color={theme.background} />
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="font-black text-lg tracking-tight" style={{ color: theme.text }}>FOCUS LOG</Text>
                        </View>
                        <View />
                    </View>

                    <ScrollView className="flex-1 " contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                        {/* Bento Summary Grid */}
                        <View className="flex-row flex-wrap gap-3 mb-8">
                            <View className="w-full p-6 rounded-[24px] flex-row justify-between items-center" style={{ backgroundColor: theme.accent }}>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: theme.accentForeground }}>Completion Status</Text>
                                    <Text className="text-6xl font-black tracking-tighter leading-none" style={{ color: theme.accentForeground }}>
                                        {Math.round(progress)}%
                                    </Text>
                                </View>
                                <View className="w-20 h-20 items-center justify-center rounded-full" style={{ backgroundColor: theme.accentForeground + '33' }}>
                                    <Ionicons name="analytics" size={40} color={theme.accentForeground} />
                                </View>
                            </View>

                            <View className="flex-1 p-5 rounded-[24px] border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                                <Text className="text-[10px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: theme.textSecondary }}>Cleared</Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-6xl font-black" style={{ color: theme.text }}>{completedCount}</Text>
                                    <Text className="text-3xl font-bold" style={{ color: theme.textSecondary }}>/ {totalCount}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                className="flex-1 p-5 rounded-[24px] flex justify-center items-center"
                                style={{ backgroundColor: theme.text }}
                                onPress={() => router.push('/edit-focus-plan')}
                            >
                                <Text className="text-lg font-black tracking-[0.2em] uppercase mb-1" style={{ color: theme.background }}>EDIT</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Timeline Header */}
                        <View className="px-1 mb-4 flex-row justify-between items-center">
                            <Text className="font-black text-sm tracking-[0.2em] uppercase" style={{ color: theme.text }}>Milestones</Text>
                        </View>
                        <View className="gap-3">
                            {sortedMilestones.map((milestone, index) => {
                                const isActive = milestone.status === 'ACTIVE';
                                const isCompleted = milestone.status === 'COMPLETED';

                                return (
                                    <TouchableOpacity
                                        key={`${milestone.id}-${milestone.order}`}
                                        className={`p-6 rounded-[24px] border-2`}
                                        style={{ 
                                            backgroundColor: isActive ? theme.surface : isCompleted ? theme.surfaceAlt : theme.surface,
                                            borderColor: isActive ? theme.accent + '33' : theme.border
                                        }}
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
                                                <Text className={`text-[10px] font-black uppercase mb-2`} style={{ color: isActive ? theme.accent : theme.textSecondary }}>
                                                    {milestone.deadline ? format(new Date(milestone.deadline), 'MMM d, yyyy') : '00.00.00'}
                                                </Text>
                                                <Text className={`text-2xl font-black tracking-tighter leading-none`} style={{ color: isCompleted ? theme.textSecondary : theme.text }}>
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
                                                        className="w-8 h-8 items-center justify-center rounded-full"
                                                        style={{ backgroundColor: theme.surfaceAlt }}
                                                    >
                                                        <Ionicons name="share-social-outline" size={18} color={theme.text} />
                                                    </TouchableOpacity>
                                                )}

                                                <View className={`w-8 h-8 rounded-full items-center justify-center border-2 z-10`} style={{ backgroundColor: isCompleted ? theme.accent : theme.surface, borderColor: isCompleted ? theme.accent : theme.border }}>
                                                    {isCompleted ? (
                                                        <Ionicons name="checkmark" size={16} color={theme.accentForeground} />
                                                    ) : (
                                                        <Text className="font-bold text-xs" style={{ color: theme.textSecondary }}>
                                                            {index + 1}
                                                        </Text>
                                                    )}
                                                </View>

                                            </View>
                                        </View>

                                        <Text className="text-sm mt-4 font-bold leading-tight opacity-60" style={{ color: theme.text }}>
                                            {milestone.description || 'Target objectives pending deployment.'}
                                        </Text>

                                        {isActive && (
                                            <View className="mt-4 flex-row items-center gap-2">
                                                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.accent }}>
                                                    <Text className="text-[9px] font-black tracking-widest uppercase" style={{ color: theme.accentForeground }}>IN PROGRESS</Text>
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
                        backgroundColor: theme.accent, 
                        padding: 32,
                        justifyContent: 'space-between'
                    }}
                    ref={shareViewRef}
                    collapsable={false}
                >
                    {/* Header Badge */}
                    <View className="flex-row justify-between items-start">
                        <View className="px-4 py-2 rounded-full" style={{ backgroundColor: theme.accentForeground + '33' }}>
                            <Text className="font-bold text-[10px] tracking-[0.3em] uppercase" style={{ color: theme.accentForeground }}>
                                MISSION UPDATE
                            </Text>
                        </View>
                        <View className="flex-row gap-1">
                            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentForeground + '66' }} />
                            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentForeground + '66' }} />
                        </View>
                    </View>

                    {/* Main Content */}
                    <View className="flex-1 justify-center my-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="trophy" size={24} color={theme.accentForeground + 'CC'} />
                            <Text className="font-bold text-sm tracking-widest uppercase" style={{ color: theme.accentForeground + 'CC' }}>
                                MILESTONE SECURED
                            </Text>
                        </View>

                        <Text
                            className="font-black text-5xl leading-[50px] tracking-tight mb-8"
                            adjustsFontSizeToFit
                            numberOfLines={4}
                            style={{ color: theme.accentForeground }}
                        >
                            {shareData?.milestone.title.toUpperCase() || ''}
                        </Text>

                        <View className="h-1 w-20 rounded-full mb-6" style={{ backgroundColor: theme.accentForeground + '4D' }} />

                        <View className="self-start px-5 py-3 rounded-xl border" style={{ backgroundColor: theme.accentForeground + '33', borderColor: theme.accentForeground + '1A' }}>
                            <Text className="font-bold text-sm tracking-widest uppercase" style={{ color: theme.accentForeground }}>
                                {shareData?.milestone.deadline || ''}
                            </Text>
                        </View>
                    </View>

                    {/* Footer Section */}
                    <View className="flex-row justify-between items-end">
                        <View>
                            <Text className="text-[10px] font-bold tracking-[0.4em] mb-2 uppercase" style={{ color: theme.accentForeground + '99' }}>DEPLOYED VIA</Text>
                            <Text className="font-black text-2xl tracking-tighter" style={{ color: theme.accentForeground }}>LOCKIN 2026</Text>
                            <View className="mt-1 flex-row gap-2 items-center">
                                <View className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                                <Text className="text-[9px] font-bold uppercase" style={{ color: theme.accentForeground + '80' }}>System Online</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}
