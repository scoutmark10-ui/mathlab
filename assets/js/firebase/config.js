// ============================================
// CONFIGURAÇÃO DO FIREBASE - COM VARIÁVEIS DE AMBIENTE
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

// ============================================
// CARREGAR VARIÁVEIS DO AMBIENTE
// ============================================
// ✅ No navegador, usamos import.meta.env (Vite)
//    ou process.env (se estiver usando Next.js)

const getEnv = (key, defaultValue) => {
    // Tenta diferentes fontes de variáveis de ambiente
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key] || defaultValue;
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    // Fallback para valores diretos (apenas desenvolvimento)
    return defaultValue;
};

export const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY', "AIzaSyD-sRuXYG1WsNpcpp-IIbKPIn3wZq9zngY"),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', "mathlab-7cfc8.firebaseapp.com"),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID', "mathlab-7cfc8"),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', "mathlab-7cfc8.firebasestorage.app"),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', "213587626262"),
    appId: getEnv('VITE_FIREBASE_APP_ID', "1:213587626262:web:cbdc25419c5a9d4a772837"),
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID', "G-VTNZCMC1TB")
};

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================
let app = null;

export function getFirebaseApp() {
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            console.log('✅ Firebase App inicializado com sucesso!');
            console.log('📊 Projeto:', firebaseConfig.projectId);
            console.log('🔧 Ambiente:', getEnv('VITE_APP_ENVIRONMENT', 'development'));
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
        }
    }
    return app;
}

app = getFirebaseApp();

export default app;

console.log('📦 Módulo de configuração Firebase carregado');