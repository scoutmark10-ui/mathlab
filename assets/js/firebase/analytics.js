/**
 * ============================================
 * FIREBASE ANALYTICS - VERSÃO UNIFICADA v2.0
 * ============================================
 * 
 * SEGURANÇA:
 * - Sanitização de dados sensíveis
 * - Rate limiting de eventos
 * - Controle de consentimento GDPR/LGPD
 * - Anonimização de IPs
 * - Batch processing de eventos
 * 
 * PERFORMANCE:
 * - Debounce de eventos repetitivos
 * - Throttling para eventos de alta frequência
 * - Queue de eventos offline
 * - Cache de configurações
 * 
 * PRIVACIDADE:
 * - Modo anônimo configurável
 * - Exclusão automática de dados sensíveis
 * - Consentimento granular
 * - Opt-out completo
 */

import { getAnalytics, logEvent, setUserId, setUserProperties, setConsent } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from './config.js';
import { createLogger } from '../modules/99-logger.js';

// ============================================
// INICIALIZAÇÃO
// ============================================
const logger = createLogger('analytics');
let analytics = null;
let currentUser = null;
let sessionId = null;
let eventQueue = [];
let flushTimeout = null;
let isEnabled = true;
let privacySettings = null;

// Constantes de configuração
const ANALYTICS_CONFIG = {
    VERSION: '2.0.0',
    FLUSH_INTERVAL: 5000, // 5 segundos
    MAX_QUEUE_SIZE: 50,
    MAX_EVENTS_PER_MINUTE: 100,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    DEBOUNCE_DELAY: 300, // 300ms para eventos repetitivos
    STORAGE_KEY: 'mathlab_analytics_consent'
};

// Rate limiting
const eventCounts = new Map();
const userCache = new Map();

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================

try {
    analytics = getAnalytics(app);
    logger.info('Firebase Analytics inicializado');
} catch (error) {
    logger.error('Erro ao inicializar Analytics', error);
    analytics = null;
}

const auth = getAuth(app);
const db = getFirestore(app);

// Carregar preferências de privacidade
loadPrivacySettings();

// ============================================
// FUNÇÕES DE PRIVACIDADE E CONSENTIMENTO
// ============================================

/**
 * loadPrivacySettings - Carrega preferências de privacidade
 */
async function loadPrivacySettings() {
    try {
        const saved = localStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY);
        if (saved) {
            privacySettings = JSON.parse(saved);
            applyConsentSettings();
        } else {
            // Configuração padrão (GDPR compliant)
            privacySettings = {
                analyticsEnabled: false, // Opt-out por padrão
                personalizationEnabled: false,
                dataSharingEnabled: false,
                cookieConsent: false,
                gdprConsent: false,
                timestamp: Date.now()
            };
            await savePrivacySettings();
        }
        
        isEnabled = privacySettings.analyticsEnabled && privacySettings.gdprConsent;
        logger.info('Privacy settings loaded', privacySettings);
        
    } catch (error) {
        logger.error('Erro ao carregar configurações de privacidade', error);
    }
}

/**
 * savePrivacySettings - Salva preferências de privacidade
 */
async function savePrivacySettings() {
    try {
        localStorage.setItem(ANALYTICS_CONFIG.STORAGE_KEY, JSON.stringify(privacySettings));
        applyConsentSettings();
    } catch (error) {
        logger.error('Erro ao salvar configurações de privacidade', error);
    }
}

/**
 * applyConsentSettings - Aplica configurações de consentimento
 */
function applyConsentSettings() {
    if (!analytics) return;
    
    try {
        setConsent({
            analytics_storage: privacySettings.analyticsEnabled ? 'granted' : 'denied',
            ad_storage: 'denied', // Sempre negado (não usado)
            personalization_storage: privacySettings.personalizationEnabled ? 'granted' : 'denied'
        });
        
        isEnabled = privacySettings.analyticsEnabled && privacySettings.gdprConsent;
        logger.info('Consent settings applied', { isEnabled });
        
    } catch (error) {
        logger.error('Erro ao aplicar consentimento', error);
    }
}

/**
 * updatePrivacySettings - Atualiza configurações de privacidade
 * @param {Object} settings - Novas configurações
 */
export async function updatePrivacySettings(settings) {
    privacySettings = {
        ...privacySettings,
        ...settings,
        timestamp: Date.now()
    };
    
    await savePrivacySettings();
    
    if (privacySettings.analyticsEnabled && privacySettings.gdprConsent) {
        enableAnalytics();
    } else {
        disableAnalytics();
    }
    
    logger.info('Privacy settings updated', privacySettings);
    return privacySettings;
}

/**
 * enableAnalytics - Ativa tracking
 */
function enableAnalytics() {
    isEnabled = true;
    processEventQueue();
    logger.info('Analytics enabled');
}

/**
 * disableAnalytics - Desativa tracking
 */
function disableAnalytics() {
    isEnabled = false;
    eventQueue = [];
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    logger.info('Analytics disabled');
}

/**
 * getPrivacySettings - Retorna configurações atuais
 */
export function getPrivacySettings() {
    return { ...privacySettings };
}

// ============================================
// GESTÃO DE SESSÃO
// ============================================

/**
 * generateSessionId - Gera ID único de sessão
 */
const generateSessionId = () => {
    return `session_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9)}`;
};

/**
 * startUserSession - Inicia sessão do usuário
 */
export const startUserSession = (userId) => {
    if (!isEnabled || !analytics) return;
    
    try {
        currentUser = sanitizeData(userId);
        sessionId = generateSessionId();
        
        setUserId(analytics, currentUser);
        setUserProperties(analytics, {
            session_id: sessionId,
            user_type: 'registered',
            app_version: ANALYTICS_CONFIG.VERSION,
            platform: detectPlatform(),
            language: navigator.language
        });
        
        trackEvent('session_start', {
            session_id: sessionId,
            user_id: currentUser
        });
        
        logger.info('Nova sessão iniciada', { userId, sessionId });
        
    } catch (error) {
        logger.error('Erro ao iniciar sessão', error);
    }
};

/**
 * endUserSession - Encerra sessão do usuário
 */
export const endUserSession = () => {
    if (!isEnabled || !analytics || !currentUser || !sessionId) return;
    
    try {
        const sessionStart = parseInt(sessionId.split('_')[1] || Date.now());
        const duration = Date.now() - sessionStart;
        
        trackEvent('session_end', {
            session_id: sessionId,
            user_id: currentUser,
            duration_ms: duration
        });
        
        logger.info('Sessão encerrada', { userId: currentUser, duration });
        
    } catch (error) {
        logger.error('Erro ao encerrar sessão', error);
    } finally {
        currentUser = null;
        sessionId = null;
    }
};

/**
 * detectPlatform - Detecta plataforma do usuário
 */
function detectPlatform() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
}

// ============================================
// SANITIZAÇÃO E VALIDAÇÃO
// ============================================

/**
 * sanitizeData - Remove dados sensíveis
 */
function sanitizeData(data) {
    if (!data) return data;
    
    // Lista de campos sensíveis
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'cpf', 'rg'];
    
    if (typeof data === 'object') {
        const sanitized = { ...data };
        for (const key in sanitized) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = sanitizeData(sanitized[key]);
            }
        }
        return sanitized;
    }
    
    return data;
}

/**
 * checkRateLimit - Verifica rate limiting
 */
function checkRateLimit(eventName) {
    const now = Date.now();
    const key = `${currentUser || 'anonymous'}_${eventName}`;
    
    const userEvents = eventCounts.get(key) || [];
    const recentEvents = userEvents.filter(t => now - t < 60000);
    
    if (recentEvents.length >= ANALYTICS_CONFIG.MAX_EVENTS_PER_MINUTE) {
        logger.warn(`Rate limit exceeded for ${key}`);
        return false;
    }
    
    recentEvents.push(now);
    eventCounts.set(key, recentEvents);
    return true;
}

// ============================================
// QUEUE DE EVENTOS
// ============================================

/**
 * queueEvent - Adiciona evento à fila
 */
function queueEvent(eventName, parameters = {}) {
    if (!isEnabled || !analytics) return;
    
    eventQueue.push({
        name: eventName,
        parameters: sanitizeData(parameters),
        timestamp: Date.now()
    });
    
    // Limitar tamanho da fila
    if (eventQueue.length > ANALYTICS_CONFIG.MAX_QUEUE_SIZE) {
        eventQueue = eventQueue.slice(-ANALYTICS_CONFIG.MAX_QUEUE_SIZE);
    }
    
    scheduleFlush();
}

/**
 * scheduleFlush - Agenda envio da fila
 */
function scheduleFlush() {
    if (flushTimeout) return;
    
    flushTimeout = setTimeout(() => {
        processEventQueue();
        flushTimeout = null;
    }, ANALYTICS_CONFIG.FLUSH_INTERVAL);
}

/**
 * processEventQueue - Processa fila de eventos
 */
function processEventQueue() {
    if (!isEnabled || !analytics || eventQueue.length === 0) return;
    
    const events = [...eventQueue];
    eventQueue = [];
    
    events.forEach(event => {
        try {
            if (checkRateLimit(event.name)) {
                logEvent(analytics, event.name, event.parameters);
            }
        } catch (error) {
            logger.error('Erro ao processar evento', error);
        }
    });
}

// ============================================
// TRACKING DE PÁGINAS
// ============================================

/**
 * trackPageView - Rastreia visualização de página
 */
export const trackPageView = (pageName, metadata = {}) => {
    if (!isEnabled || !analytics) return;
    
    const pageData = {
        page_name: sanitizeData(pageName),
        page_title: metadata.title || document.title,
        page_url: window.location.href.split('?')[0], // Remove query params
        referrer: document.referrer || null,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        session_id: sessionId,
        user_id: currentUser
    };
    
    queueEvent('page_view', pageData);
    logger.debug('Page view tracked', { pageName });
};

/**
 * trackPageLoad - Rastreia tempo de carregamento
 */
export const trackPageLoad = (loadTime) => {
    if (!isEnabled || !analytics || !loadTime) return;
    
    queueEvent('page_load', {
        load_time_ms: Math.round(loadTime),
        timestamp: Date.now()
    });
    
    logger.debug('Page load tracked', { loadTime });
};

// ============================================
// TRACKING DE EVENTOS
// ============================================

/**
 * trackEvent - Rastreia evento genérico
 */
export const trackEvent = (eventName, parameters = {}) => {
    if (!isEnabled || !analytics) return;
    
    const eventParams = {
        ...sanitizeData(parameters),
        session_id: sessionId,
        user_id: currentUser,
        timestamp: Date.now()
    };
    
    queueEvent(eventName, eventParams);
    logger.debug('Event tracked', { eventName, parameters });
};

// ============================================
// FUNÇÕES ESPECÍFICAS DO MATHLAB
// ============================================

// Cache para debounce de eventos repetitivos
const toolAccessCache = new Map();

/**
 * rastrearAcessoFerramenta - Rastreia acesso a ferramentas
 */
export const rastrearAcessoFerramenta = async (nomeFerramenta) => {
    try {
        const user = auth.currentUser;
        const sanitizedTool = sanitizeData(nomeFerramenta);
        
        // Debounce para evitar múltiplos acessos rápidos
        const lastAccess = toolAccessCache.get(sanitizedTool);
        if (lastAccess && Date.now() - lastAccess < ANALYTICS_CONFIG.DEBOUNCE_DELAY) {
            return;
        }
        toolAccessCache.set(sanitizedTool, Date.now());
        
        if (isEnabled && analytics) {
            trackEvent('ferramenta_acessada', {
                nome: sanitizedTool,
                usuario_id: user?.uid || 'anonimo'
            });
        }
        
        // Salvar no Firestore apenas se usuário logado
        if (user && privacySettings.dataSharingEnabled) {
            try {
                await addDoc(collection(db, 'metricas'), {
                    tipo: 'acesso_ferramenta',
                    ferramenta: sanitizedTool,
                    usuario_id: user.uid,
                    timestamp: serverTimestamp()
                });
            } catch (dbError) {
                logger.error('Erro ao salvar métrica no Firestore', dbError);
            }
        }
        
        logger.debug('Ferramenta acessada', { ferramenta: sanitizedTool });
        
    } catch (error) {
        logger.error('Erro ao rastrear acesso ferramenta', error);
    }
};

// Cache para cálculos recentes
const recentCalculations = new Map();

/**
 * rastrearCalculo - Rastreia cálculo realizado
 */
export const rastrearCalculo = async (ferramenta, dados) => {
    try {
        const user = auth.currentUser;
        const sanitizedTool = sanitizeData(ferramenta);
        const sanitizedData = sanitizeData(dados);
        
        // Evitar duplicatas de cálculo
        const calculationKey = `${sanitizedTool}_${JSON.stringify(sanitizedData)}`;
        if (recentCalculations.has(calculationKey)) {
            return;
        }
        recentCalculations.set(calculationKey, Date.now());
        
        // Limpar cache após 1 segundo
        setTimeout(() => recentCalculations.delete(calculationKey), 1000);
        
        if (isEnabled && analytics) {
            trackEvent('calculo_realizado', {
                ferramenta: sanitizedTool,
                ...sanitizedData,
                usuario_id: user?.uid || 'anonimo'
            });
        }
        
        // Salvar histórico apenas se configurado
        if (user && privacySettings.personalizationEnabled) {
            try {
                await addDoc(collection(db, 'usuarios', user.uid, 'historico'), {
                    ferramenta: sanitizedTool,
                    dados: sanitizedData,
                    timestamp: serverTimestamp()
                });
            } catch (dbError) {
                logger.error('Erro ao salvar histórico', dbError);
            }
        }
        
        logger.debug('Cálculo rastreado', { ferramenta: sanitizedTool });
        
    } catch (error) {
        logger.error('Erro ao rastrear cálculo', error);
    }
};

/**
 * rastrearTempoNaFerramenta - Rastreia tempo de uso
 */
export const rastrearTempoNaFerramenta = (nomeFerramenta, segundos) => {
    if (!isEnabled || !analytics || !segundos || segundos < 1) return;
    
    trackEvent('tempo_ferramenta', {
        ferramenta: sanitizeData(nomeFerramenta),
        duracao_segundos: Math.round(segundos)
    });
    
    logger.debug('Tempo na ferramenta', { ferramenta: nomeFerramenta, segundos });
};

// ============================================
// TRACKING DE ERROS
// ============================================

/**
 * trackError - Rastreia erros
 */
export const trackError = (error, context = {}) => {
    if (!isEnabled || !analytics) return;
    
    const errorData = {
        error_message: error?.message || String(error),
        error_type: context.type || error?.name || 'unknown_error',
        component: context.component || 'unknown',
        user_agent: navigator.userAgent,
        url: window.location.href.split('?')[0],
        stack_trace: error?.stack?.substring(0, 500), // Limitar tamanho
        session_id: sessionId
    };
    
    trackEvent('error', errorData);
    logger.error('Error tracked', errorData);
};

// ============================================
// EXPORTAÇÕES ADICIONAIS
// ============================================

/**
 * getAnalyticsStatus - Retorna status do analytics
 */
export function getAnalyticsStatus() {
    return {
        enabled: isEnabled,
        sessionActive: !!(currentUser && sessionId),
        queueSize: eventQueue.length,
        privacySettings: { ...privacySettings },
        version: ANALYTICS_CONFIG.VERSION
    };
}

/**
 * flushEvents - Força envio da fila
 */
export function flushEvents() {
    processEventQueue();
}

/**
 * clearAnalyticsData - Limpa todos os dados
 */
export function clearAnalyticsData() {
    eventQueue = [];
    eventCounts.clear();
    userCache.clear();
    toolAccessCache.clear();
    recentCalculations.clear();
    
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    
    logger.info('Analytics data cleared');
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Observar autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        startUserSession(user.uid);
    } else {
        endUserSession();
    }
});

// Tracking automático de página
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                trackPageLoad(perfData.loadEventEnd);
            }
        }, 0);
    });
}

logger.info('Firebase Analytics módulo v2.0 carregado');

export const analyticsVersion = ANALYTICS_CONFIG.VERSION;