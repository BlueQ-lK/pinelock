import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import Svg, { Path, Rect, Defs, Pattern } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';
import {
    checkScreenTimePermission,
    requestScreenTimePermission,
    getAppUsageToday,
    formatUsageTime,
    AppUsage
} from '../../utils/screenTimeUtils';

export default function Distractions() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [usage, setUsage] = useState<AppUsage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [manualDistraction, setManualDistraction] = useState('');
    const [manualLogs, setManualLogs] = useState<{id: string, text: string, time: string, date: string}[]>([]);

    useEffect(() => {
        const loadLogs = async () => {
             const logsStr = await AsyncStorage.getItem('distractionLog');
             if (logsStr) {
                 const parsed = JSON.parse(logsStr);
                 const todayStr = new Date().toDateString();
                 const todayLogs = parsed.filter((l: any) => l.date === todayStr);
                 setManualLogs(todayLogs);
             }
        };
        loadLogs();
    }, []);

    const logManualDistraction = async () => {
        if (!manualDistraction.trim()) return;
        const newLog = {
            id: Date.now().toString(),
            text: manualDistraction.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toDateString()
        };
        const updatedLogs = [newLog, ...manualLogs];
        setManualLogs(updatedLogs);
        setManualDistraction('');
        await AsyncStorage.setItem('distractionLog', JSON.stringify(updatedLogs));
    };

    const decorativeSquares = useMemo(() => {
        const gridSize = 40;
        const width = Dimensions.get('window').width;
        const height = 1000;
        const cols = Math.ceil(width / gridSize);
        return Array.from({ length: 20 }).map(() => ({
            x: Math.floor(Math.random() * cols) * gridSize,
            y: Math.floor(Math.random() * (height / gridSize)) * gridSize,
            opacity: Math.random() * 0.05 + 0.01
        }));
    }, []);

    const fetchData = async () => {
        if (Platform.OS !== 'android') {
            setIsLoading(false);
            return;
        }

        const permission = await checkScreenTimePermission();
        setHasPermission(permission);

        if (permission) {
            const stats = await getAppUsageToday();
            setUsage(stats);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const handleGrantPermission = () => {
        requestScreenTimePermission();
        // Use a small interval to check if permission was granted after returning from settings
        const interval = setInterval(async () => {
            const permission = await checkScreenTimePermission();
            if (permission) {
                setHasPermission(true);
                fetchData();
                clearInterval(interval);
            }
        }, 2000);
        // Cleanup interval after 30 seconds to avoid memory leak if user never grants it
        setTimeout(() => clearInterval(interval), 30000);
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text className="font-bold text-gray-400">LOADING STATS...</Text>
            </SafeAreaView>
        );
    }

    if (Platform.OS !== 'android') {
        const totalLogs = manualLogs.length;

        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <View className="absolute inset-0 w-full h-full opacity-40">
                    <Svg width="100%" height="100%">
                        <Defs>
                            <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                            </Pattern>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#grid)" />
                        {decorativeSquares.map((sq, i) => (
                            <Rect key={i} x={sq.x} y={sq.y} width="40" height="40" fill={`rgba(255,59,48, ${sq.opacity})`} />
                        ))}
                    </Svg>
                </View>

                <ScrollView 
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInDown.duration(400)} className="mb-8">
                        <Text className="font-black text-4xl tracking-tighter">DISTRACTIONS</Text>
                        <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase">MANUAL LOG</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-8">
                        <View className="bg-black p-8 rounded-[40px] shadow-2xl overflow-hidden relative">
                            <View className="absolute -right-8 -top-8 w-32 h-32 bg-swiss-red/20 rounded-full" />
                            <Text className="text-gray-400 font-bold text-xs tracking-widest mb-2">DISTRACTIONS LOGGED TODAY</Text>
                            <View className="flex-row items-end gap-2">
                                <Text className="text-white font-black text-6xl tracking-tighter">
                                    {totalLogs}
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-8">
                        <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <Text className="font-bold text-xs text-gray-400 tracking-widest mb-4">LOG DISTRACTION</Text>
                            <View className="flex-row items-center bg-gray-50 rounded-2xl p-2 border border-gray-100">
                                <TextInput
                                    value={manualDistraction}
                                    onChangeText={setManualDistraction}
                                    placeholder="What distracted you?"
                                    className="flex-1 p-3 font-bold text-base"
                                    onSubmitEditing={logManualDistraction}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity 
                                    onPress={logManualDistraction}
                                    className="bg-black w-12 h-12 rounded-xl items-center justify-center opacity-90"
                                >
                                    <Ionicons name="add" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Text className="font-bold text-xs text-gray-400 tracking-widest mb-4 ml-2">TODAY'S LOGS</Text>
                        <View className="bg-white rounded-[32px] border border-gray-100 p-2 shadow-sm">
                            {manualLogs.length === 0 ? (
                                <View className="p-8 items-center">
                                    <Text className="text-gray-400 font-medium italic">No distractions logged yet.</Text>
                                </View>
                            ) : (
                                manualLogs.map((log, index) => (
                                    <View key={log.id} className={`flex-row items-center p-4 ${index !== manualLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                        <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-4">
                                            <Ionicons name="warning-outline" size={20} color="#EF4444" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-black text-sm text-black">{log.text}</Text>
                                        </View>
                                        <Text className="font-bold text-xs text-gray-400">{log.time}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!hasPermission) {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top']}>
                <View className="p-6 pt-12">
                    <Text className="font-black text-4xl tracking-tighter mb-2">DISTRACTIONS</Text>
                    <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-12">PERMISSION REQUIRED</Text>

                    <View className="bg-black p-8 rounded-[32px] shadow-xl">
                        <View className="w-16 h-16 bg-swiss-red rounded-2xl items-center justify-center mb-6">
                            <Ionicons name="lock-open" size={32} color="white" />
                        </View>
                        <Text className="text-white font-black text-2xl mb-4">GRANT ACCESS</Text>
                        <Text className="text-gray-400 leading-6 mb-8">
                            To show which apps are taking your focus, we need permission to view your usage statistics.
                            Tap below to open system settings and enable "Lockin 2026".
                        </Text>
                        <TouchableOpacity
                            onPress={handleGrantPermission}
                            className="bg-white p-5 rounded-2xl items-center"
                        >
                            <Text className="font-black tracking-widest">OPEN SETTINGS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const totalUsageMs = usage.reduce((acc, curr) => acc + curr.totalTimeMs, 0);
    const topApps = usage.slice(0, 3);
    const remainingApps = usage.slice(3);

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Grid Background */}
            <View className="absolute inset-0 w-full h-full opacity-40">
                <Svg width="100%" height="100%">
                    <Defs>
                        <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                        </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#grid)" />
                    {decorativeSquares.map((sq, i) => (
                        <Rect key={i} x={sq.x} y={sq.y} width="40" height="40" fill={`rgba(255,59,48, ${sq.opacity})`} />
                    ))}
                </Svg>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text className="font-black text-4xl tracking-tighter">DISTRACTIONS</Text>
                    <Text className="font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-8">APP USAGE TODAY</Text>
                </Animated.View>

                {/* Total Time Bento Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-8">
                    <View className="bg-black p-8 rounded-[40px] shadow-2xl overflow-hidden relative">
                        {/* Decorative accent */}
                        <View className="absolute -right-8 -top-8 w-32 h-32 bg-swiss-red/20 rounded-full" />

                        <Text className="text-gray-400 font-bold text-xs tracking-widest mb-2">TOTAL SCREEN TIME</Text>
                        <View className="flex-row items-end gap-2">
                            <Text className="text-white font-black text-6xl tracking-tighter">
                                {formatUsageTime(totalUsageMs)}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Top 3 App Highlights */}
                {topApps.length > 0 && (
                    <View className="flex-row gap-4 mb-8">
                        {topApps.map((app, index) => (
                            <Animated.View
                                key={app.packageName}
                                entering={FadeInDown.delay(200 + index * 100).duration(400)}
                                className="flex-1 bg-gray-50 p-4 rounded-3xl border border-gray-100 items-center justify-center min-h-[120px]"
                            >
                                <View
                                    className="w-10 h-10 rounded-xl items-center justify-center mb-3 shadow-sm"
                                    style={{ backgroundColor: app.color }}
                                >
                                    <Ionicons name={app.iconName as any} size={20} color="white" />
                                </View>
                                <Text className="font-black text-[10px] text-center mb-1" numberOfLines={1}>
                                    {app.appName.toUpperCase()}
                                </Text>
                                <Text className="font-bold text-xs text-gray-500">
                                    {formatUsageTime(app.totalTimeMs)}
                                </Text>
                            </Animated.View>
                        ))}
                    </View>
                )}

                {/* Ranking List */}
                <Animated.View entering={FadeIn.delay(500).duration(400)}>
                    <Text className="font-bold text-xs text-gray-400 tracking-widest mb-6 ml-2">DETAILED BREAKDOWN</Text>

                    <View className="bg-white rounded-[32px] border border-gray-100 p-2 shadow-sm">
                        {usage.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-gray-400 font-medium italic">No usage data found for today.</Text>
                            </View>
                        ) : (
                            usage.map((app, index) => (
                                <View
                                    key={app.packageName}
                                    className={`flex-row items-center p-4 ${index !== usage.length - 1 ? 'border-b border-gray-50' : ''}`}
                                >
                                    <View
                                        className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                                        style={{ backgroundColor: app.color + '10' }} // 10% opacity
                                    >
                                        <Ionicons name={app.iconName as any} size={24} color={app.color} />
                                    </View>

                                    <View className="flex-1 mr-4">
                                        <View className="flex-row justify-between items-end mb-2">
                                            <Text className="font-black text-sm tracking-tight">{app.appName}</Text>
                                            <Text className="font-bold text-xs">{formatUsageTime(app.totalTimeMs)}</Text>
                                        </View>

                                        {/* Progress Bar */}
                                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <View
                                                className="h-full bg-swiss-red rounded-full"
                                                style={{
                                                    width: `${(app.totalTimeMs / topApps[0].totalTimeMs) * 100}%`,
                                                    backgroundColor: app.color
                                                }}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}
