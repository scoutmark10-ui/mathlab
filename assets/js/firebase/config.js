// ============================================
// CONFIGURAÇÃO DO FIREBASE - MÓDULO PRINCIPAL
// ============================================
//
// 📋 INFORMAÇÕES IMPORTANTES:
// ================================
// - Projeto: mathlab-7cfc8
// - Ambiente: Produção
// - Serviços ativos: Auth, Firestore, Storage, Analytics
//
// 🔐 CREDENCIAIS SENSÍVEIS - NÃO EXPOR PUBLICAMENTE
// ========================================

// ============================================
// IMPORTAÇÕES FIREBASE MODULAR
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

// ============================================
// CONFIGURAÇÃO DO PROJETO FIREBASE
// ============================================
export const firebaseConfig = {
    // 🔑 AUTENTICAÇÃO E API
    apiKey: "AIzaSyD-sRuXYG1WsNpcpp-IIbKPIn3wZq9zngY",

    // 🌐 DOMÍNIOS AUTENTICADOS
    authDomain: "mathlab-7cfc8.firebaseapp.com",

    // 📁 IDENTIFICADORES DO PROJETO
    projectId: "mathlab-7cfc8",

    // 📦 STORAGE E ARQUIVOS
    storageBucket: "mathlab-7cfc8.firebasestorage.app",

    // 📨 MENSAGENS E NOTIFICAÇÕES
    messagingSenderId: "213587626262",

    // 📱 APLICAÇÃO WEB
    appId: "1:213587626262:web:cbdc25419c5a9d4a772837",

    // 📊 GOOGLE ANALYTICS
    measurementId: "G-VTNZCMC1TB"
};

// ============================================
// FUNÇÃO DE INICIALIZAÇÃO SEGURA
// ============================================
let app = null;

export function getFirebaseApp() {
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            console.log('✅ Firebase App inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
        }
    }
    return app;
}

// Inicializar imediatamente
app = getFirebaseApp();

// Exportar como default
export default app;

console.log('📦 Módulo de configuração Firebase carregado');