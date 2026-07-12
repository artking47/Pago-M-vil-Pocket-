import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import AddBankForm from './components/AddBankForm';
import SplashScreen from './components/SplashScreen';
import { getBanks, addBank, deleteBank } from './utils/storage';
import './index.css';

const APP_VERSION = 'v0.2.0';

function App() {
    const [banks, setBanks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showSplash, setShowSplash] = useState(() => {
        const lastSplash = sessionStorage.getItem('lastSplashTime');
        const now = Date.now();
        if (!lastSplash || now - parseInt(lastSplash) > 1000 * 60 * 60 * 2) {
            return true;
        }
        return false;
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [activeTab, setActiveTab] = useState('calculator');

    useEffect(() => {
        const loadedBanks = getBanks();
        setBanks(loadedBanks);
    }, []);

    const handleAddBank = (bankData) => {
        const newBank = addBank(bankData);
        setBanks(prev => [...prev, newBank]);
    };

    const handleDeleteBank = (id) => {
        setShowDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (showDeleteConfirm) {
            deleteBank(showDeleteConfirm);
            setBanks(prev => prev.filter(bank => bank.id !== showDeleteConfirm));
            setShowDeleteConfirm(null);
        }
    };

    const handleSplashFinish = () => {
        sessionStorage.setItem('lastSplashTime', Date.now().toString());
        setShowSplash(false);
    };

    if (showSplash) {
        return <SplashScreen onFinish={handleSplashFinish} />;
    }

    return (
        <ThemeProvider>
            <div className="App">
                <Dashboard
                    banks={banks}
                    onAddClick={() => setShowForm(true)}
                    onDelete={handleDeleteBank}
                    appVersion={APP_VERSION}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {showForm && (
                    <AddBankForm
                        onAdd={handleAddBank}
                        onClose={() => setShowForm(false)}
                    />
                )}

                {/* Modal de confirmación de eliminación */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
                        <div className="card-glass max-w-sm w-full p-6 text-center animate-slide-down">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-on-surface">
                                ¿Eliminar cuenta?
                            </h3>
                            <p className="text-sm mb-6 text-outline">
                                Esta acción no se puede deshacer. Los datos de esta cuenta serán eliminados permanentemente.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowDeleteConfirm(null)} className="btn-glass btn-glass-secondary py-3">
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="btn-glass py-3 font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, #df2935, #c1222d)' }}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ThemeProvider>
    );
}

export default App;
