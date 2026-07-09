import React from 'react';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-on-surface-variant transition-all duration-300 active:scale-95"
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {theme === 'light' ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
}

export default ThemeToggle;
