// ============================================
// FIREBASE ANALYTICS - VERSÃO UNIFICADA
// ============================================

import { getAnalytics, logEvent, setUserId, setUserProperties } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from './config.js';

// ============================================
// INICIALIZAÇÃO DOS SERVIÇOS
// ============================================
let analytics;
let currentUser = null;
let sessionId = null;

try {
    analytics = getAnalytics(app);
    console.log('📊 Firebase Analytics inicializado com sucesso');
} catch (error) {
    console.error('❌ Erro ao inicializar Analytics:', error);
}

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// GESTÃO DE SESSÃO
// ============================================

const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export const startUserSession = (userId) => {
    currentUser = userId;
    sessionId = generateSessionId();
    
    if (analytics) {
        setUserId(analytics, userId);
        setUserProperties(analytics, {
            session_id: sessionId,
            user_type: 'registered',
            app_version: '1.0.0'
        });
        
        logEvent(analytics, 'session_start', {
            session_id: sessionId,
            user_id: userId,
            timestamp: new Date().toISOString()
        });
    }
};

export const endUserSession = () => {
    if (analytics && currentUser && sessionId) {
        logEvent(analytics, 'session_end', {
            session_id: sessionId,
            user_id: currentUser,
            duration: Date.now() - parseInt(sessionId.split('_')[1]),
            timestamp: new Date().toISOString()
        });
    }
    currentUser = null;
    sessionId = null;
};

// ============================================
// RASTREAMENTO DE PÁGINAS
// ============================================

export const trackPageView = (pageName, metadata = {}) => {
    if (!analytics) return;
    
    logEvent(analytics, 'page_view', {
        page_name: pageName,
        page_title: metadata.title || document.title,
        page_url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        timestamp: new Date().toISOString(),
        ...metadata
    });
};

export const trackPageLoad = (loadTime) => {
    if (!analytics) return;
    
    logEvent(analytics, 'page_load', {
        load_time_ms: loadTime,
        timestamp: new Date().toISOString()
    });
};

// ============================================
// RASTREAMENTO DE EVENTOS
// ============================================

export const trackEvent = (eventName, parameters = {}) => {
    if (!analytics) return;
    
    logEvent(analytics, eventName, {
        ...parameters,
        timestamp: new Date().toISOString(),
        user_id: currentUser,
        session_id: sessionId
    });
};

// ============================================
// FUNÇÕES ESPECÍFICAS DO MATHLAB
// ============================================

export const rastrearAcessoFerramenta = async (nomeFerramenta) => {
    const user = auth.currentUser;
    
    if (analytics) {
        logEvent(analytics, 'ferramenta_acessada', {
            nome: nomeFerramenta,
            usuario_id: user?.uid || 'anonimo',
            timestamp: Date.now()
        });
    }
    
    if (user) {
        try {
            await addDoc(collection(db, 'metricas'), {
                tipo: 'acesso_ferramenta',
                ferramenta: nomeFerramenta,
                usuario_id: user.uid,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Erro ao salvar métrica:', error);
        }
    }
};

export const rastrearCalculo = async (ferramenta, dados) => {
    const user = auth.currentUser;
    
    if (analytics) {
        logEvent(analytics, 'calculo_realizado', {
            ferramenta: ferramenta,
            ...dados,
            usuario_id: user?.uid || 'anonimo'
        });
    }
    
    if (user) {
        try {
            await addDoc(collection(db, 'usuarios', user.uid, 'historico'), {
                ferramenta: ferramenta,
                dados: dados,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Erro ao salvar histórico:', error);
        }
    }
};

export const rastrearTempoNaFerramenta = (nomeFerramenta, segundos) => {
    if (analytics) {
        logEvent(analytics, 'tempo_ferramenta', {
            ferramenta: nomeFerramenta,
            duracao_segundos: segundos
        });
    }
};

// ============================================
// TRACKING DE ERROS
// ============================================

export const trackError = (error, context = {}) => {
    if (!analytics) return;
    
    logEvent(analytics, 'error', {
        error_message: error,
        error_type: context.type || 'javascript_error',
        component: context.component || 'unknown',
        user_agent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        ...context
    });
};

// ============================================
// CONFIGURAÇÕES DE PRIVACIDADE
// ============================================

export const setPrivacySettings = (settings) => {
    if (!analytics) return;
    
    setUserProperties(analytics, {
        privacy_analytics_enabled: settings.analyticsEnabled,
        personalization_enabled: settings.personalizationEnabled,
        data_sharing_enabled: settings.dataSharingEnabled,
        cookie_consent: settings.cookieConsent
    });
};

// Configurações padrão
setPrivacySettings({
    analyticsEnabled: true,
    personalizationEnabled: true,
    dataSharingEnabled: false,
    cookieConsent: true
});

console.log('📦 Firebase Analytics módulo carregado com sucesso');