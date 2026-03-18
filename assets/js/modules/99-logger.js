// ============================================
// MÓDULO 99: SISTEMA DE LOGS CENTRALIZADO v2.2
// ============================================

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================
const LOG_CONFIG = {
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },
    
    COLORS: {
        DEBUG: '#6c757d',
        INFO: '#17a2b8',
        WARN: '#f39c12',
        ERROR: '#dc3545',
        FATAL: '#721c24'
    },
    
    EMOJIS: {
        DEBUG: '🐛',
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌',
        FATAL: '🔥'
    },
    
    STORAGE: {
        MAX_LOGS: 200,
        MAX_LOGS_PER_DAY: 100,
        MAX_AGE: 3,
        KEY_PREFIX: 'mathlab_logs_',
        CURRENT_KEY: 'mathlab_logs_current',
        MAX_STORAGE_SIZE: 4 * 1024 * 1024,
        COMPRESSION_THRESHOLD: 0.7
    },
    
    RATE_LIMIT: {
        MAX_ERRORS_PER_MINUTE: 10,
        MAX_WARNS_PER_MINUTE: 20,
        WINDOW_MS: 60000
    },
    
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
let storageEnabled = true;
let rateLimitCounts = {
    ERROR: { count: 0, resetTime: Date.now() + LOG_CONFIG.RATE_LIMIT.WINDOW_MS },
    WARN: { count: 0, resetTime: Date.now() + LOG_CONFIG.RATE_LIMIT.WINDOW_MS }
};

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * 📊 checkStorageQuota - Verifica uso do localStorage
 */
const checkStorageQuota = () => {
    try {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += (key.length + value.length) * 2;
        }
        
        const percentUsed = (totalSize / LOG_CONFIG.STORAGE.MAX_STORAGE_SIZE) * 100;
        
        return {
            totalSize,
            percentUsed,
            isNearLimit: percentUsed > LOG_CONFIG.STORAGE.COMPRESSION_THRESHOLD * 100,
            isExceeded: totalSize >= LOG_CONFIG.STORAGE.MAX_STORAGE_SIZE
        };
    } catch (error) {
        return { totalSize: 0, percentUsed: 0, isNearLimit: false, isExceeded: false };
    }
};

/**
 * 🗜️ compressLogs - Comprime logs removendo dados menos importantes
 */
const compressLogs = () => {
    if (logs.length <= LOG_CONFIG.STORAGE.MAX_LOGS / 2) return;
    
    const importantLogs = logs.filter(log => 
        log.level === 'ERROR' || log.level === 'FATAL' || log.level === 'WARN'
    );
    
    const recentLogs = logs.slice(-LOG_CONFIG.STORAGE.MAX_LOGS / 2);
    
    const compressedLogs = [...new Map([...importantLogs, ...recentLogs].map(log => 
        [log.timestamp, log]
    )).values()];
    
    compressedLogs.forEach(log => {
        if (log.level === 'INFO' && log.context && 
            Date.now() - new Date(log.timestamp).getTime() > 86400000) {
            log.context = { compressed: true };
        }
    });
    
    logs = compressedLogs.slice(-LOG_CONFIG.STORAGE.MAX_LOGS);
};

/**
 * 🔄 checkRateLimit - Verifica rate limiting
 */
const checkRateLimit = (level) => {
    if (level !== 'ERROR' && level !== 'WARN') return true;
    
    const now = Date.now();
    const limit = level === 'ERROR' 
        ? LOG_CONFIG.RATE_LIMIT.MAX_ERRORS_PER_MINUTE 
        : LOG_CONFIG.RATE_LIMIT.MAX_WARNS_PER_MINUTE;
    
    if (now > rateLimitCounts[level].resetTime) {
        rateLimitCounts[level] = {
            count: 1,
            resetTime: now + LOG_CONFIG.RATE_LIMIT.WINDOW_MS
        };
        return true;
    }
    
    if (rateLimitCounts[level].count >= limit) {
        return false;
    }
    
    rateLimitCounts[level].count++;
    return true;
};

/**
 * 🕐 formatTimestamp - Formata timestamp para exibição
 */
const formatTimestamp = (date) => {
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
 */
const formatMessage = (level, message, context = {}) => {
    const timestamp = formatTimestamp(new Date());
    const emoji = LOG_CONFIG.EMOJIS[level] || '📝';
    const color = LOG_CONFIG.COLORS[level] || '#6c757d';
    
    let safeContext = {};
    try {
        safeContext = JSON.parse(JSON.stringify(context || {}));
    } catch {
        safeContext = { error: 'Contexto não serializável' };
    }
    
    return {
        timestamp,
        level,
        emoji,
        message: String(message).substring(0, 500),
        context: safeContext,
        color,
        formatted: `${timestamp} ${emoji} [${level}] ${message}`
    };
};

/**
 * 💾 saveToStorage - Salva logs no localStorage com fallback
 */
const saveToStorage = () => {
    if (!storageEnabled) return;
    
    try {
        const quota = checkStorageQuota();
        
        if (quota.isExceeded) {
            compressLogs();
            storageEnabled = false;
            
            try {
                const minimalLogs = logs.slice(-50).map(log => ({
                    timestamp: log.timestamp,
                    level: log.level,
                    message: log.message.substring(0, 100)
                }));
                localStorage.setItem(LOG_CONFIG.STORAGE.CURRENT_KEY, JSON.stringify(minimalLogs));
                storageEnabled = true;
            } catch (e) {
                storageEnabled = false;
            }
            return;
        }
        
        if (quota.isNearLimit) {
            compressLogs();
        }
        
        const logsToSave = logs.slice(-LOG_CONFIG.STORAGE.MAX_LOGS);
        localStorage.setItem(LOG_CONFIG.STORAGE.CURRENT_KEY, JSON.stringify(logsToSave));
        
        if (!quota.isNearLimit) {
            const todayKey = LOG_CONFIG.STORAGE.KEY_PREFIX + 
                           formatTimestamp(new Date()).split(' ')[0];
            localStorage.setItem(todayKey, JSON.stringify(logsToSave));
        }
        
        cleanupOldLogs();
        
    } catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            storageEnabled = false;
            try {
                const emergencyLogs = logs.slice(-20).map(log => ({
                    timestamp: log.timestamp,
                    level: log.level,
                    message: log.message.substring(0, 50)
                }));
                localStorage.setItem('mathlab_logs_emergency', JSON.stringify(emergencyLogs));
            } catch (e) {}
        }
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
            if (key.startsWith(LOG_CONFIG.STORAGE.KEY_PREFIX) && key !== LOG_CONFIG.STORAGE.CURRENT_KEY) {
                const dateStr = key.replace(LOG_CONFIG.STORAGE.KEY_PREFIX, '');
                const logDate = new Date(dateStr);
                
                if (!isNaN(logDate) && logDate < cutoffDate) {
                    localStorage.removeItem(key);
                }
            }
        });
        
    } catch (error) {}
};

/**
 * 📖 loadFromStorage - Carrega logs do localStorage
 */
const loadFromStorage = () => {
    try {
        const currentLogs = localStorage.getItem(LOG_CONFIG.STORAGE.CURRENT_KEY);
        if (currentLogs) {
            logs = JSON.parse(currentLogs);
        }
        
        if (!logs.length) {
            const emergencyLogs = localStorage.getItem('mathlab_logs_emergency');
            if (emergencyLogs) {
                logs = JSON.parse(emergencyLogs);
            }
        }
        
    } catch (error) {
        logs = [];
    }
};

// ============================================
// FUNÇÕES DE LOG (EXPORTADAS)
// ============================================

/**
 * 🐛 debug - Log nível DEBUG
 */
export const debug = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.DEBUG) return;
    
    const logEntry = formatMessage('DEBUG', message, context);
    logs.push(logEntry);
    
    console.log(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    
    if (logs.length % 10 === 0) {
        saveToStorage();
    }
};

/**
 * ℹ️ info - Log nível INFO
 */
export const info = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.INFO) return;
    
    const logEntry = formatMessage('INFO', message, context);
    logs.push(logEntry);
    
    console.log(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: normal;`);
    
    if (logs.length % 10 === 0) {
        saveToStorage();
    }
};

/**
 * ⚠️ warn - Log nível WARN
 */
export const warn = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.WARN) return;
    
    if (!checkRateLimit('WARN')) return;
    
    const logEntry = formatMessage('WARN', message, context);
    logs.push(logEntry);
    
    console.warn(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    saveToStorage();
};

/**
 * ❌ error - Log nível ERROR
 */
export const error = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.ERROR) return;
    
    if (!checkRateLimit('ERROR')) return;
    
    const logEntry = formatMessage('ERROR', message, context);
    logs.push(logEntry);
    
    console.error(`%c${logEntry.formatted}`, `color: ${logEntry.color}; font-weight: bold;`);
    saveToStorage();
};

/**
 * 🔥 fatal - Log nível FATAL
 */
export const fatal = (message, context = {}) => {
    if (currentLogLevel > LOG_CONFIG.LEVELS.FATAL) return;
    
    const logEntry = formatMessage('FATAL', message, context);
    logs.push(logEntry);
    
    console.error(`%c🚨 FATAL: ${message}`, 'color: white; font-weight: bold; background: #721c24; padding: 2px 5px; border-radius: 3px;');
    
    try {
        localStorage.setItem('mathlab_fatal_error', JSON.stringify({
            timestamp: new Date().toISOString(),
            message,
            context
        }));
    } catch (e) {}
    
    saveToStorage();
};

/**
 * 📝 log - Log com nível personalizado
 */
export const log = (level, message, context = {}) => {
    const logEntry = formatMessage(level, message, context);
    logs.push(logEntry);
    
    const color = LOG_CONFIG.COLORS[level] || LOG_CONFIG.COLORS.INFO;
    console.log(`%c${logEntry.formatted}`, `color: ${color}; font-weight: normal;`);
    saveToStorage();
};

// ============================================
// FUNÇÕES DE GERENCIAMENTO (EXPORTADAS)
// ============================================

/**
 * ⚙️ setLevel - Define nível mínimo de log
 */
export const setLevel = (level) => {
    if (level >= 0 && level <= 4) {
        currentLogLevel = level;
        info(`Nível de log alterado para: ${Object.keys(LOG_CONFIG.LEVELS).find(key => LOG_CONFIG.LEVELS[key] === level)}`);
    }
};

/**
 * 📊 getCurrentLevel - Retorna nível atual de log
 */
export const getCurrentLevel = () => {
    return currentLogLevel;
};

/**
 * 📋 getLogs - Busca logs filtrados
 */
export const getLogs = (filters = {}) => {
    let filteredLogs = [...logs];
    
    if (filters.level) {
        const minLevel = LOG_CONFIG.LEVELS[filters.level.toUpperCase()];
        filteredLogs = filteredLogs.filter(log => LOG_CONFIG.LEVELS[log.level] >= minLevel);
    }
    
    if (filters.category) {
        filteredLogs = filteredLogs.filter(log => 
            log.context && log.context.category === filters.category
        );
    }
    
    if (filters.date) {
        const targetDate = new Date(filters.date);
        filteredLogs = filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate.toDateString() === targetDate.toDateString();
        });
    }
    
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

/**
 * 📊 logMetric - Registra métrica para análise
 */
export const logMetric = (name, value, tags = {}) => {
    const metricEntry = {
        type: 'metric',
        name,
        value,
        tags,
        timestamp: new Date().toISOString()
    };
    
    info(`Métrica: ${name} = ${value}`, metricEntry);
    
    try {
        const metricsKey = 'mathlab_metrics';
        let metrics = [];
        const existing = localStorage.getItem(metricsKey);
        if (existing) {
            metrics = JSON.parse(existing);
        }
        metrics.push(metricEntry);
        
        if (metrics.length > 100) {
            metrics = metrics.slice(-100);
        }
        
        localStorage.setItem(metricsKey, JSON.stringify(metrics));
    } catch (error) {}
};

/**
 * 📊 getStorageStatus - Retorna status do storage
 */
export const getStorageStatus = () => {
    const quota = checkStorageQuota();
    return {
        ...quota,
        logsInMemory: logs.length,
        storageEnabled,
        rateLimits: rateLimitCounts
    };
};

/**
 * 🔄 forceCleanup - Força limpeza de logs antigos
 */
export const forceCleanup = () => {
    compressLogs();
    cleanupOldLogs();
    info('Limpeza forçada de logs concluída');
};

/**
 * ⚡ logPerformance - Registra métricas de performance
 */
export const logPerformance = (operation, duration, details = {}) => {
    const perfData = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    info(`Performance: ${operation} - ${duration}ms`, perfData);
    
    if (duration > 1000) {
        warn(`Performance lenta: ${operation} - ${duration}ms`, perfData);
    }
};

/**
 * 📊 logUserAction - Registra ação do usuário
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

loadFromStorage();
cleanupOldLogs();
setLevel(LOG_CONFIG.LEVELS.INFO);

// Monitora quota periodicamente
setInterval(() => {
    const quota = checkStorageQuota();
    if (quota.isNearLimit) {
        compressLogs();
    }
}, 60000);

// Handler para promessas não tratadas
window.addEventListener('unhandledrejection', (event) => {
    error('Promessa rejeitada não tratada', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
    });
});

console.log('📝 Logger módulo v2.2 carregado');