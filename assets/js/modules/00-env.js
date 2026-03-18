console.log('🔥 00-env.js executado');

// ============================================
// MÓDULO 00: GERENCIAMENTO DE VARIÁVEIS DE AMBIENTE
// ============================================

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================
const DEFAULT_CONFIG = {
    FIREBASE_API_KEY: 'AIzaSyDemoKeyForDevelopmentOnly',
    FIREBASE_AUTH_DOMAIN: 'mathlab-demo.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'mathlab-demo',
    FIREBASE_STORAGE_BUCKET: 'mathlab-demo.appspot.com',
    FIREBASE_MESSAGING_SENDER_ID: '123456789',
    FIREBASE_APP_ID: '1:123456789:web:demo123',
    FIREBASE_MEASUREMENT_ID: 'G-DEMO123456',
    APP_ENVIRONMENT: 'development',
    APP_VERSION: '1.0.0',
    APP_DEBUG: true,
};

let config = { ...DEFAULT_CONFIG };
let environment = 'development';

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * 🔑 get - Obtém variável de ambiente da configuração local
 */
const get = (key, defaultValue = null) => {
    return config[key] !== undefined ? config[key] : defaultValue;
};

/**
 * 🌍 getEnv - Obtém variável de ambiente do sistema
 */
const getEnv = (key, defaultValue) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const value = import.meta.env[key];
        if (value) console.log(`📦 import.meta.env.${key} = ${value}`);
        return value || defaultValue;
    }
    if (typeof process !== 'undefined' && process.env) {
        const value = process.env[key];
        if (value) console.log(`📦 process.env.${key} = ${value}`);
        return value || defaultValue;
    }
    return defaultValue;
};

/**
 * 🔍 detectEnvironment - Detecta ambiente atual
 */
const detectEnvironment = () => {
    const hostname = window.location.hostname;
    console.log('📍 Hostname:', hostname);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }
    if (hostname.includes('vercel.app')) {
        return 'production';
    }
    return 'development';
};

// ============================================
// FUNÇÕES EXPORTADAS
// ============================================

/**
 * 🔧 getFirebaseConfig - Retorna configuração do Firebase
 */
export const getFirebaseConfig = () => {
    const config = {
        apiKey: getEnv('VITE_FIREBASE_API_KEY', get('FIREBASE_API_KEY')),
        authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', get('FIREBASE_AUTH_DOMAIN')),
        projectId: getEnv('VITE_FIREBASE_PROJECT_ID', get('FIREBASE_PROJECT_ID')),
        storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', get('FIREBASE_STORAGE_BUCKET')),
        messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', get('FIREBASE_MESSAGING_SENDER_ID')),
        appId: getEnv('VITE_FIREBASE_APP_ID', get('FIREBASE_APP_ID')),
        measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID', get('FIREBASE_MEASUREMENT_ID'))
    };
    
    console.log('🔧 Firebase Config:', {
        ...config,
        apiKey: config.apiKey ? '***' : null
    });
    
    return config;
};

/**
 * 🌍 isDevelopment - Verifica ambiente de desenvolvimento
 */
export const isDevelopment = () => {
    environment = detectEnvironment();
    return environment === 'development';
};

/**
 * 📊 getConfigSummary - Resumo das configurações
 */
export const getConfigSummary = () => {
    const firebaseApiKey = getEnv('VITE_FIREBASE_API_KEY', get('FIREBASE_API_KEY'));
    
    const summary = {
        environment: detectEnvironment(),
        firebaseConfigured: !!firebaseApiKey && !firebaseApiKey.includes('DemoKey'),
        analyticsEnabled: getEnv('VITE_FIREBASE_ANALYTICS_ENABLED', 'true') === 'true',
        loggingEnabled: true,
        performanceMonitoring: true,
        appVersion: getEnv('VITE_APP_VERSION', '1.0.0'),
        debugMode: getEnv('VITE_APP_DEBUG', 'true') === 'true'
    };
    
    console.log('📊 Config Summary:', summary);
    return summary;
};

// Inicialização
environment = detectEnvironment();
console.log('🌍 Ambiente detectado:', environment);
console.log('🔧 Environment módulo carregado com segurança e validação');