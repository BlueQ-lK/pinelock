import { Platform } from 'react-native';

// Defensive import for the native module
let UsageStats: any = null;
if (Platform.OS === 'android') {
    try {
        UsageStats = require('expo-android-usagestats');
    } catch (e) {
        console.warn('expo-android-usagestats not found, screen time features will be disabled.');
    }
}

export interface AppUsage {
    packageName: string;
    appName: string;
    totalTimeMs: number;
    iconName: string;
    color: string;
}

const APP_METADATA: Record<string, { name: string; icon: string; color: string }> = {
    'com.google.android.youtube': { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
    'com.instagram.android': { name: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
    'com.zhiliaoapp.musically': { name: 'TikTok', icon: 'musical-notes', color: '#000000' },
    'com.facebook.katana': { name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    'com.twitter.android': { name: 'X / Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    'com.whatsapp': { name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    'com.netflix.mediaclient': { name: 'Netflix', icon: 'play-circle', color: '#E50914' },
    'com.snapchat.android': { name: 'Snapchat', icon: 'chatbubble', color: '#FFFC00' },
    'com.reddit.frontpage': { name: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
    'com.linkedin.android': { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
    'com.google.android.apps.photos': { name: 'Photos', icon: 'images', color: '#4285F4' },
    'com.google.android.gm': { name: 'Gmail', icon: 'mail', color: '#EA4335' },
    'com.android.chrome': { name: 'Chrome', icon: 'globe', color: '#4285F4' },
};

export const checkScreenTimePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !UsageStats) return false;
    try {
        return await UsageStats.hasUsageStatsPermission();
    } catch (e) {
        return false;
    }
};

export const requestScreenTimePermission = (): void => {
    if (Platform.OS === 'android' && UsageStats) {
        UsageStats.requestUsageStatsPermission();
    }
};

export const getAppUsageToday = async (): Promise<AppUsage[]> => {
    if (Platform.OS !== 'android' || !UsageStats) return [];

    try {
        const end = Date.now();
        const start = new Date().setHours(0, 0, 0, 0);

        const stats = await UsageStats.getUsageStatistics(start, end);

        if (!stats || !Array.isArray(stats)) return [];

        const usage: AppUsage[] = stats
            .filter((s: any) => s.totalTimeInForeground > 0)
            .map((s: any) => {
                const meta = APP_METADATA[s.packageName] || {
                    name: s.packageName.split('.').pop() || 'Unknown',
                    icon: 'apps-outline',
                    color: '#6B7280',
                };

                return {
                    packageName: s.packageName,
                    appName: meta.name,
                    totalTimeMs: s.totalTimeInForeground,
                    iconName: meta.icon,
                    color: meta.color,
                };
            })
            .sort((a: any, b: any) => b.totalTimeMs - a.totalTimeMs);

        return usage;
    } catch (e) {
        console.error('Failed to fetch usage stats:', e);
        return [];
    }
};

export const formatUsageTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};
