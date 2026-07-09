// Utilidades para manejar LocalStorage

const STORAGE_KEY = 'pago_movil_data';

export const getBanks = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error al leer datos:', error);
        return [];
    }
};

export const saveBanks = (banks) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(banks));
        return true;
    } catch (error) {
        console.error('Error al guardar datos:', error);
        return false;
    }
};

export const addBank = (bankData) => {
    const banks = getBanks();
    const newBank = {
        id: Date.now().toString(),
        ...bankData,
        createdAt: new Date().toISOString()
    };
    banks.push(newBank);
    saveBanks(banks);
    return newBank;
};

export const deleteBank = (id) => {
    const banks = getBanks();
    const filtered = banks.filter(bank => bank.id !== id);
    saveBanks(filtered);
    return true;
};

export const updateBank = (id, updates) => {
    const banks = getBanks();
    const index = banks.findIndex(bank => bank.id === id);
    if (index !== -1) {
        banks[index] = { ...banks[index], ...updates };
        saveBanks(banks);
        return banks[index];
    }
    return null;
};

// Mapeo de bancos a logos locales y colores
export const BANK_DATA = {
    '100% Banco': { logo: null, color: '#FF6B00', gradient: 'from-orange-500 to-orange-700' },
    'Bancamiga': { logo: 'bancamiga.png', color: '#00A859', gradient: 'from-green-600 to-green-800' },
    'Bancaribe': { logo: 'BANCARIBE.png', color: '#003DA5', gradient: 'from-blue-700 to-cyan-600' },
    'Banco Activo': { logo: 'banco activo.png', color: '#0066CC', gradient: 'from-blue-600 to-blue-800' },
    'Banco Agrícola': { logo: null, color: '#76B82A', gradient: 'from-lime-600 to-green-700' },
    'Bicentenario': { logo: 'banco digital de los trabajadores.png', color: '#1D4F91', gradient: 'from-blue-700 to-blue-900' },
    'Banco Caroní': { logo: 'banco caroni.png', color: '#003DA5', gradient: 'from-blue-800 to-blue-950' },
    'BANCOEX': { logo: 'BANCO TEXTERIOR.png', color: '#0033A0', gradient: 'from-blue-700 to-indigo-800' },
    'Banco de Venezuela': { logo: 'banco de venezuela.png', color: '#ED1C24', gradient: 'from-red-500 to-red-700' },
    'Banco del Tesoro': { logo: 'BANCO DEL TESORO.png', color: '#00A859', gradient: 'from-green-600 to-green-800' },
    'Banco Exterior': { logo: 'BANCO TEXTERIOR.png', color: '#003DA5', gradient: 'from-blue-700 to-blue-900' },
    'BFC': { logo: 'BANCO FONDO COMUN.png', color: '#0066CC', gradient: 'from-blue-500 to-blue-700' },
    'BID': { logo: null, color: '#003DA5', gradient: 'from-blue-800 to-slate-900' },
    'BNC': { logo: 'banco nacional de credito (BNC).png', color: '#0066CC', gradient: 'from-blue-600 to-indigo-700' },
    'Banco Plaza': { logo: 'logobancoplaza.png', color: '#E31E24', gradient: 'from-red-600 to-red-800' },
    'Sofitasa': { logo: null, color: '#003DA5', gradient: 'from-blue-700 to-blue-900' },
    'Venezolano de Crédito': { logo: 'VENEZOLANO DE CREDITO.png', color: '#0066CC', gradient: 'from-blue-500 to-cyan-600' },
    'Bancrecer': { logo: 'bancrecer.png', color: '#00A859', gradient: 'from-emerald-600 to-green-700' },
    'Banesco': { logo: 'banesco.png', color: '#FF6B00', gradient: 'from-orange-500 to-orange-700' },
    'BANFANB': { logo: 'banfanb.webp', color: '#4A7C59', gradient: 'from-green-700 to-green-900' },
    'Bangente': { logo: 'bangente.png', color: '#003DA5', gradient: 'from-blue-800 to-indigo-900' },
    'Banplus': { logo: 'banplus.png', color: '#ED1C24', gradient: 'from-red-500 to-rose-700' },
    'BBVA Provincial': { logo: 'provincial.png', color: '#0033A0', gradient: 'from-blue-700 to-red-600' },
    'Delsur': { logo: null, color: '#003DA5', gradient: 'from-blue-700 to-slate-800' },
    'IMCP': { logo: null, color: '#00A859', gradient: 'from-teal-600 to-green-700' },
    'Mercantil': { logo: 'banco-mercantil.png', color: '#FDB913', gradient: 'from-yellow-400 to-yellow-600' },
    'Mi Banco': { logo: null, color: '#E31E24', gradient: 'from-red-600 to-pink-700' },
    'N58 Banco Digital': { logo: 'N58 NEO BANCO.png', color: '#FF6B00', gradient: 'from-orange-600 to-amber-700' },
    'R4 Microfinanciero': { logo: 'R4.png', color: '#00A859', gradient: 'from-green-500 to-emerald-700' },
};

export const BANK_LIST = Object.keys(BANK_DATA).sort();

// Función para obtener logo del banco
export const getBankLogo = (bankName) => {
    const bankInfo = BANK_DATA[bankName];
    if (bankInfo && bankInfo.logo) {
        return `/logos/${bankInfo.logo}`;
    }
    return null;
};

// Función para generar iniciales del banco como fallback
export const getBankInitials = (bankName) => {
    const words = bankName.split(' ').filter(word =>
        !['de', 'del', 'la', 'el', 'y'].includes(word.toLowerCase())
    );

    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return bankName.substring(0, 2).toUpperCase();
};

// Función para obtener color del banco
export const getBankColor = (bankName) => {
    return BANK_DATA[bankName]?.color || '#0066CC';
};

// Función para obtener gradiente del banco
export const getBankGradient = (bankName) => {
    return BANK_DATA[bankName]?.gradient || 'from-blue-500 to-blue-700';
};
