import { View, Text, ScrollView, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Milestone } from '../types';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { FocusLogSprite } from '../components/dashboard/FocusLogSprite';
import { ScannerSprite } from '../components/dashboard/ScannerSprite';

export default function WarPathScreen() {
    const router = useRouter();
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    // Sharing Logic
    const shareViewRef = useRef<View>(null);
    const [shareData, setShareData] = useState<{ milestone: Milestone, index: number } | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        try {
            const savedStack = await AsyncStorage.getItem('milestoneStack');
            if (savedStack) {
                const parsed = JSON.parse(savedStack);
                // Validate data - ensure each milestone has required fields
                const validMilestones = Array.isArray(parsed)
                    ? parsed.filter((m: any) =>
                        m &&
                        typeof m.id === 'string' &&
                        typeof m.title === 'string' &&
                        typeof m.order === 'number'
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

    // Use useFocusEffect from expo-router to reload when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleShare = async (milestone: Milestone, index: number) => {
        try {
            setShareData({ milestone, index });

            // Wait for render
            setTimeout(async () => {
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
                    }
                }
            }, 100);
        } catch (error) {
            console.log(error);
        }
    };

    // Filter and sort milestones safely
    const sortedMilestones = [...milestones]
        .filter(m => m && typeof m.order === 'number')
        .sort((a, b) => a.order - b.order);
    const completedCount = sortedMilestones.filter(m => m.status === 'COMPLETED').length;
    const totalCount = sortedMilestones.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <SafeAreaView className="flex-1" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 bg-white flex-row justify-between items-center z-10">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="font-black text-lg tracking-tight">FOCUS LOG</Text>
                </View>
                <View />
            </View>

            <ScrollView className="flex-1 " contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {/* Bento Summary Grid */}
                <View className="flex-row flex-wrap gap-3 mb-8">
                    {/* Progress Card - Large */}
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

                    {/* Stats Cards - Half Width */}
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
                    <View className="h-[2px] flex-1 bg-black ml-4" />
                </View>
                <View className="gap-3">
                    {sortedMilestones.map((milestone, index) => {
                        const isActive = milestone.status === 'ACTIVE';
                        const isCompleted = milestone.status === 'COMPLETED';

                        return (

                            <TouchableOpacity
                                key={`${milestone.id}-${milestone.order}`}
                                className={`p-6 rounded-[24px] border-2 ${isActive ? 'bg-white border-swiss-red/40 shadow-lg shadow-swiss-red/20' :
                                    isCompleted ? 'bg-gray-50 border-gray-100' :
                                        ' border-gray-200 bg-gray-100'
                                    }`}
                                onPress={() => router.push({
                                    pathname: '/tactical-plan',
                                    params: {
                                        milestone: JSON.stringify(milestone),
                                        isActive: isActive.toString()
                                    }
                                })}
                                activeOpacity={0.9}
                            >
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1">
                                        <Text className={`text-[10px] font-black tracking-[0.3em] uppercase mb-2 ${isActive ? 'text-swiss-red' : 'text-gray-600'
                                            }`}>
                                            // {milestone.deadline ? format(new Date(milestone.deadline), 'MMM d, yyyy') : '00.00.00'}
                                        </Text>
                                        <Text className={`text-2xl font-black tracking-tighter uppercase leading-none ${isCompleted ? 'text-gray-500' : 'text-black'
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
                                        {isActive ? (
                                            <FocusLogSprite key={`sprite-${milestone.id}-${milestone.order}`} index={index} />
                                        ) : (
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
                                        )}
                                    </View>
                                </View>

                                <Text className="text-sm mt-4 text-zinc-950 font-bold leading-tight uppercase opacity-60">
                                    {milestone.description || 'Target objectives pending deployment.'}
                                </Text>

                                {isActive && (
                                    <View className="mt-4 flex-row items-center gap-2">
                                        <View className="bg-swiss-red px-3 py-1 rounded-full">
                                            <Text className="text-white text-[9px] font-black tracking-widest uppercase">ENGAGED</Text>
                                        </View>
                                        <View className="flex-1 h-[2px] bg-swiss-red" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Hidden Share Card View (Redesigned) */}
            <View
                style={{
                    position: 'absolute',
                    top: 1000,
                    left: 0,
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

                    {/* Character Stamp */}
                    <View className="items-center justify-center -mr-4 -mb-4">
                        <View className="scale-75">
                            <ScannerSprite state="APPROVED" showLabels={false} />
                        </View>
                        {/* Custom Label since we hid internal one */}
                        <View className="bg-white px-3 py-1 rounded-full -mt-2 border border-red-500 shadow-sm">
                            <Text className="text-swiss-red font-black text-[10px] tracking-widest uppercase">ALIGNED</Text>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView >
    );
}
