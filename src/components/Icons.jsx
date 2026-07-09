import React from 'react';

// Pack de íconos SVG Lucide consistentes (strokeWidth 1.5, strokeLinecap round, strokeLinejoin round)
// Todos los íconos se exportan como componentes funcionales para tree-shaking

const iconDefaults = {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

const Icon = ({ className = 'w-5 h-5', children, ...props }) => (
    <svg className={className} {...iconDefaults} {...props}>
        {children}
    </svg>
);

// ═══════ MONEDAS Y FINANZAS ═══════

export const CurrencyIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
    </Icon>
);

export const WalletIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </Icon>
);

export const BanknoteIcon = ({ className }) => (
    <Icon className={className}>
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </Icon>
);

// ═══════ ACCIONES ═══════

export const CopyIcon = ({ className }) => (
    <Icon className={className}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
);

export const CheckIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M20 6 9 17l-5-5" />
    </Icon>
);

export const ShareIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </Icon>
);

export const TrashIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
    </Icon>
);

export const PlusIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </Icon>
);

export const XIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </Icon>
);

// ═══════ NAVEGACIÓN ═══════

export const ChevronUpIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m18 15-6-6-6 6" />
    </Icon>
);

export const ChevronDownIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m6 9 6 6 6-6" />
    </Icon>
);

export const ArrowLeftRightIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
    </Icon>
);

// ═══════ INFORMACIÓN ═══════

export const ShieldCheckIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
    </Icon>
);

export const LockIcon = ({ className }) => (
    <Icon className={className}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
);

export const InfoIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </Icon>
);

export const AlertCircleIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
    </Icon>
);

export const AlertTriangleIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </Icon>
);

// ═══════ UTILIDADES ═══════

export const RefreshIcon = ({ className, spin }) => (
    <Icon className={`${className || 'w-5 h-5'} ${spin ? 'animate-spin' : ''}`}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
    </Icon>
);

export const SunIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </Icon>
);

export const MoonIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Icon>
);

export const WifiIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.859a10 10 0 0 1 14 0" />
        <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </Icon>
);

export const WifiOffIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M12 20h.01" />
        <path d="M8.5 16.429a5 5 0 0 1 7 0" />
        <path d="M2 2l20 20" />
        <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
        <path d="M13.83 10.17A10 10 0 0 1 19 12.86" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5a15 15 0 0 1 11.34 3.82" />
    </Icon>
);

// ═══════ LAYOUTS ═══════

export const ListIcon = ({ className }) => (
    <Icon className={className}>
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
    </Icon>
);

export const Grid2Icon = ({ className }) => (
    <Icon className={className}>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
    </Icon>
);

export const Grid3Icon = ({ className }) => (
    <Icon className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="3" x2="21" y1="15" y2="15" />
        <line x1="9" x2="9" y1="3" y2="21" />
        <line x1="15" x2="15" y1="3" y2="21" />
    </Icon>
);

// ═══════ IDENTIDAD / CONTACTO ═══════

export const IdCardIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M16 10h2" />
        <path d="M16 14h2" />
        <path d="M6.17 15a3 3 0 0 1 5.66 0" />
        <circle cx="9" cy="11" r="2" />
        <rect x="2" y="5" width="20" height="14" rx="2" />
    </Icon>
);

export const PhoneIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Icon>
);

// ═══════ SEÑALES ═══════

export const SignalIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M2 20h.01" />
        <path d="M7 20v-4" />
        <path d="M12 20v-8" />
        <path d="M17 20V8" />
    </Icon>
);

export const RadioIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </Icon>
);

export const EditIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </Icon>
);

export const CalendarIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
    </Icon>
);

export const SparklesIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </Icon>
);

export const ClockIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </Icon>
);

export const CrystalBallIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="12" cy="10" r="8" />
        <path d="M12 2v1" />
        <path d="M5 18h14" />
        <path d="M7 21h10" />
    </Icon>
);
