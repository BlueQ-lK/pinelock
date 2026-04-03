import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { StorageService } from '../utils/StorageService';

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
  textWhite: string;
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
    textWhite: '#FFFFFF',
  },
  // We can add light/dark/default here later
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
    textWhite: '#FFFFFF',
  }
};

interface ThemeContextValue {
  theme: ThemeConfig;
  themeName: string;
  setThemeName: (name: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.catppuccin,
  themeName: 'catppuccin',
  setThemeName: async () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeName, setThemeNameState] = useState<string>('catppuccin');

  useEffect(() => {
    let isActive = true;
    const loadTheme = async () => {
      const savedTheme = await StorageService.getItem('activeTheme');
      if (isActive && savedTheme && themes[savedTheme]) {
        setThemeNameState(savedTheme);
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

  const currentTheme = themes[themeName] || themes.catppuccin;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};
