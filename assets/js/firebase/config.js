// ============================================
// CONFIGURAÇÃO DO FIREBASE - MÓDULO PRINCIPAL
// ============================================
//
// 📋 INFORMAÇÕES IMPORTANTES:
// ================================
// - Projeto: mathlab-7cfc8
// - Ambiente: Produção
// - Serviços ativos: Auth, Firestore, Storage, Analytics
// - Segurança: Regras de segurança configuradas
//
// 🔐 CREDENCIAIS SENSÍVEIS - NÃO EXPOR!
// ========================================

/**
 * 📋 VISÃO GERAL DO MÓDULO FIREBASE
 * =============================================
 * 
 * Este módulo centraliza toda a configuração do Firebase e fornece:
 * - Configuração padronizada para todos os serviços
 * - Instância única do Firebase App
 * - Exportações convenientes para uso em outros módulos
 * 
 * 🚀 COMO UTILIZAR EM OUTROS ARQUIVOS:
 * ======================================
 * import app, { firebaseConfig } from './firebase/config.js';
 * import { getAuth } from 'firebase/auth';
 * import { getFirestore } from 'firebase/firestore';
 * 
 * 📦 SERVIÇOS CONFIGURADOS:
 * ============================
 * ✅ Firebase Authentication (usuários)
 * ✅ Cloud Firestore (banco de dados)
 * ✅ Firebase Storage (arquivos)
 * ✅ Firebase Analytics (métricas)
 * ✅ Cloud Messaging (notificações)
 */

// ============================================
// IMPORTAÇÕES FIREBASE
// ============================================
// Import SDK do Firebase App (necessário para inicialização)
// Versão: 12.10.0 (mais recente)

// ============================================
// CONFIGURAÇÃO DO PROJETO FIREBASE
// ============================================
// Projeto: mathlab-7cfc8
// Criado em: 2024
// Região: us-central
// Plano: Spark (gratuito)
export const firebaseConfig = {
    // ============================================
    // 🔑 AUTENTICAÇÃO E API
    // ============================================
    // Chave de API para identificação do projeto
    // ⚠️  MANTENHA SECRETA! Expor publicamente pode causar abuso.
    apiKey: "AIzaSyD-sRuXYG1WsNpcpp-IIbKPIn3wZq9zngY",

    // ============================================
    // 🌐 DOMÍNIOS AUTENTICADOS
    // ============================================
    // Domínios autorizados para redirecionamento OAuth
    authDomain: "mathlab-7cfc8.firebaseapp.com",

    // ============================================
    // 📁 IDENTIFICADORES DO PROJETO
    // ============================================
    // ID único do projeto no Firebase Console
    projectId: "mathlab-7cfc8",

    // ============================================
    // 📦 STORAGE E ARQUIVOS
    // ============================================
    // Bucket para armazenamento de imagens, documentos, etc.
    storageBucket: "mathlab-7cfc8.firebasestorage.app",

    // ============================================
    // 📨 MENSAGENS E NOTIFICAÇÕES
    // ============================================
    // ID do remetente para Cloud Messaging
    messagingSenderId: "213587626262",

    // ============================================
    // 📱 APLICAÇÃO WEB
    // ============================================
    // Identificador único da aplicação web
    appId: "1:213587626262:web:cbdc25419c5a9d4a772837",

    // ============================================
    // 📊 GOOGLE ANALYTICS
    // ============================================
    // ID para rastreamento e métricas de uso
    measurementId: "G-VTNZCMC1TB"
};

// ============================================
// INICIALIZAÇÃO DO FIREBASE
// ============================================
// Cria instância única do Firebase App
// Esta instância será usada por todos os outros serviços
const app = initializeApp(firebaseConfig);

// Exportar como default para facilitar importações
export default app;

// Log de inicialização para debug
console.log('📦 Firebase App inicializado:', firebaseConfig.projectId);
console.log('🔗 Firestore disponível:', app.firestore);
console.log('🔐 Auth disponível:', app.auth);
console.log('📁 Storage disponível:', app.storage);
console.log('📊 Analytics disponível:', app.analytics);