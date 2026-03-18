/**
 * ============================================
 * MATHLAB - SCRIPT PRINCIPAL (VERSÃO CORRIGIDA)
 * ============================================
 */

// ============================================
// MÓDULOS DE CONFIGURAÇÃO E INFRAESTRUTURA
// ============================================

// LINHA 10 - CORRIGIDA
import { isDevelopment, getConfigSummary } from './modules/00-env.js';
// Removeu 'getFirebaseConfig' daqui

import { createLogger, setLevel, info, warn, error, logPerformance } from './modules/99-logger.js';
import { trackPageView, trackPageLoad, setPrivacySettings } from './firebase/analytics.js';

// ============================================
// MÓDULOS FIREBASE
// ============================================
import { observarUsuario, verificarLogin } from './firebase/auth.js';
import { saveCalculation, saveUserConfig, recordMetric } from './firebase/collections.js';

// ============================================
// MÓDULOS BASE (UTILITÁRIOS E CONFIGURAÇÕES)
// ============================================
import { carregarConfiguracoes } from './modules/01-theme.js';
import { atualizarHistorico } from './modules/02-history.js';
import { formatNumber, isValidNumber, showError, showSuccess } from './modules/00-utils.js';

// ============================================
// MÓDULOS DE CALCULADORAS
// ============================================
import './modules/03-logaritmo.js';
import './modules/04-potencia.js';
import './modules/05-bhaskara.js';
import './modules/06-trigonometria.js';
import './modules/07-matrizes.js';
import './modules/08-derivadas.js';
import './modules/09-porcentagem.js';
import './modules/10-primos.js';
import './modules/11-mmc-mdc.js';
import './modules/12-quick-calc.js';
import './modules/18-conversao.js';

// ============================================
// MÓDULOS DE PÁGINAS ESPECÍFICAS
// ============================================
import './modules/13-interface.js';
import './modules/14-logout.js';
import './modules/15-index.js';
import './modules/16-login.js';
import './modules/17-admin.js';
import './modules/19-welcome.js';
import './modules/29-contato.js';
import './modules/30-perfil.js';

// ============================================
// VARIÁVEIS GLOBAIS DO SISTEMA
// ============================================
const logger = createLogger('main');
let startTime = Date.now();
let currentUser = null;
let pageName = window.location.pathname.split('/').pop() || 'index';

// ============================================
// FUNÇÕES AUXILIARES FALTANTES
// ============================================

/**
 * 📊 trackEvent - Registra eventos personalizados
 */
const trackEvent = (eventName, eventParams = {}) => {
    try {
        if (typeof trackPageView === 'function') {
            trackPageView(eventName, eventParams);
        }
        
        // Também registrar no logger
        logger.debug(`Evento: ${eventName}`, eventParams);
        
        // Registrar métrica
        recordMetric({
            tipo: 'event',
            evento: eventName,
            params: eventParams,
            page: pageName,
            userId: currentUser?.uid
        }).catch(err => warn('Erro ao registrar métrica de evento', err));
        
    } catch (err) {
        warn('Erro ao registrar evento', { error: err.message });
    }
};

/**
 * ❌ trackError - Registra erros
 */
const trackError = (errorMessage, errorDetails = {}) => {
    try {
        logger.error('Erro rastreado:', { message: errorMessage, ...errorDetails });
        
        // Registrar erro como métrica
        recordMetric({
            tipo: 'error',
            mensagem: errorMessage,
            detalhes: errorDetails,
            page: pageName,
            userId: currentUser?.uid
        }).catch(err => warn('Erro ao registrar erro', err));
        
    } catch (err) {
        warn('Erro ao trackear erro', err);
    }
};

// ============================================
// FUNÇÕES DE INICIALIZAÇÃO
// ============================================

/**
 * 🚀 initializeSystem - Inicializa o sistema completo
 */
const initializeSystem = async () => {
    try {
        logger.info('Iniciando sistema MathLab...');
        
        // 1. Configura ambiente e logging
        const configSummary = getConfigSummary();
        logger.info('Configurações carregadas', configSummary);
        
        // 2. Configura nível de log baseado no ambiente
        if (isDevelopment()) {
            setLevel(0); // DEBUG
        } else {
            setLevel(1); // INFO
        }
        
        // 3. Configura Analytics e privacidade
        if (typeof setPrivacySettings === 'function') {
            setPrivacySettings({
                analyticsEnabled: true,
                personalizationEnabled: true,
                dataSharingEnabled: false,
                cookieConsent: true
            });
        }
        
        // 4. Inicializa Firebase (se configurado)
        if (configSummary.firebaseConfigured) {
            await initializeFirebase();
        } else {
            warn('Firebase não configurado, usando modo offline');
        }
        
        // 5. Inicializa componentes UI
        initializeUIComponents();
        
        // 6. Registra métricas de inicialização
        const initTime = Date.now() - startTime;
        logPerformance('system_initialization', initTime);
        recordMetric({
            tipo: 'system_init',
            duration: initTime,
            environment: configSummary.environment,
            timestamp: new Date().toISOString()
        }).catch(err => warn('Erro ao registrar métrica de inicialização', err));
        
        logger.info(`Sistema inicializado com sucesso em ${initTime}ms`);
        
    } catch (err) {
        error('Erro crítico na inicialização', { error: err.message, stack: err.stack });
        showError('Erro ao inicializar o sistema. Por favor, recarregue a página.');
    }
};

/**
 * 🔥 initializeFirebase - Inicializa serviços Firebase
 */
const initializeFirebase = async () => {
    try {
        logger.info('Inicializando Firebase...');
        
        // Configura observador de autenticação
        observarUsuario((user) => {
            if (user.logado) {
                currentUser = user;
                logger.info('Usuário autenticado', { uid: user.uid, email: user.email });
                
                // Carrega configurações do usuário
                if (typeof saveUserConfig === 'function') {
                    saveUserConfig(user.uid, {
                        lastLogin: new Date().toISOString(),
                        pageAccessed: pageName
                    }).catch(err => warn('Erro ao salvar config do usuário', err));
                }
                
            } else {
                currentUser = null;
                logger.info('Usuário não autenticado');
            }
        });
        
        logger.info('Firebase inicializado com sucesso');
        
    } catch (err) {
        error('Erro ao inicializar Firebase', { error: err.message });
        throw err;
    }
};

/**
 * 🎨 initializeUIComponents - Inicializa componentes da interface
 */
const initializeUIComponents = () => {
    try {
        // Inicializa tema
        if (typeof carregarConfiguracoes === 'function') {
            carregarConfiguracoes();
        }
        
        // Inicializa histórico
        if (typeof atualizarHistorico === 'function') {
            atualizarHistorico();
        }
        
        // Configura tracking de eventos globais
        setupGlobalEventTracking();
        
        logger.info('Componentes UI inicializados');
        
    } catch (err) {
        error('Erro ao inicializar componentes UI', { error: err.message });
    }
};

/**
 * 📊 setupGlobalEventTracking - Configura tracking global
 */
const setupGlobalEventTracking = () => {
    // Tracking de cliques em botões
    document.addEventListener('click', (event) => {
        const target = event.target;
        
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            const button = target.tagName === 'BUTTON' ? target : target.closest('button');
            const buttonText = button.textContent.trim();
            const buttonClass = button.className;
            
            trackEvent('button_click', {
                button_text: buttonText,
                button_class: buttonClass,
                page: pageName,
                user_id: currentUser?.uid
            });
            
            logger.debug('Botão clicado', { text: buttonText, class: buttonClass });
        }
    });
    
    // Tracking de erros globais
    window.addEventListener('error', (event) => {
        error('Erro JavaScript capturado', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.stack
        });
        
        trackError(event.message, {
            type: 'javascript_error',
            filename: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });
    
    // Tracking de promessas rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
        error('Promessa rejeitada não tratada', {
            reason: event.reason,
            stack: event.reason?.stack
        });
        
        trackError('unhandled_rejection', {
            reason: event.reason?.toString()
        });
    });
    
    // Tracking de performance
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    const loadTime = perfData.loadEventEnd - perfData.fetchStart;
                    if (typeof trackPageLoad === 'function') {
                        trackPageLoad(loadTime);
                    }
                    logger.info('Performance da página registrada', { loadTime });
                    
                    // Registrar métrica de performance
                    recordMetric({
                        tipo: 'page_performance',
                        loadTime,
                        page: pageName
                    }).catch(err => warn('Erro ao registrar performance', err));
                }
            }, 0);
        });
    }
};

/**
 * 📄 trackPageAnalytics - Registra analytics da página
 */
const trackPageAnalytics = () => {
    try {
        // Page view tracking
        if (typeof trackPageView === 'function') {
            trackPageView(pageName, {
                title: document.title,
                referrer: document.referrer,
                user_agent: navigator.userAgent
            });
        }
        
        // User session tracking
        if (currentUser) {
            recordMetric({
                tipo: 'page_access',
                page: pageName,
                userId: currentUser.uid,
                timestamp: new Date().toISOString()
            }).catch(err => warn('Erro ao registrar acesso de página', err));
        }
        
        logger.info('Analytics da página registrados', { page: pageName });
        
    } catch (err) {
        warn('Erro ao registrar analytics', { error: err.message });
    }
};

// ============================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    logger.info('🚀 MathLab DOM carregado, iniciando sistema...');
    
    try {
        // Inicializa sistema completo
        await initializeSystem();
        
        // Registra analytics da página
        trackPageAnalytics();
        
        // Lista de módulos carregados
        const modulosCarregados = [
            'environment', 'logger', 'analytics', 'firebase', 'collections',
            'utils', 'theme', 'history', 'interface', 'logout',
            'logaritmo', 'potencia', 'bhaskara', 'trigonometria',
            'matrizes', 'derivadas', 'porcentagem', 'primos',
            'mmc-mdc', 'quick-calc', 'conversao',
            'index', 'login', 'admin', 'welcome', 'contato'
        ];
        
        logger.info(`📦 Módulos carregados: ${modulosCarregados.length} módulos`, {
            modules: modulosCarregados,
            environment: getConfigSummary().environment,
            firebase: getConfigSummary().firebaseConfigured
        });
        
        // Exibe status no console
        console.log('🎉 MathLab inicializado com sucesso!');
        console.log('📊 Configurações:', getConfigSummary());
        console.log('📦 Módulos:', modulosCarregados);
        
    } catch (err) {
        error('Erro fatal na inicialização', { error: err.message, stack: err.stack });
        showError('Falha crítica ao inicializar o sistema. Por favor, recarregue a página.');
    }
});

// ============================================
// EXPORTAÇÕES GLOBAIS (PARA DEBUG)
// ============================================
if (isDevelopment()) {
    window.MathLab = {
        logger,
        config: getConfigSummary,
        currentUser: () => currentUser,
        trackEvent,
        saveCalculation,
        pageName,
        version: '2.0'
    };
    
    console.log('🔧 Modo desenvolvimento: MathLab global disponível');
    console.log('ℹ️ Use window.MathLab para acessar o sistema');
}

console.log('✅ MathLab script principal carregado com sucesso');