import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update Service Worker without waiting for browser restart
const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        console.log('[PWA] Nueva versión disponible, actualizando...');
        updateSW(true);
    },
    onRegisteredSW(swUrl, r) {
        if (r) {
            // Check for new version on start
            r.update();
            // Check for new version when user returns to app from background
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    r.update();
                }
            });
            window.addEventListener('focus', () => {
                r.update();
            });
            // Periodic check every 2 minutes
            setInterval(() => {
                r.update();
            }, 2 * 60 * 1000);
        }
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
