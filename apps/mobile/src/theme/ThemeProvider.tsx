import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { lightColors, darkColors, type ThemeColors } from './colors';
import { spacing, borderRadius } from './spacing';
import { textStyles } from './typography';
import { shadows } from './shadows';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  textStyles: typeof textStyles;
  shadows: typeof shadows;
  isDark: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType extends Theme {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const toggleTheme = useCallback(() => {
    setThemeMode((m) => (m === 'dark' || (m === 'system' && isDark) ? 'light' : 'dark'));
  }, [isDark]);

  const value = useMemo<ThemeContextType>(
    () => ({ colors, spacing, borderRadius, textStyles, shadows, isDark, mode: themeMode, toggleTheme, setTheme: setThemeMode }),
    [colors, isDark, themeMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
