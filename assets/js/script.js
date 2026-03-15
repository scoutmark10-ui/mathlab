/**
 * ============================================
 * MATHLAB - SCRIPT PRINCIPAL (ATUALIZADO)
 * ============================================
 * 
 * 🚀 VISÃO GERAL:
 * =================
 * Script principal que orquestra todos os módulos do MathLab
 * Implementa inicialização segura e ordenada
 * Integra Firebase, Analytics, Logging e Environment
 * Fornece interface unificada para o sistema
 * 
 * 📦 MÓDULOS INTEGRADOS:
 * ========================
 * - Environment: Configurações e variáveis de ambiente
 * - Logger: Sistema completo de logs
 * - Firebase: Autenticação e banco de dados
 * - Analytics: Métricas e tracking
 * - Collections: Operações Firestore
 * - Theme: Sistema de temas
 * - Utils: Funções utilitárias
 * - Calculators: Todas as calculadoras
 * - Interface: Componentes UI
 * 
 * 🔧 FUNCIONALIDADES:
 * ===================
 * - Inicialização segura com validação
 * - Tracking automático de page views
 * - Sistema de logs centralizado
 * - Configurações dinâmicas
 * - Performance monitoring
 * - Error handling global
 * - Analytics integration
 */

// ============================================
// MÓDULOS DE CONFIGURAÇÃO E INFRAESTRUTURA
// ============================================
import { getFirebaseConfig, isDevelopment, getConfigSummary } from './modules/00-env.js';
import { createLogger, setLevel, info, warn, error, logPerformance } from './modules/99-logger.js';
import { trackPageView, trackPageLoad, setPrivacySettings } from './firebase/analytics-real.js';

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

// ============================================
// VARIÁVEIS GLOBAIS DO SISTEMA
// ============================================
const logger = createLogger('main');
let startTime = Date.now();
let currentUser = null;
let pageName = window.location.pathname.split('/').pop() || 'index';

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
        setPrivacySettings({
            analyticsEnabled: true,
            personalizationEnabled: true,
            dataSharingEnabled: false,
            cookieConsent: true
        });
        
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
        });
        
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
                saveUserConfig(user.uid, {
                    lastLogin: new Date().toISOString(),
                    pageAccessed: pageName
                });
                
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
    
    // Tracking de performance
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    trackPageLoad(perfData.loadEventEnd - perfData.fetchStart);
                    logger.info('Performance da página registrada', {
                        loadTime: perfData.loadEventEnd - perfData.fetchStart
                    });
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
        trackPageView(pageName, {
            title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent
        });
        
        // User session tracking
        if (currentUser) {
            recordMetric({
                tipo: 'page_access',
                page: pageName,
                userId: currentUser.uid,
                timestamp: new Date().toISOString()
            });
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
        config: getConfigSummary(),
        currentUser: () => currentUser,
        trackEvent,
        saveCalculation,
        pageName
    };
    
    console.log('🔧 Modo desenvolvimento: MathLab global disponível');
}

console.log('carregado')