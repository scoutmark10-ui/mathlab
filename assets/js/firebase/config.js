// ============================================
// CONFIGURAÇÃO DO FIREBASE - VERSÃO COM ENV
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirebaseConfig, isDevelopment } from '../modules/00-env.js';

// Obtém configurações do módulo de ambiente
// ============================================
// CONFIGURAÇÃO DO FIREBASE - MÓDULO PRINCIPAL
// ============================================

// 🔐 Em produção, use variáveis de ambiente do Vercel
// Para desenvolvimento local, use import.meta.env

export const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || process.env?.FIREBASE_API_KEY,
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env?.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || process.env?.FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env?.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || process.env?.FIREBASE_APP_ID,
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || process.env?.FIREBASE_MEASUREMENT_ID
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
            
            // Log adicional em desenvolvimento
            if (isDevelopment()) {
                console.log('🔧 Modo desenvolvimento:', firebaseConfig.projectId);
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
            
            // Fallback para valores padrão em desenvolvimento
            if (isDevelopment()) {
                console.warn('⚠️ Usando configurações de fallback em desenvolvimento');
                // Aqui você poderia carregar configurações de backup
            }
        }
    }
    return app;
}

// Inicializa
app = getFirebaseApp();

export default app;

console.log('📦 Módulo de configuração Firebase carregado com segurança');