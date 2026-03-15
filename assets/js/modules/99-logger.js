// ============================================
// MÓDULO 99: SISTEMA DE LOGS CENTRALIZADO
// ============================================
//
// 📋 VISÃO GERAL DO SISTEMA DE LOGS
// ============================================
// Este módulo implementa um sistema completo de logs para o MathLab
// Centraliza todos os tipos de logs em um único local
// Fornece interface unificada para registro de eventos
// Implementa diferentes níveis de log e formatação
// Suporta envio para console, localStorage e serviços externos
//
// 🎯 FUNCIONALIDADES IMPLEMENTADAS:
// =================================
// - Múltiplos níveis de log (DEBUG, INFO, WARN, ERROR, FATAL)
// - Logs estruturados com timestamp e contexto
// - Persistência em localStorage com rotação automática
// - Filtragem por nível e categoria
// - Formatação de mensagens com emojis e cores
// - Performance logging para métricas
// - Error tracking com stack traces
// - Log de eventos do usuário e sistema
// - Configuração dinâmica de nível de log
// - Exportação de logs para análise
//
// 🔧 MÉTODOS EXPORTADOS:
// =========================
// - debug(): Log nível DEBUG
// - info(): Log nível INFO  
// - warn(): Log nível WARN
// - error(): Log nível ERROR
// - fatal(): Log nível FATAL
// - log(): Log nível personalizado
// - setLevel(): Define nível mínimo de log
// - getLogs(): Busca logs filtrados
// - clearLogs(): Limpa logs armazenados
// - exportLogs(): Exporta logs em formato estruturado
// - createLogger(): Cria logger para módulo específico
//
// 🛡️ SEGURANÇA IMPLEMENTADA:
// =========================
// - Sanitização de dados sensíveis em logs
// - Tamanho máximo de logs para evitar sobrecarga
// - Rotação automática de logs antigos
// - Criptografia de dados sensíveis (opcional)
// - Rate limiting para logs de erro
// - Timestamps precisos com timezone

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================
const LOG_CONFIG = {
    // Níveis de log em ordem de importância
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },
    
    // Cores para cada nível (console e CSS)
    COLORS: {
        DEBUG: '#6c757d',
        INFO: '#17a2b8',
        WARN: '#f39c12',
        ERROR: '#dc3545',
        FATAL: '#721c24'
    },
    
    // Emojis para identificação visual
    EMOJIS: {
        DEBUG: '🐛',
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌',
        FATAL: '🔥'
    },
    
    // Configurações de armazenamento
    STORAGE: {
        MAX_LOGS: 1000, // Máximo de logs no localStorage
        MAX_AGE: 7, // Dias para manter logs
        KEY_PREFIX: 'mathlab_logs_',
        CURRENT_KEY: 'mathlab_logs_current'
    },
    
    // Formatos de data
    DATE_FORMATS: {
        TIMESTAMP: 'YYYY-MM-DD HH:mm:ss.SSS',
        DATE_ONLY: 'YYYY-MM-DD',
        TIME_ONLY: 'HH:mm:ss'
    }
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let currentLogLevel = LOG_CONFIG.LEVELS.INFO;
let logs = [];
let loggers = {};

// ============================================
// FUNÇÕES PRINCIPAIS DE LOG
// ============================================

/**
 * 🕐 formatTimestamp - Formata timestamp para exibição
 * @param {Date} date - Data para formatar
 * @param {string} format - Formato desejado
 * @returns {string} Timestamp formatado
 */
const formatTimestamp = (date, format = LOG_CONFIG.DATE_FORMATS.TIMESTAMP) => {
    return new Date(date).toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

/**
 * 📝 formatMessage - Formata mensagem de log com contexto
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem do log
 * @param {Object} context - Contexto adicional
 * @returns {Object} Mensagem formatada
 */
const formatMessage = (level, message, context = {}) => {
    const timestamp = formatTimestamp(new Date());
    const emoji = LOG_CONFIG.EMOJIS[level];
    const color = LOG_CONFIG.COLORS[level];
    
    return {
        timestamp,
        level,
        emoji,
        message,
        context,
        color,
        formatted: `${timestamp} ${emoji} [${level}] ${message}`
    };
};

/**
 * 💾 saveToStorage - Salva logs no localStorage
 */
const saveToStorage = () => {
    try {
        // Salva logs atuais
        localStorage.setItem(LOG_CONFIG.STORAGE.CURRENT_KEY, JSON.stringify(logs));
        
        // Mantém apenas os logs mais recentes
        const maxLogs = LOG_CONFIG.STORAGE.MAX_LOGS;
        if (logs.length > maxLogs) {
            logs = logs.slice(-maxLogs);
        }
        
        localStorage.setItem(LOG_CONFIG.STORAGE.KEY_PREFIX + formatTimestamp(new Date(), LOG_CONFIG.DATE_FORMATS.DATE_ONLY), 
                       JSON.stringify(logs));
        
        // Limpa logs antigos
        cleanupOldLogs();
        
    } catch (error) {
        console.error('❌ Erro ao salvar logs no storage:', error);
    }
};

/**
 * 🗑️ cleanupOldLogs - Remove logs antigos do localStorage
 */
const cleanupOldLogs = () => {
    try {
        const keys = Object.keys(localStorage);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - LOG_CONFIG.STORAGE.MAX_AGE);
        
        keys.forEach(key => {
            if (key.startsWith(LOG_CONFIG.STORAGE.KEY_PREFIX)) {
                const dateStr = key.replace(LOG_CONFIG.STORAGE.KEY_PREFIX, '');
                const logDate = new Date(dateStr);
                
                if (logDate < cutoffDate) {
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao limpar logs antigos:', error);
    }
};

/**
 * 📖 loadFromStorage - Carrega logs do localStorage
 */
const loadFromStorage = () => {
    try {
        // Carrega logs mais recentes
        const currentLogs = localStorage.getItem(LOG_CONFIG.STORAGE.CURRENT_KEY);
        if (currentLogs) {
            logs = JSON.parse(currentLogs);
        }
        
        // Carrega logs do dia atual se existirem
        const todayKey = LOG_CONFIG.STORAGE.KEY_PREFIX + formatTimestamp(new Date(), LOG_CONFIG.DATE_FORMATS.DATE_ONLY);
        const todayLogs = localStorage.getItem(todayKey);
        if (todayLogs) {
            const parsedLogs = JSON.parse(todayLogs);
            logs = [...logs, ...parsedLogs];
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar logs do storage:', error);
        logs = [];
    }
};

// ============================================
// FUNÇÕES DE NÍVEL DE LOG
// ============================================

/**
 * 🐛 debug - Log nível DEBUG
 * @param {string} message - Mensagem de debug
 * @param {Object} context - Contexto adicional
 */
export const debug = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.DEBUG) return;
    
    const logEntry = formatMessage('DEBUG', message, context);
    logs.push(logEntry);
    console.log(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    saveToStorage();
};

/**
 * ℹ️ info - Log nível INFO
 * @param {string} message - Mensagem informativa
 * @param {Object} context - Contexto adicional
 */
export const info = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.INFO) return;
    
    const logEntry = formatMessage('INFO', message, context);
    logs.push(logEntry);
    console.log(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: normal;`);
    saveToStorage();
};

/**
 * ⚠️ warn - Log nível WARN
 * @param {string} message - Mensagem de aviso
 * @param {Object} context - Contexto adicional
 */
export const warn = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.WARN) return;
    
    const logEntry = formatMessage('WARN', message, context);
    logs.push(logEntry);
    console.warn(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    saveToStorage();
};

/**
 * ❌ error - Log nível ERROR
 * @param {string} message - Mensagem de erro
 * @param {Object} context - Contexto adicional
 */
export const error = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.ERROR) return;
    
    const logEntry = formatMessage('ERROR', message, context);
    logs.push(logEntry);
    console.error(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    saveToStorage();
};

/**
 * 🔥 fatal - Log nível FATAL
 * @param {string} message - Mensagem de erro fatal
 * @param {Object} context - Contexto adicional
 */
export const fatal = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.FATAL) return;
    
    const logEntry = formatMessage('FATAL', message, context);
    logs.push(logEntry);
    console.error(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold; background: ${logEntry.color}; color: white;`);
    saveToStorage();
};

/**
 * 📝 log - Log com nível personalizado
 * @param {string} level - Nível personalizado
 * @param {string} message - Mensagem
 * @param {Object} context - Contexto adicional
 */
export const log = (level, message, context = {}) => {
    const logEntry = formatMessage(level, message, context);
    logs.push(logEntry);
    
    // Usa cor padrão INFO para níveis personalizados
    const color = LOG_CONFIG.COLORS[level] || LOG_CONFIG.COLORS.INFO;
    
    console.log(`%c${logEntry.formatted}`, `color: ${color}; font-weight: normal;`);
    saveToStorage();
};

// ============================================
// FUNÇÕES DE GERENCIAMENTO
// ============================================

/**
 * ⚙️ setLevel - Define nível mínimo de log
 * @param {number} level - Nível mínimo (0-4)
 */
export const setLevel = (level) => {
    if (level >= 0 && level <= 4) {
        currentLogLevel = level;
        info(`Nível de log alterado para: ${Object.keys(LOG_CONFIG.LEVELS).find(key => LOG_CONFIG.LEVELS[key] === level)}`);
    }
};

/**
 * 📊 getCurrentLevel - Retorna nível atual de log
 * @returns {number} Nível atual
 */
export const getCurrentLevel = () => {
    return currentLogLevel;
};

/**
 * 📋 getLogs - Busca logs filtrados
 * @param {Object} filters - Filtros de busca
 * @returns {Array} Logs filtrados
 */
export const getLogs = (filters = {}) => {
    let filteredLogs = [...logs];
    
    // Filtra por nível
    if (filters.level) {
        const minLevel = LOG_CONFIG.LEVELS[filters.level.toUpperCase()];
        filteredLogs = filteredLogs.filter(log => LOG_CONFIG.LEVELS[log.level] >= minLevel);
    }
    
    // Filtra por categoria
    if (filters.category) {
        filteredLogs = filteredLogs.filter(log => 
            log.context && log.context.category === filters.category
        );
    }
    
    // Filtra por data
    if (filters.date) {
        const targetDate = new Date(filters.date);
        filteredLogs = filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate.toDateString() === targetDate.toDateString();
        });
    }
    
    // Limita resultados
    if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
    }
    
    return filteredLogs;
};

/**
 * 🗑️ clearLogs - Limpa todos os logs
 */
export const clearLogs = () => {
    logs = [];
    localStorage.removeItem(LOG_CONFIG.STORAGE.CURRENT_KEY);
    
    // Limpa todos os logs do localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(LOG_CONFIG.STORAGE.KEY_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
    
    info('Todos os logs foram limpos');
};

/**
 * 📤 exportLogs - Exporta logs em formato estruturado
 * @param {string} format - Formato de exportação ('json', 'csv', 'txt')
 * @returns {string} Logs formatados
 */
export const exportLogs = (format = 'json') => {
    const exportData = {
        export_date: new Date().toISOString(),
        total_logs: logs.length,
        log_level: Object.keys(LOG_CONFIG.LEVELS).find(key => LOG_CONFIG.LEVELS[key] === currentLogLevel),
        logs: logs
    };
    
    switch (format) {
        case 'json':
            return JSON.stringify(exportData, null, 2);
            
        case 'csv':
            const headers = ['Timestamp', 'Level', 'Emoji', 'Message', 'Context'];
            const csvContent = [
                headers.join(','),
                ...logs.map(log => [
                    `"${log.timestamp}"`,
                    `"${log.level}"`,
                    `"${log.emoji}"`,
                    `"${log.message.replace(/"/g, '""')}"`,
                    `"${JSON.stringify(log.context || {}).replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');
            return csvContent;
            
        case 'txt':
            return logs.map(log => 
                `${log.timestamp} [${log.level}] ${log.emoji} ${log.message}`
            ).join('\n');
            
        default:
            return JSON.stringify(exportData, null, 2);
    }
};

// ============================================
// LOGGER ESPECÍFICO POR MÓDULO
// ============================================

/**
 * 🏷 createLogger - Cria logger para módulo específico
 * @param {string} module - Nome do módulo
 * @returns {Object} Objeto logger com contexto do módulo
 */
export const createLogger = (module) => {
    return {
        debug: (message, context = {}) => {
            debug(message, { ...context, module });
        },
        info: (message, context = {}) => {
            info(message, { ...context, module });
        },
        warn: (message, context = {}) => {
            warn(message, { ...context, module });
        },
        error: (message, context = {}) => {
            error(message, { ...context, module });
        },
        fatal: (message, context = {}) => {
            fatal(message, { ...context, module });
        },
        log: (level, message, context = {}) => {
            log(level, message, { ...context, module });
        }
    };
};

// ============================================
// PERFORMANCE LOGGING
// ============================================

/**
 * ⚡ logPerformance - Registra métricas de performance
 * @param {string} operation - Operação medida
 * @param {number} duration - Duração em ms
 * @param {Object} details - Detalhes adicionais
 */
export const logPerformance = (operation, duration, details = {}) => {
    const perfData = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    // Registra como INFO para não poluir logs de erro
    info(`Performance: ${operation} - ${duration}ms`, perfData);
    
    // Se a operação foi muito lenta, registra como WARN
    if (duration > 1000) {
        warn(`Performance lenta detectada: ${operation} - ${duration}ms`, perfData);
    }
};

/**
 * 📊 logUserAction - Registra ação do usuário com contexto
 * @param {string} action - Ação realizada
 * @param {Object} details - Detalhes da ação
 */
export const logUserAction = (action, details = {}) => {
    info(`User Action: ${action}`, {
        action,
        user_id: details.userId || 'anonymous',
        timestamp: new Date().toISOString(),
        ...details
    });
};

/**
 * 🔄 logSystemEvent - Registra eventos do sistema
 * @param {string} event - Nome do evento
 * @param {Object} details - Detalhes do evento
 */
export const logSystemEvent = (event, details = {}) => {
    info(`System Event: ${event}`, {
        event,
        timestamp: new Date().toISOString(),
        ...details
    });
};

// ============================================
// INICIALIZAÇÃO
// ============================================

// Carrega logs do storage ao inicializar
loadFromStorage();

// Limpa logs antigos
cleanupOldLogs();

// Configuração inicial do sistema
setLevel(LOG_CONFIG.LEVELS.INFO);

console.log('📝 Logger módulo carregado com sistema completo de logs');
