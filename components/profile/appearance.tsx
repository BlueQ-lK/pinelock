import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useTheme, ThemeMode, themes } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const THEME_KEYS = [
    { key: 'default', label: 'Default' },
    { key: 'catppuccin', label: 'Catppuccin' },
    { key: 'greenApple', label: 'Green Apple' },
    { key: 'midnightDusk', label: 'Midnight Dusk' },
    { key: 'yinYang', label: 'Yin & Yang' }
];

export function AppearanceTab() {
    const { theme, themeName, setThemeName, themeMode, setThemeMode } = useTheme();
    const systemColorScheme = useColorScheme();
    const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

    const dynamicMocks = THEME_KEYS.map(({ key, label }) => {
        const targetTheme = (isDark && themes[`${key}Dark`]) ? themes[`${key}Dark`] : (themes[key] || themes.catppuccin);
        
        return {
            key,
            label,
            cardBg: targetTheme.background,
            pillBg: targetTheme.text,
            widgetBg: targetTheme.surface,
            switchLeft: targetTheme.danger,
            switchRight: targetTheme.accent,
            bottomCircle: targetTheme.accent,
            bottomLeftPill: targetTheme.outline,
            borderActive: targetTheme.accent,
            borderInactive: targetTheme.surfaceAlt
        };
    });

    const renderModeToggle = () => (
        <View className="mb-6 mx-2 mt-2">
            <View className="flex-row rounded-xl p-1" style={{ backgroundColor: theme.surfaceAlt }}>
                {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                    const isActive = themeMode === mode;
                    return (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setThemeMode(mode)}
                            activeOpacity={0.8}
                            className={`flex-1 items-center justify-center py-2 rounded-lg ${isActive ? 'shadow-sm' : ''}`}
                            style={{ backgroundColor: isActive ? theme.background : 'transparent' }}
                        >
                            <Text
                                className="font-semibold text-[13px] capitalize"
                                style={{ color: isActive ? theme.text : theme.textSecondary }}
                            >
                                {mode}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View className="mt-4">
            {renderModeToggle()}

            <Text className="font-bold text-[10px] tracking-[0.2em] mb-4 ml-2 opacity-60" style={{ color: theme.text }}>
                COLOR THEME
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 20 }}
            >
                {dynamicMocks.map((mock) => {
                    const isActive = themeName === mock.key;

                    return (
                        <View key={mock.key} className="items-center mr-5">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setThemeName(mock.key)}
                                className="w-[124px] h-[220px] rounded-3xl border-[4px] p-4 relative overflow-hidden"
                                style={{
                                    backgroundColor: mock.cardBg,
                                    borderColor: isActive ? mock.borderActive : "transparent",
                                }}
                            >
                                {/* Inactive Outline (rendered conditionally) */}
                                {!isActive && (
                                    <View className="absolute inset-0 rounded-[28px] border-[2px]" style={{ borderColor: mock.borderInactive }} />
                                )}

                                {/* Top row */}
                                <View className="flex-row justify-between items-start mb-6">
                                    <View className="h-6 rounded-full w-[65%]" style={{ backgroundColor: mock.pillBg }} />
                                    {isActive && (
                                        <View
                                            className="w-7 h-7 rounded-full items-center justify-center -mt-1 -mr-1"
                                            style={{ backgroundColor: mock.borderActive }}
                                        >
                                            <Ionicons name="checkmark-sharp" size={16} color={mock.cardBg} />
                                        </View>
                                    )}
                                </View>

                                {/* Main Widget Box */}
                                <View className="w-[85%] h-[80px] rounded-[20px] p-3" style={{ backgroundColor: mock.widgetBg }}>
                                    <View
                                        className="w-[44px] h-[20px] rounded-lg flex-row overflow-hidden"
                                        style={{ backgroundColor: mock.switchRight }}
                                    >
                                        <View className="w-1/2 h-full" style={{ backgroundColor: mock.switchLeft }} />
                                    </View>
                                </View>

                                {/* Bottom Elements left circle, right pill */}
                                <View className="absolute bottom-5 left-4 right-4 flex-row items-center">
                                    <View className="w-6 h-6 rounded-full mr-3" style={{ backgroundColor: mock.bottomCircle }} />
                                    <View className="flex-1 h-6 rounded-full" style={{ backgroundColor: mock.bottomLeftPill }} />
                                </View>
                            </TouchableOpacity>

                            <Text
                                className="font-bold text-[15px] tracking-tight mt-4"
                                style={{ color: theme.text, opacity: isActive ? 1 : 0.6 }}
                            >
                                {mock.label}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}
