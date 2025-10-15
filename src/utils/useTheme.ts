/**
 * THEME MANAGEMENT HOOK
 * 
 * Manages light/dark mode with localStorage persistence
 * and system preference detection.
 * 
 * Features:
 * - Auto-detects system preference on first load
 * - Persists user choice in localStorage
 * - Applies theme class to document root
 */

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  // Initialize from localStorage or default to system
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chopdot-theme') as Theme;
      return stored || 'system';
    }
    return 'system';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      // Use explicit theme
      root.classList.add(theme);
    }
    
    // Store preference
    localStorage.setItem('chopdot-theme', theme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Get resolved theme (what's actually displayed)
  const getResolvedTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  return {
    theme,
    setTheme,
    resolvedTheme: getResolvedTheme(),
  };
}
