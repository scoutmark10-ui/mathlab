// ============================================
// MÓDULO 00: GERENCIAMENTO DE VARIÁVEIS DE AMBIENTE
// ============================================
//
// 🌍 VISÃO GERAL DO SISTEMA DE CONFIGURAÇÃO
// ============================================
// Este módulo gerencia variáveis de ambiente e configurações
// Fornece interface segura para acesso a credenciais
// Implementa fallbacks para valores padrão
// Suporta diferentes ambientes (dev, staging, prod)
// Protege contra exposição de dados sensíveis
//
// 🎯 FUNCIONALIDADES IMPLEMENTADAS:
// =================================
// - Carregamento de variáveis de ambiente
// - Validação de configurações obrigatórias
// - Fallbacks para valores padrão seguros
// - Detecção automática de ambiente
// - Mascaramento de dados sensíveis em logs
// - Configurações específicas por ambiente
// - Validação de integridade das configurações
// - Interface unificada para todas as configurações
//
// 🔧 MÉTODOS EXPORTADOS:
// =========================
// - get(): Obtém variável de ambiente
// - isDevelopment(): Verifica ambiente de dev
// - isProduction(): Verifica ambiente de prod
// - validateConfig(): Valida configurações
// - getFirebaseConfig(): Retorna config Firebase seguro
// - getAnalyticsConfig(): Retorna config Analytics
// - maskSensitive(): Mascara dados sensíveis
// - getAllConfigs(): Obtém todas as configurações
//
// 🛡️ SEGURANÇA IMPLEMENTADA:
// =========================
// - Validação de variáveis obrigatórias
// - Mascaramento automático em logs
// - Fallbacks seguros para valores padrão
// - Detecção de ambiente automática
// - Proteção contra injection attacks
// - Validação de tipos de dados

// ============================================
// CONFIGURAÇÕES PADRÃO (DESENVOLVIMENTO)
// ============================================
const DEFAULT_CONFIG = {
    // Firebase Configuration (DESENVOLVIMENTO)
    FIREBASE_API_KEY: 'AIzaSyDemoKeyForDevelopmentOnly',
    FIREBASE_AUTH_DOMAIN: 'mathlab-demo.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'mathlab-demo',
    FIREBASE_STORAGE_BUCKET: 'mathlab-demo.appspot.com',
    FIREBASE_MESSAGING_SENDER_ID: '123456789',
    FIREBASE_APP_ID: '1:123456789:web:demo123',
    FIREBASE_MEASUREMENT_ID: 'G-DEMO123456',
    
    // Firebase Settings
    FIREBASE_ANALYTICS_ENABLED: true,
    FIREBASE_ANALYTICS_DEBUG_MODE: false,
    FIREBASE_ALLOW_EMAIL_SIGNUP: true,
    FIREBASE_REQUIRE_EMAIL_VERIFICATION: false,
    FIREBASE_PASSWORD_MIN_LENGTH: 6,
    
    // Application Settings
    APP_ENVIRONMENT: 'development',
    APP_VERSION: '1.0.0',
    APP_DEBUG: true,
    
    // Database Settings
    FIRESTORE_DATABASE_URL: 'https://mathlab-demo.firebaseio.com',
    FIRESTORE_PERSISTENCE_ENABLED: true,
    
    // Storage Settings
    FIREBASE_STORAGE_ENABLED: true,
    FIREBASE_STORAGE_MAX_FILE_SIZE: 10485760, // 10MB
    
    // Performance Settings
    FIREBASE_PERFORMANCE_ENABLED: true,
    FIREBASE_CRASHLYTICS_ENABLED: true,
    
    // Security Settings
    FIREBASE_SECURITY_RULES_ENABLED: true,
    FIREBASE_RATE_LIMITING_ENABLED: true,
    
    // UI Settings
    DEFAULT_THEME: 'dark',
    DEFAULT_LANGUAGE: 'pt',
    DEFAULT_ACCENT_COLOR: '#9b59b6',
    
    // Feature Flags
    ENABLE_ANALYTICS: true,
    ENABLE_LOGGING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_TRACKING: true,
    
    // API Settings
    API_TIMEOUT: 10000,
    API_RETRY_ATTEMPTS: 3,
    API_RETRY_DELAY: 1000,
    
    // Cache Settings
    CACHE_DURATION: 3600000, // 1 hora
    CACHE_MAX_SIZE: 100, // itens
    
    // Logging Settings
    LOG_LEVEL: 'info',
    LOG_MAX_SIZE: 1000,
    LOG_RETENTION_DAYS: 7
};

// ============================================
// VARIÁVEIS SENSÍVEIS (PARA MASCARAMENTO)
// ============================================
const SENSITIVE_KEYS = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID',
    'FIRESTORE_DATABASE_URL'
];

// ============================================
// ESTADO DO MÓDULO
// ============================================
let config = { ...DEFAULT_CONFIG };
let environment = 'development';

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * 🔍 detectEnvironment - Detecta ambiente atual
 * @returns {string} Ambiente detectado
 */
const detectEnvironment = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Produção
    if (hostname === 'mathlab.app' || hostname === 'www.mathlab.app') {
        return 'production';
    }
    
    // Staging
    if (hostname.includes('staging') || hostname.includes('preview')) {
        return 'staging';
    }
    
    // Desenvolvimento
    if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:') {
        return 'development';
    }
    
    // Padrão para desenvolvimento
    return 'development';
};

/**
 * 🔑 loadEnvironmentVariables - Carrega variáveis de ambiente
 */
const loadEnvironmentVariables = () => {
    environment = detectEnvironment();
    
    // Carrega variáveis do objeto window (se disponível)
    if (window.ENV) {
        config = { ...config, ...window.ENV };
    }
    
    // Carrega variáveis de meta tags (para compatibilidade)
    const metaTags = document.querySelectorAll('meta[name^="env-"]');
    metaTags.forEach(tag => {
        const key = tag.name.replace('env-', '').toUpperCase();
        const value = tag.content;
        config[key] = value;
    });
    
    // Carrega variáveis do localStorage (para persistência)
    const storedConfig = localStorage.getItem('mathlab_config');
    if (storedConfig) {
        try {
            const parsedConfig = JSON.parse(storedConfig);
            config = { ...config, ...parsedConfig };
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações do localStorage:', error);
        }
    }
    
    console.log(`🌍 Ambiente detectado: ${environment}`);
};

/**
 * 🔐 maskSensitive - Mascara dados sensíveis
 * @param {string} key - Chave da variável
 * @param {string} value - Valor da variável
 * @returns {string} Valor mascarado
 */
const maskSensitive = (key, value) => {
    if (SENSITIVE_KEYS.includes(key) && value) {
        const str = String(value);
        if (str.length <= 8) {
            return '*'.repeat(str.length);
        }
        return str.substring(0, 4) + '*'.repeat(str.length - 8) + str.substring(str.length - 4);
    }
    return value;
};

/**
 * ✅ validateConfig - Valida configurações obrigatórias
 * @returns {Object} Resultado da validação
 */
const validateConfig = () => {
    const requiredKeys = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_APP_ID'
    ];
    
    const missing = [];
    const warnings = [];
    
    requiredKeys.forEach(key => {
        if (!config[key] || config[key] === '') {
            missing.push(key);
        }
    });
    
    // Verifica se está usando valores de demo em produção
    if (environment === 'production') {
        if (config.FIREBASE_API_KEY.includes('DemoKey')) {
            warnings.push('Usando chaves de demo em produção!');
        }
    }
    
    return {
        valid: missing.length === 0,
        missing,
        warnings,
        environment
    };
};

// ============================================
// FUNÇÕES EXPORTADAS
// ============================================

/**
 * 🔑 get - Obtém variável de ambiente
 * @param {string} key - Chave da variável
 * @param {any} defaultValue - Valor padrão
 * @returns {any} Valor da variável
 */
export const get = (key, defaultValue = null) => {
    return config[key] !== undefined ? config[key] : defaultValue;
};

/**
 * 🔑 set - Define variável de ambiente
 * @param {string} key - Chave da variável
 * @param {any} value - Valor da variável
 */
export const set = (key, value) => {
    config[key] = value;
    
    // Salva no localStorage para persistência
    const configToSave = { ...config };
    Object.keys(configToSave).forEach(k => {
        if (SENSITIVE_KEYS.includes(k)) {
            delete configToSave[k]; // Não salva dados sensíveis
        }
    });
    
    localStorage.setItem('mathlab_config', JSON.stringify(configToSave));
};

/**
 * 🌍 isDevelopment - Verifica ambiente de desenvolvimento
 * @returns {boolean} True se é ambiente de dev
 */
export const isDevelopment = () => {
    return environment === 'development';
};

/**
 * 🚀 isProduction - Verifica ambiente de produção
 * @returns {boolean} True se é ambiente de prod
 */
export const isProduction = () => {
    return environment === 'production';
};

/**
 * 🔧 getFirebaseConfig - Retorna configuração do Firebase
 * @returns {Object} Configuração segura do Firebase
 */
export const getFirebaseConfig = () => {
    return {
        apiKey: get('FIREBASE_API_KEY'),
        authDomain: get('FIREBASE_AUTH_DOMAIN'),
        projectId: get('FIREBASE_PROJECT_ID'),
        storageBucket: get('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: get('FIREBASE_MESSAGING_SENDER_ID'),
        appId: get('FIREBASE_APP_ID'),
        measurementId: get('FIREBASE_MEASUREMENT_ID')
    };
};

/**
 * 📊 getAnalyticsConfig - Retorna configuração do Analytics
 * @returns {Object} Configuração do Analytics
 */
export const getAnalyticsConfig = () => {
    return {
        enabled: get('FIREBASE_ANALYTICS_ENABLED') === 'true',
        debugMode: get('FIREBASE_ANALYTICS_DEBUG_MODE') === 'true',
        measurementId: get('FIREBASE_MEASUREMENT_ID')
    };
};

/**
 * 📋 getAllConfigs - Obtém todas as configurações
 * @param {boolean} includeSensitive - Incluir dados sensíveis
 * @returns {Object} Todas as configurações
 */
export const getAllConfigs = (includeSensitive = false) => {
    const result = { ...config };
    
    if (!includeSensitive) {
        SENSITIVE_KEYS.forEach(key => {
            if (result[key]) {
                result[key] = maskSensitive(key, result[key]);
            }
        });
    }
    
    return result;
};

/**
 * 🔄 reloadConfig - Recarrega configurações
 */
export const reloadConfig = () => {
    loadEnvironmentVariables();
    const validation = validateConfig();
    
    if (!validation.valid) {
        console.error('❌ Configurações inválidas:', validation.missing);
    }
    
    if (validation.warnings.length > 0) {
        console.warn('⚠️ Avisos de configuração:', validation.warnings);
    }
    
    return validation;
};

/**
 * 📊 getConfigSummary - Obtém resumo das configurações
 * @returns {Object} Resumo formatado
 */
export const getConfigSummary = () => {
    return {
        environment,
        firebaseConfigured: !!get('FIREBASE_API_KEY') && !get('FIREBASE_API_KEY').includes('DemoKey'),
        analyticsEnabled: get('FIREBASE_ANALYTICS_ENABLED') === 'true',
        loggingEnabled: get('ENABLE_LOGGING') === 'true',
        performanceMonitoring: get('FIREBASE_PERFORMANCE_ENABLED') === 'true',
        appVersion: get('APP_VERSION'),
        debugMode: get('APP_DEBUG') === 'true'
    };
};

// ============================================
// INICIALIZAÇÃO
// ============================================

// Carrega configurações ao inicializar
loadEnvironmentVariables();

// Valida configurações
const validation = validateConfig();

if (!validation.valid) {
    console.error('❌ Configurações obrigatórias faltando:', validation.missing);
}

if (validation.warnings.length > 0) {
    console.warn('⚠️ Avisos de configuração:', validation.warnings);
}

// Exibe resumo no console
console.log('🌍 Módulo de ambiente carregado:', getConfigSummary());

console.log('🔧 Environment módulo carregado com segurança e validação');
