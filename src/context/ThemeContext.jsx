import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('pago_movil_theme') || 'dark';
        } catch {
            return 'dark';
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        // Set data-theme for CSS custom properties
        root.setAttribute('data-theme', theme);
        // Set class for Tailwind darkMode: 'class'
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        // Update theme-color meta tag for browser chrome
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#f0f4ff' : '#0d0f1c');
        }
        
        try {
            localStorage.setItem('pago_movil_theme', theme);
        } catch { /* ignore */ }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
