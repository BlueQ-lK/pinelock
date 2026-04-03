import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { StorageService } from '../utils/StorageService';

export type ThemeMode = 'system' | 'light' | 'dark';

// Define the shape of our Theme object
export interface ThemeConfig {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderActive: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentForeground: string;
  danger: string;
  dangerForeground: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  overlay: string;
  // Extra mapping from Catppuccin palette
  surfaceVariant: string;
  outline: string;
  blackBackground: string;
  textAlt: string;
}

// Pre-defined themes
export const themes: Record<string, ThemeConfig> = {
  catppuccin: {
    background: '#E6E9EF',          // catppuccin_background
    surface: '#EFF1F5',             // catppuccin_surfaceContainer
    surfaceAlt: '#CDD0DA',          // catppuccin_surfaceBright
    border: '#d5d6d8',              // catppuccin_outlineVariant
    borderActive: '#8839EF',        // catppuccin_outline
    text: '#4C4F69',                // catppuccin_onBackground
    textSecondary: '#4C4F69',       // matching text for now, could be lighter
    accent: '#8839EF',              // catppuccin_primary
    accentForeground: '#DCE0E8',    // catppuccin_onPrimary
    danger: '#D20F39',              // catppuccin_error
    dangerForeground: '#DCE0E8',    // catppuccin_onError
    tabBarBg: '#E6E9EF',            // background
    tabBarActive: '#8839EF',        // catppuccin_primary
    tabBarInactive: '#ACB0BE',      // catppuccin_outlineVariant
    overlay: 'rgba(220, 224, 232, 0.8)', // semi-transparent catppuccin_onPrimary for overlay
    surfaceVariant: '#ffffff',
    outline: '#8839EF',
    blackBackground: '#2F3132',
    textAlt: '#FFFFFF',
  },
  greenApple: {
    background: '#F6FBF2',
    surface: '#EAEFE6',
    surfaceAlt: '#E4EAE1',
    border: '#e8e9eb',
    borderActive: '#005927',
    text: '#181D18',
    textSecondary: '#3F493F',
    accent: '#005927',
    accentForeground: '#FFFFFF',
    danger: '#BA1A1A',
    dangerForeground: '#FFFFFF',
    tabBarBg: '#F6FBF2',
    tabBarActive: '#005927',
    tabBarInactive: '#6F7A6E',
    overlay: 'rgba(0,0,0,0.5)',
    surfaceVariant: '#DAE6D7',
    outline: '#6F7A6E',
    blackBackground: '#2C322C',
    textAlt: '#FFFFFF',
  },
  midnightDusk: {
    background: '#FFFBFF',
    surface: '#F9E6F1',
    surfaceAlt: '#FCF3F8',
    border: '#ebecee',
    borderActive: '#BB0054',
    text: '#1C1B1F',
    textSecondary: '#524346',
    accent: '#BB0054',
    accentForeground: '#FFFFFF',
    danger: '#EF4444',
    dangerForeground: '#FFFFFF',
    tabBarBg: '#FFFBFF',
    tabBarActive: '#BB0054',
    tabBarInactive: '#847376',
    overlay: 'rgba(0,0,0,0.5)',
    surfaceVariant: '#F9E6F1',
    outline: '#847376',
    blackBackground: '#313033',
    textAlt: '#FFFFFF',
  },
  yinYang: {
    background: '#FDFDFD',
    surface: '#E8E8E8',
    surfaceAlt: '#ECECEC',
    border: '#ebecee',
    borderActive: '#000000',
    text: '#222222',
    textSecondary: '#515151',
    accent: '#000000',
    accentForeground: '#FFFFFF',
    danger: '#EF4444',
    dangerForeground: '#FFFFFF',
    tabBarBg: '#FDFDFD',
    tabBarActive: '#000000',
    tabBarInactive: '#838383',
    overlay: 'rgba(0,0,0,0.5)',
    surfaceVariant: '#E8E8E8',
    outline: '#838383',
    blackBackground: '#333333',
    textAlt: '#FFFFFF',
  },
  default: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceAlt: '#F3F4F6',
    border: '#e5e7eb',
    borderActive: '#000000',
    text: '#000000',
    textSecondary: '#6B7280',
    accent: '#FF3B30', // swiss-red
    accentForeground: '#FFFFFF',
    danger: '#EF4444',
    dangerForeground: '#FFFFFF',
    tabBarBg: '#FFFFFF',
    tabBarActive: '#FF3B30',
    tabBarInactive: '#D1D5DB',
    overlay: 'rgba(0,0,0,0.5)',
    surfaceVariant: '#e3e4e6',
    outline: '#FF3B30',
    blackBackground: '#2F3132',
    textAlt: '#FFFFFF',
  },
  defaultDark: {
    background: '#1C1B1F',
    surface: '#1C1C1E',
    surfaceAlt: '#2C2C2E',
    border: '#3A3A3C',
    borderActive: '#FFFFFF',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    accent: '#FF453A',
    accentForeground: '#FFFFFF',
    danger: '#FF453A',
    dangerForeground: '#FFFFFF',
    tabBarBg: '#000000',
    tabBarActive: '#FF453A',
    tabBarInactive: '#8E8E93',
    overlay: 'rgba(0,0,0,0.7)',
    surfaceVariant: '#3A3A3C',
    outline: '#FF453A',
    blackBackground: '#1C1C1E',
    textAlt: '#FFFFFF',
  },
  catppuccinDark: {
    background: '#181825',
    surface: '#1E1E2E',
    surfaceAlt: '#313244',
    border: '#585B70',
    borderActive: '#CBA6F7',
    text: '#CDD6F4',
    textSecondary: '#A6ADC8',
    accent: '#CBA6F7',
    accentForeground: '#11111B',
    danger: '#F38BA8',
    dangerForeground: '#11111B',
    tabBarBg: '#181825',
    tabBarActive: '#CBA6F7',
    tabBarInactive: '#585B70',
    overlay: 'rgba(17, 17, 27, 0.8)',
    surfaceVariant: '#1E1E2E',
    outline: '#CBA6F7',
    blackBackground: '#11111B',
    textAlt: '#000000',
  },
  greenAppleDark: {
    background: '#0F1510',
    surface: '#1C211C',
    surfaceAlt: '#262B26',
    border: '#3F493F',
    borderActive: '#7ADB8F',
    text: '#DFE4DB',
    textSecondary: '#BECABC',
    accent: '#7ADB8F',
    accentForeground: '#003917',
    danger: '#FFB4AB',
    dangerForeground: '#690005',
    tabBarBg: '#0F1510',
    tabBarActive: '#7ADB8F',
    tabBarInactive: '#889487',
    overlay: 'rgba(0,0,0,0.7)',
    surfaceVariant: '#3F493F',
    outline: '#889487',
    blackBackground: '#0A0F0B',
    textAlt: '#000000',
  },
  midnightDuskDark: {
    background: '#16151D',
    surface: '#281624',
    surfaceAlt: '#2D1C2A',
    border: '#251522',
    borderActive: '#F02475',
    text: '#E5E1E5',
    textSecondary: '#D6C1C4',
    accent: '#F02475',
    accentForeground: '#FFFFFF',
    danger: '#FFB4AB',
    dangerForeground: '#690005',
    tabBarBg: '#16151D',
    tabBarActive: '#F02475',
    tabBarInactive: '#9F8C8F',
    overlay: 'rgba(0,0,0,0.7)',
    surfaceVariant: '#281624',
    outline: '#9F8C8F',
    blackBackground: '#221320',
    textAlt: '#000000',
  },
  yinYangDark: {
    background: '#1E1E1E',
    surface: '#313131',
    surfaceAlt: '#383838',
    border: '#2D2D2D',
    borderActive: '#FFFFFF',
    text: '#E6E6E6',
    textSecondary: '#D1D1D1',
    accent: '#FFFFFF',
    accentForeground: '#1E1E1E',
    danger: '#FFB4AB',
    dangerForeground: '#690005',
    tabBarBg: '#1E1E1E',
    tabBarActive: '#FFFFFF',
    tabBarInactive: '#999999',
    overlay: 'rgba(0,0,0,0.7)',
    surfaceVariant: '#313131',
    outline: '#999999',
    blackBackground: '#2A2A2A',
    textAlt: '#000000',
  }
};

interface ThemeContextValue {
  theme: ThemeConfig;
  themeName: string;
  themeMode: ThemeMode;
  setThemeName: (name: string) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.catppuccin,
  themeName: 'catppuccin',
  themeMode: 'system',
  setThemeName: async () => { },
  setThemeMode: async () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeName, setThemeNameState] = useState<string>('catppuccin');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    let isActive = true;
    const loadTheme = async () => {
      const savedTheme = await StorageService.getItem('activeTheme');
      const savedMode = await StorageService.getItem('activeThemeMode');
      if (isActive) {
        if (savedTheme && themes[savedTheme]) setThemeNameState(savedTheme);
        if (savedMode) setThemeModeState(savedMode as ThemeMode);
      }
    };
    loadTheme();
    return () => { isActive = false; };
  }, []);

  const setThemeName = async (name: string) => {
    if (themes[name]) {
      setThemeNameState(name);
      await StorageService.setItem('activeTheme', name);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await StorageService.setItem('activeThemeMode', mode);
  };

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const currentTheme = (isDark && themes[`${themeName}Dark`]) ? themes[`${themeName}Dark`] : (themes[themeName] || themes.catppuccin);

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeName, themeMode, setThemeName, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
