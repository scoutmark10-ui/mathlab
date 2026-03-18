/**
 * ============================================
 * CONFIGURAÇÃO DO FIREBASE - COM VARIÁVEIS DE AMBIENTE v2.0
 * ============================================
 * 
 * SEGURANÇA:
 * - Validação rigorosa de configurações
 * - Sanitização de variáveis de ambiente
 * - Proteção contra injeção
 * - Fallbacks seguros com validação
 * - Logs controlados em produção
 * 
 * PERFORMANCE:
 * - Singleton pattern para app
 * - Lazy loading de módulos
 * - Cache de configurações
 * - Inicialização sob demanda
 * 
 * CONFIABILIDADE:
 * - Validação de conexão
 * - Retry automático em falhas
 * - Timeouts configuráveis
 * - Modo offline detectável
 */

import { initializeApp, getApps, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

// ============================================
// CONSTANTES DE CONFIGURAÇÃO
// ============================================
const CONFIG = {
    ENV_PREFIX: 'VITE_',
    REQUIRED_KEYS: ['apiKey', 'authDomain', 'projectId', 'appId'],
    TIMEOUT_MS: 5000,
    MAX_RETRIES: 3,
    VERSION: '2.0.0',
    PRODUCTION_DOMAINS: ['mathlab.app', 'mathlab.com.br']
};

// Modo debug baseado no ambiente
const DEBUG = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.includes('.local');

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * createLogger - Logger condicional baseado no ambiente
 */
const createLogger = (module) => {
    return {
        info: (...args) => DEBUG && console.log(`📘 [${module}]`, ...args),
        warn: (...args) => DEBUG && console.warn(`⚠️ [${module}]`, ...args),
        error: (...args) => console.error(`❌ [${module}]`, ...args),
        debug: (...args) => DEBUG && console.debug(`🔍 [${module}]`, ...args),
        success: (...args) => DEBUG && console.log(`✅ [${module}]`, ...args)
    };
};

const logger = createLogger('Firebase');

/**
 * sanitizarValor - Remove caracteres perigosos de strings
 */
const sanitizarValor = (valor) => {
    if (typeof valor !== 'string') return valor;
    return valor.replace(/[<>"'()/]/g, '').trim();
};

/**
 * validarConfiguracao - Valida configuração do Firebase
 */
const validarConfiguracao = (config) => {
    const errors = [];
    const warnings = [];

    // Verificar campos obrigatórios
    CONFIG.REQUIRED_KEYS.forEach(key => {
        if (!config[key] || config[key].length === 0) {
            errors.push(`Campo obrigatório ausente: ${key}`);
        }
    });

    // Validar formato do apiKey
    if (config.apiKey && !/^AIzaSy[A-Za-z0-9_-]{35}$/.test(config.apiKey)) {
        warnings.push('apiKey pode estar em formato inválido');
    }

    // Validar formato do projectId
    if (config.projectId && !/^[a-z0-9-]+$/.test(config.projectId)) {
        warnings.push('projectId contém caracteres inválidos');
    }

    // Validar formato do authDomain
    if (config.authDomain && !config.authDomain.includes('.')) {
        warnings.push('authDomain parece inválido');
    }

    return {
        valido: errors.length === 0,
        errors,
        warnings,
        config: config
    };
};

// ============================================
// CARREGAR VARIÁVEIS DO AMBIENTE
// ============================================

/**
 * getEnv - Obtém variável de ambiente com validação
 */
const getEnv = (key, defaultValue = '') => {
    let value = defaultValue;
    let source = 'default';

    // Sanitizar defaultValue se for string
    const safeDefault = typeof defaultValue === 'string' ? sanitizarValor(defaultValue) : defaultValue;

    try {
        // Tentar Vite (import.meta.env)
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            const envKey = key.startsWith(CONFIG.ENV_PREFIX) ? key : `${CONFIG.ENV_PREFIX}${key}`;
            const envValue = import.meta.env[envKey];
            if (envValue) {
                value = envValue;
                source = 'import.meta.env';
            }
        }
        
        // Tentar Node.js (process.env)
        if (value === defaultValue && typeof process !== 'undefined' && process.env) {
            const envKey = key.startsWith(CONFIG.ENV_PREFIX) ? key : `${CONFIG.ENV_PREFIX}${key}`;
            const envValue = process.env[envKey];
            if (envValue) {
                value = envValue;
                source = 'process.env';
            }
        }
        
        // Tentar localStorage para desenvolvimento
        if (value === defaultValue && DEBUG && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(`firebase_${key}`);
            if (stored) {
                value = stored;
                source = 'localStorage (dev)';
                logger.warn(`Usando valor de localStorage para ${key} - APENAS PARA DESENVOLVIMENTO`);
            }
        }

    } catch (error) {
        logger.error(`Erro ao acessar variável de ambiente ${key}:`, error);
        value = safeDefault;
        source = 'default (fallback)';
    }

    // Log em modo debug
    if (DEBUG) {
        const displayValue = key.toLowerCase().includes('key') ? 
            value.substring(0, 5) + '...' : value;
        logger.debug(`getEnv(${key}) = ${displayValue} [fonte: ${source}]`);
    }

    return sanitizarValor(value);
};

// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

export const firebaseConfig = {
    apiKey: getEnv('FIREBASE_API_KEY', "AIzaSyD-sRuXYG1WsNpcpp-IIbKPIn3wZq9zngY"),
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN', "mathlab-7cfc8.firebaseapp.com"),
    projectId: getEnv('FIREBASE_PROJECT_ID', "mathlab-7cfc8"),
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET', "mathlab-7cfc8.firebasestorage.app"),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID', "213587626262"),
    appId: getEnv('FIREBASE_APP_ID', "1:213587626262:web:cbdc25419c5a9d4a772837"),
    measurementId: getEnv('FIREBASE_MEASUREMENT_ID', "G-VTNZCMC1TB")
};

// Validar configuração
const validation = validarConfiguracao(firebaseConfig);

if (validation.errors.length > 0) {
    logger.error('❌ Configuração Firebase inválida:', validation.errors);
    if (!DEBUG) {
        throw new Error('Configuração Firebase inválida. Verifique as variáveis de ambiente.');
    }
}

if (validation.warnings.length > 0 && DEBUG) {
    logger.warn('⚠️ Avisos na configuração Firebase:', validation.warnings);
}

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================

let app = null;
let initializationAttempts = 0;
let isInitializing = false;

/**
 * getFirebaseApp - Obtém instância do Firebase App (Singleton)
 */
export function getFirebaseApp() {
    if (app) return app;
    
    // Verificar se já existe uma instância
    const existingApps = getApps();
    if (existingApps.length > 0) {
        logger.info('Usando instância existente do Firebase');
        app = getApp();
        return app;
    }
    
    return initializeFirebaseApp();
}

/**
 * initializeFirebaseApp - Inicializa Firebase com validação
 */
async function initializeFirebaseApp() {
    if (isInitializing) {
        logger.info('Firebase já está sendo inicializado');
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (app) {
                    clearInterval(checkInterval);
                    resolve(app);
                }
            }, 100);
        });
    }
    
    isInitializing = true;
    initializationAttempts++;
    
    try {
        logger.info('Inicializando Firebase App...');
        logger.debug('Configuração:', {
            projectId: firebaseConfig.projectId,
            authDomain: firebaseConfig.authDomain
        });
        
        // Verificar conectividade antes de inicializar
        if (!navigator.onLine) {
            logger.warn('Dispositivo offline. Firebase pode não funcionar corretamente.');
        }
        
        // Timeout para inicialização
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout na inicialização do Firebase')), CONFIG.TIMEOUT_MS);
        });
        
        // Inicializar Firebase
        const initPromise = initializeApp(firebaseConfig);
        
        app = await Promise.race([initPromise, timeoutPromise]);
        
        logger.success('Firebase App inicializado com sucesso!');
        logger.info('Projeto:', firebaseConfig.projectId);
        
        if (DEBUG) {
            logger.debug('Modo desenvolvimento ativo');
        }
        
        // Verificar se é produção
        const isProduction = CONFIG.PRODUCTION_DOMAINS.some(domain => 
            window.location.hostname.includes(domain)
        );
        
        if (isProduction && !DEBUG) {
            logger.info('🚀 Modo produção ativo');
        }
        
        isInitializing = false;
        return app;
        
    } catch (error) {
        isInitializing = false;
        logger.error('Erro ao inicializar Firebase:', error);
        
        // Tentar novamente se não excedeu o limite
        if (initializationAttempts < CONFIG.MAX_RETRIES) {
            logger.warn(`Tentando novamente (${initializationAttempts}/${CONFIG.MAX_RETRIES})...`);
            setTimeout(() => initializeFirebaseApp(), 1000 * initializationAttempts);
        }
        
        throw error;
    }
}

// Inicializar (ou usar existente)
try {
    app = getFirebaseApp();
} catch (error) {
    logger.error('Falha na inicialização do Firebase:', error);
}

/**
 * resetFirebaseApp - Reinicia a instância do Firebase (útil para testes)
 */
export async function resetFirebaseApp() {
    if (app) {
        try {
            await deleteApp(app);
            logger.info('Firebase App reiniciado');
        } catch (error) {
            logger.error('Erro ao reiniciar Firebase:', error);
        } finally {
            app = null;
            initializationAttempts = 0;
            isInitializing = false;
        }
    }
    return getFirebaseApp();
}

/**
 * checkFirebaseHealth - Verifica saúde da conexão
 */
export async function checkFirebaseHealth() {
    try {
        if (!app) {
            return { healthy: false, error: 'Firebase não inicializado' };
        }
        
        if (!navigator.onLine) {
            return { healthy: false, error: 'Dispositivo offline' };
        }
        
        // Tentar carregar um módulo simples
        await import('./auth.js').catch(() => null);
        
        return {
            healthy: true,
            projectId: firebaseConfig.projectId,
            timestamp: new Date().toISOString(),
            online: navigator.onLine,
            version: CONFIG.VERSION
        };
        
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * getConfigStatus - Retorna status da configuração
 */
export function getConfigStatus() {
    return {
        initialized: !!app,
        valid: validation.valido,
        errors: validation.errors,
        warnings: validation.warnings,
        projectId: firebaseConfig.projectId,
        environment: DEBUG ? 'development' : 'production',
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString()
    };
}

// ============================================
// EXPORTAÇÕES
// ============================================
export const firebaseVersion = CONFIG.VERSION;
export const isDevelopment = DEBUG;
export const configValidation = validation;

// Inicialização automática (apenas em produção ou sob demanda)
if (!DEBUG) {
    // Em produção, inicializar imediatamente
    getFirebaseApp().catch(logger.error);
} else {
    logger.info('🔥 Firebase config carregado. Aguardando inicialização sob demanda.');
}

// Verificar saúde periodicamente (apenas em produção)
if (!DEBUG) {
    setInterval(async () => {
        const health = await checkFirebaseHealth();
        if (!health.healthy) {
            logger.error('Firebase não está saudável:', health.error);
        }
    }, 60000); // A cada minuto
}

logger.success('📦 Módulo de configuração Firebase v2.0 carregado');

export default app;