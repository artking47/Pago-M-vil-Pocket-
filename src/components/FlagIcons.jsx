import React from 'react';

// Compact SVG flag icons to replace emoji flags (which render as text codes on Windows)
const flagStyle = { borderRadius: '3px', flexShrink: 0, display: 'inline-block' };

export function FlagUS({ size = 20 }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="60" height="42" fill="#B22234" />
            <rect y="3.23" width="60" height="3.23" fill="#fff" />
            <rect y="9.69" width="60" height="3.23" fill="#fff" />
            <rect y="16.15" width="60" height="3.23" fill="#fff" />
            <rect y="22.61" width="60" height="3.23" fill="#fff" />
            <rect y="29.07" width="60" height="3.23" fill="#fff" />
            <rect y="35.53" width="60" height="3.23" fill="#fff" />
            <rect width="24" height="22.61" fill="#3C3B6E" />
            <g fill="#fff" fontSize="3.5" fontFamily="Arial">
                {[...Array(5)].map((_, r) => (
                    [...Array(r % 2 === 0 ? 6 : 5)].map((_, c) => (
                        <circle key={`${r}-${c}`} cx={r % 2 === 0 ? 2 + c * 4 : 4 + c * 4} cy={1.8 + r * 4.4} r="1.2" />
                    ))
                ))}
            </g>
        </svg>
    );
}

export function FlagEU({ size = 20 }) {
    const h = size * 0.7;
    return (
        <svg width={size} height={h} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="60" height="42" fill="#003399" />
            <g transform="translate(30,21)">
                {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 - 90) * Math.PI / 180;
                    const cx = Math.cos(angle) * 14;
                    const cy = Math.sin(angle) * 14;
                    return (
                        <polygon key={i} points="0,-2.5 0.7,-0.8 2.4,-0.8 1.1,0.3 1.5,2 0,1 -1.5,2 -1.1,0.3 -2.4,-0.8 -0.7,-0.8"
                            fill="#FC0" transform={`translate(${cx},${cy})`} />
                    );
                })}
            </g>
        </svg>
    );
}

export function FlagCO({ size = 20 }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="60" height="21" fill="#FCD116" />
            <rect y="21" width="60" height="10.5" fill="#003893" />
            <rect y="31.5" width="60" height="10.5" fill="#CE1126" />
        </svg>
    );
}

export function FlagPE({ size = 20 }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="20" height="42" fill="#D91023" />
            <rect x="20" width="20" height="42" fill="#fff" />
            <rect x="40" width="20" height="42" fill="#D91023" />
        </svg>
    );
}

export function FlagVE({ size = 20 }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="60" height="14" fill="#CF142B" />
            <rect y="14" width="60" height="14" fill="#00247D" />
            <rect y="28" width="60" height="14" fill="#FC0" />
            <g fill="#fff" transform="translate(30, 21)">
                {[...Array(8)].map((_, i) => {
                    const angle = (i * 45 - 90) * Math.PI / 180;
                    return <circle key={i} cx={Math.cos(angle) * 8} cy={Math.sin(angle) * 4} r="1.2" />;
                })}
            </g>
        </svg>
    );
}

export function UsdtIcon({ size = 20 }) {
    const h = size * 0.7;
    return (
        <svg width={size} height={h} viewBox="0 0 60 42" style={flagStyle}>
            <rect width="60" height="42" rx="4" fill="#26A17B" />
            <text x="30" y="30" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="26" fontFamily="Arial, sans-serif">₮</text>
        </svg>
    );
}

// Map currency codes to flag components
export const FLAG_MAP = {
    USD: FlagUS,
    EUR: FlagEU,
    USDT: UsdtIcon,
    COP: FlagCO,
    PEN: FlagPE,
    VES: FlagVE,
};

export function CurrencyFlag({ code, size = 20 }) {
    const FlagComponent = FLAG_MAP[code];
    if (!FlagComponent) return <span style={{ fontSize: size * 0.8 }}>💱</span>;
    return <FlagComponent size={size} />;
}
