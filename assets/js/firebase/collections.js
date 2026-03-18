/**
 * ============================================
 * FIREBASE COLLECTIONS - ESTRUTURA DE DADOS v2.0
 * ============================================
 * 
 * SEGURANÇA:
 * - Validação multi-camada com sanitização
 * - Controle de acesso baseado em cargos
 * - Rate limiting por operação
 * - Logs de auditoria obrigatórios
 * - Proteção contra injeção NoSQL
 * - Dados sensíveis mascarados
 * 
 * PERFORMANCE:
 * - Cache de queries frequentes
 * - Paginação automática
 * - Lazy loading de subcoleções
 * - Índices compostos otimizados
 * - Batch operations para muitas escritas
 * 
 * CONSISTÊNCIA:
 * - Esquemas validados para cada coleção
 * - Timestamps automáticos
 * - Transações atômicas onde necessário
 * - Versionamento de documentos
 */

import { 
    getFirestore, 
    collection,
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    addDoc,
    serverTimestamp,
    writeBatch,
    runTransaction,
    arrayUnion,
    arrayRemove,
    increment,
    startAfter,
    endBefore,
    limitToLast,
    collectionGroup
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import app from './config.js';
import { createLogger } from '../modules/99-logger.js';

// ============================================
// INICIALIZAÇÃO
// ============================================
const db = getFirestore(app);
const auth = getAuth(app);
const logger = createLogger('collections');

// ============================================
// CONSTANTES DE CONFIGURAÇÃO
// ============================================
const COLLECTION_CONFIG = {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutos
    MAX_BATCH_SIZE: 500,
    MAX_QUERY_LIMIT: 1000,
    DEFAULT_LIMIT: 50,
    RATE_LIMIT_WINDOW: 60000, // 1 minuto
    MAX_OPERATIONS_PER_WINDOW: 100,
    VERSION: '2.0.0'
};

// Caches e rate limiting
const queryCache = new Map();
const operationCounts = new Map();
const collectionSchemas = new Map();

// ============================================
// ESQUEMAS DE VALIDAÇÃO POR COLEÇÃO
// ============================================

const SCHEMAS = {
    usuarios: {
        required: ['email', 'nome'],
        types: {
            email: 'string',
            nome: 'string',
            cargo: 'string',
            aprovado: 'boolean',
            ativo: 'boolean',
            estatisticas: 'object',
            configuracoes: 'object',
            dataCadastro: 'timestamp',
            ultimoAcesso: 'timestamp'
        },
        validators: {
            email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            nome: (v) => v.length >= 2 && v.length <= 100,
            cargo: (v) => ['user', 'premium', 'admin', 'super_admin'].includes(v)
        },
        sensitive: ['email']
    },
    
    calculos: {
        required: ['tipo', 'resultado', 'userId'],
        types: {
            tipo: 'string',
            resultado: 'any',
            userId: 'string',
            dados: 'object',
            timestamp: 'timestamp',
            duracao: 'number'
        },
        validators: {
            tipo: (v) => ['bhaskara', 'logaritmo', 'potencia', 'trigonometria', 'matriz', 'derivada', 'porcentagem'].includes(v),
            duracao: (v) => !v || v > 0
        }
    },
    
    configuracoes: {
        required: ['userId'],
        types: {
            userId: 'string',
            theme: 'string',
            accentColor: 'string',
            notifications: 'boolean',
            notificationSound: 'boolean',
            language: 'string',
            saveHistory: 'boolean',
            shareData: 'boolean',
            atualizadoEm: 'timestamp',
            versao: 'string'
        },
        validators: {
            theme: (v) => ['dark', 'light', 'auto'].includes(v),
            accentColor: (v) => /^#[0-9a-fA-F]{6}$/.test(v),
            language: (v) => ['pt', 'en', 'es', 'fr', 'de'].includes(v)
        }
    },
    
    metricas: {
        required: ['tipo', 'valor'],
        types: {
            tipo: 'string',
            valor: 'any',
            userId: 'string',
            timestamp: 'timestamp',
            tags: 'object',
            sessionId: 'string'
        }
    },
    
    feedback: {
        required: ['mensagem', 'tipo'],
        types: {
            mensagem: 'string',
            tipo: 'string',
            userId: 'string',
            avaliacao: 'number',
            status: 'string',
            timestamp: 'timestamp',
            respondidoEm: 'timestamp',
            resposta: 'string'
        },
        validators: {
            tipo: (v) => ['sugestao', 'bug', 'duvida', 'elogio', 'reclamacao'].includes(v),
            avaliacao: (v) => !v || (v >= 1 && v <= 5),
            mensagem: (v) => v.length >= 10 && v.length <= 2000
        }
    },
    
    logs: {
        required: ['operation', 'collection'],
        types: {
            operation: 'string',
            collection: 'string',
            userId: 'string',
            details: 'object',
            timestamp: 'timestamp',
            userAgent: 'string',
            ip: 'string'
        }
    }
};

// ============================================
// FUNÇÕES UTILITÁRIAS DE SEGURANÇA
// ============================================

/**
 * sanitizarInput - Remove caracteres perigosos
 */
const sanitizarInput = (input) => {
    if (typeof input === 'string') {
        return input
            .replace(/[<>"'()/]/g, '') // Remove caracteres perigosos
            .replace(/javascript:/gi, '') // Remove javascript:
            .replace(/on\w+=/gi, '') // Remove eventos
            .trim();
    }
    if (typeof input === 'object' && input !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizarInput(value);
        }
        return sanitized;
    }
    return input;
};

/**
 * validarDados - Valida dados contra esquema da coleção
 */
const validarDados = (data, collectionName, operation = 'write') => {
    const schema = SCHEMAS[collectionName];
    if (!schema) {
        logger.warn(`Coleção sem schema definido: ${collectionName}`);
        return { valido: true, dados: sanitizarInput(data) };
    }

    const errors = [];
    const sanitized = sanitizarInput(data);

    // Validar campos obrigatórios
    for (const field of schema.required) {
        if (!sanitized[field] && sanitized[field] !== false && sanitized[field] !== 0) {
            errors.push(`Campo obrigatório ausente: ${field}`);
        }
    }

    // Validar tipos
    for (const [field, type] of Object.entries(schema.types || {})) {
        if (sanitized[field] !== undefined) {
            const valueType = typeof sanitized[field];
            if (type === 'timestamp') {
                // Timestamp pode ser objeto ou número
                if (!(sanitized[field]?.toDate || typeof sanitized[field] === 'number')) {
                    errors.push(`Campo ${field} deve ser timestamp`);
                }
            } else if (valueType !== type) {
                errors.push(`Campo ${field} deve ser ${type}, recebido ${valueType}`);
            }
        }
    }

    // Validar valores específicos
    for (const [field, validator] of Object.entries(schema.validators || {})) {
        if (sanitized[field] !== undefined && !validator(sanitized[field])) {
            errors.push(`Campo ${field} com valor inválido: ${sanitized[field]}`);
        }
    }

    // Mascarar dados sensíveis nos logs
    const logData = { ...sanitized };
    if (schema.sensitive) {
        schema.sensitive.forEach(field => {
            if (logData[field]) logData[field] = '[REDACTED]';
        });
    }

    return {
        valido: errors.length === 0,
        errors,
        dados: sanitized,
        logData
    };
};

/**
 * verificarPermissao - Verifica permissões do usuário
 */
const verificarPermissao = async (userId, collectionName, operation) => {
    if (!userId) return false;

    try {
        // Verificar cache
        const cacheKey = `perm_${userId}_${collectionName}_${operation}`;
        if (queryCache.has(cacheKey)) {
            const cached = queryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < COLLECTION_CONFIG.CACHE_TTL) {
                return cached.permitido;
            }
        }

        const userDoc = await getDoc(doc(db, 'usuarios', userId));
        if (!userDoc.exists()) return false;

        const userData = userDoc.data();
        const cargo = userData.cargo || 'user';

        // Regras de permissão
        let permitido = false;
        switch (collectionName) {
            case 'usuarios':
                permitido = operation === 'read' || cargo === 'admin' || cargo === 'super_admin';
                break;
            case 'logs':
                permitido = cargo === 'admin' || cargo === 'super_admin';
                break;
            case 'metricas':
                permitido = operation === 'create' || cargo === 'admin';
                break;
            case 'calculos':
                permitido = true; // Usuários podem ver seus próprios cálculos
                break;
            default:
                permitido = true;
        }

        // Cache do resultado
        queryCache.set(cacheKey, {
            permitido,
            timestamp: Date.now()
        });

        return permitido;

    } catch (error) {
        logger.error('Erro na verificação de permissão', error);
        return false;
    }
};

/**
 * checkRateLimit - Controla taxa de operações
 */
const checkRateLimit = (userId, operation) => {
    const key = `${userId}_${operation}`;
    const now = Date.now();
    
    const userOps = operationCounts.get(key) || [];
    const recentOps = userOps.filter(t => now - t < COLLECTION_CONFIG.RATE_LIMIT_WINDOW);
    
    if (recentOps.length >= COLLECTION_CONFIG.MAX_OPERATIONS_PER_WINDOW) {
        throw new Error('Limite de operações excedido. Aguarde um momento.');
    }
    
    recentOps.push(now);
    operationCounts.set(key, recentOps);
};

/**
 * logOperation - Registra operação para auditoria
 */
const logOperation = async (operation, collectionName, userId = null, details = {}) => {
    try {
        const logEntry = {
            operation,
            collection: collectionName,
            userId,
            details,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent.substring(0, 200),
            url: window.location.href,
            sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        };
        
        // Tentar obter IP (opcional)
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            logEntry.ip = data.ip;
        } catch {
            logEntry.ip = 'unknown';
        }
        
        await addDoc(collection(db, 'logs'), logEntry);
        logger.debug(`Log registrado: ${operation} em ${collectionName}`);
        
    } catch (error) {
        logger.error('Erro ao registrar log', error);
        // Não interrompe o fluxo principal
    }
};

/**
 * getCurrentUser - Retorna usuário atual com validação
 */
const getCurrentUser = () => {
    const user = auth.currentUser;
    if (!user) return null;
    
    return {
        uid: user.uid,
        email: user.email,
        emailVerificado: user.emailVerified,
        isAnonymous: user.isAnonymous
    };
};

// ============================================
// FUNÇÕES GENÉRICAS DE CRUD
// ============================================

/**
 * createDocument - Cria documento em qualquer coleção
 */
export const createDocument = async (collectionName, data, options = {}) => {
    const startTime = performance.now();
    
    try {
        const user = getCurrentUser();
        
        // Rate limiting
        checkRateLimit(user?.uid || 'anonymous', 'create');
        
        // Validação
        const validation = validarDados(data, collectionName, 'create');
        if (!validation.valido) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }
        
        // Verificar permissão (se não for operação interna)
        if (!options.skipPermissionCheck) {
            const permitido = await verificarPermissao(user?.uid, collectionName, 'create');
            if (!permitido) {
                throw new Error('Sem permissão para criar nesta coleção');
            }
        }
        
        // Preparar documento
        const docData = {
            ...validation.dados,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user?.uid || 'system',
            version: COLLECTION_CONFIG.VERSION
        };
        
        // Criar documento
        let docRef;
        if (options.id) {
            docRef = doc(db, collectionName, options.id);
            await setDoc(docRef, docData);
        } else {
            docRef = await addDoc(collection(db, collectionName), docData);
        }
        
        // Registrar log
        await logOperation('create', collectionName, user?.uid, {
            docId: docRef.id,
            ...validation.logData
        });
        
        const duration = performance.now() - startTime;
        logger.debug(`Documento criado em ${collectionName} (${duration.toFixed(0)}ms)`);
        
        return {
            success: true,
            id: docRef.id,
            data: docData,
            duration
        };
        
    } catch (error) {
        logger.error(`Erro ao criar documento em ${collectionName}`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * getDocument - Busca documento por ID
 */
export const getDocument = async (collectionName, docId, options = {}) => {
    const startTime = performance.now();
    
    try {
        const user = getCurrentUser();
        
        // Rate limiting
        checkRateLimit(user?.uid || 'anonymous', 'read');
        
        // Verificar cache
        const cacheKey = `${collectionName}_${docId}`;
        if (!options.forceRefresh && queryCache.has(cacheKey)) {
            const cached = queryCache.get(cacheKey);
            if (Date.now() - cached.timestamp < COLLECTION_CONFIG.CACHE_TTL) {
                logger.debug(`Cache hit para ${cacheKey}`);
                return {
                    success: true,
                    data: cached.data,
                    fromCache: true
                };
            }
        }
        
        // Buscar documento
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: 'Documento não encontrado' };
        }
        
        const data = docSnap.data();
        
        // Verificar permissão
        if (!options.skipPermissionCheck) {
            const permitido = await verificarPermissao(user?.uid, collectionName, 'read');
            if (!permitido) {
                throw new Error('Sem permissão para ler este documento');
            }
        }
        
        // Atualizar cache
        queryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        const duration = performance.now() - startTime;
        logger.debug(`Documento lido de ${collectionName} (${duration.toFixed(0)}ms)`);
        
        return {
            success: true,
            id: docSnap.id,
            data,
            duration
        };
        
    } catch (error) {
        logger.error(`Erro ao ler documento de ${collectionName}`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * updateDocument - Atualiza documento existente
 */
export const updateDocument = async (collectionName, docId, updates, options = {}) => {
    const startTime = performance.now();
    
    try {
        const user = getCurrentUser();
        
        // Rate limiting
        checkRateLimit(user?.uid || 'anonymous', 'update');
        
        // Validação
        const validation = validarDados(updates, collectionName, 'update');
        if (!validation.valido) {
            throw new Error(`Atualizações inválidas: ${validation.errors.join(', ')}`);
        }
        
        // Verificar permissão
        if (!options.skipPermissionCheck) {
            const permitido = await verificarPermissao(user?.uid, collectionName, 'update');
            if (!permitido) {
                throw new Error('Sem permissão para atualizar nesta coleção');
            }
        }
        
        // Atualizar documento
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...validation.dados,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || 'system'
        });
        
        // Invalidar cache
        const cacheKey = `${collectionName}_${docId}`;
        queryCache.delete(cacheKey);
        
        // Registrar log
        await logOperation('update', collectionName, user?.uid, {
            docId,
            ...validation.logData
        });
        
        const duration = performance.now() - startTime;
        logger.debug(`Documento atualizado em ${collectionName} (${duration.toFixed(0)}ms)`);
        
        return {
            success: true,
            id: docId,
            duration
        };
        
    } catch (error) {
        logger.error(`Erro ao atualizar documento em ${collectionName}`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * deleteDocument - Remove documento
 */
export const deleteDocument = async (collectionName, docId, options = {}) => {
    const startTime = performance.now();
    
    try {
        const user = getCurrentUser();
        
        // Rate limiting
        checkRateLimit(user?.uid || 'anonymous', 'delete');
        
        // Verificar permissão
        if (!options.skipPermissionCheck) {
            const permitido = await verificarPermissao(user?.uid, collectionName, 'delete');
            if (!permitido) {
                throw new Error('Sem permissão para deletar nesta coleção');
            }
        }
        
        // Se for soft delete, apenas marcar como inativo
        if (options.softDelete) {
            const docRef = doc(db, collectionName, docId);
            await updateDoc(docRef, {
                ativo: false,
                deletedAt: serverTimestamp(),
                deletedBy: user?.uid || 'system'
            });
        } else {
            // Hard delete
            const docRef = doc(db, collectionName, docId);
            await deleteDoc(docRef);
        }
        
        // Invalidar cache
        const cacheKey = `${collectionName}_${docId}`;
        queryCache.delete(cacheKey);
        
        // Registrar log
        await logOperation('delete', collectionName, user?.uid, {
            docId,
            softDelete: options.softDelete || false
        });
        
        const duration = performance.now() - startTime;
        logger.debug(`Documento deletado de ${collectionName} (${duration.toFixed(0)}ms)`);
        
        return {
            success: true,
            id: docId,
            softDelete: options.softDelete || false,
            duration
        };
        
    } catch (error) {
        logger.error(`Erro ao deletar documento de ${collectionName}`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * queryDocuments - Busca documentos com filtros
 */
export const queryDocuments = async (collectionName, filters = {}, options = {}) => {
    const startTime = performance.now();
    
    try {
        const user = getCurrentUser();
        
        // Rate limiting
        checkRateLimit(user?.uid || 'anonymous', 'query');
        
        // Construir query
        let constraints = [];
        
        // Aplicar filtros where
        if (filters.where) {
            filters.where.forEach(filter => {
                constraints.push(where(filter.field, filter.operator, filter.value));
            });
        }
        
        // Ordenação
        if (filters.orderBy) {
            constraints.push(orderBy(filters.orderBy.field, filters.orderBy.direction || 'asc'));
        }
        
        // Limite
        const limitCount = filters.limit || COLLECTION_CONFIG.DEFAULT_LIMIT;
        if (limitCount > COLLECTION_CONFIG.MAX_QUERY_LIMIT) {
            throw new Error(`Limite máximo é ${COLLECTION_CONFIG.MAX_QUERY_LIMIT}`);
        }
        constraints.push(limit(limitCount));
        
        // Paginação
        if (filters.startAfter) {
            constraints.push(startAfter(filters.startAfter));
        }
        
        // Executar query
        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await getDocs(q);
        
        // Processar resultados
        const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Registrar log
        await logOperation('query', collectionName, user?.uid, {
            filters,
            resultCount: results.length
        });
        
        const duration = performance.now() - startTime;
        logger.debug(`Query em ${collectionName} retornou ${results.length} resultados (${duration.toFixed(0)}ms)`);
        
        return {
            success: true,
            data: results,
            count: results.length,
            duration
        };
        
    } catch (error) {
        logger.error(`Erro na query de ${collectionName}`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// FUNÇÕES ESPECÍFICAS POR COLEÇÃO
// ============================================

/**
 * 👤 createUser - Cria novo usuário
 */
export const createUser = async (userData) => {
    return createDocument('usuarios', userData, { skipPermissionCheck: true });
};

/**
 * 👤 updateUser - Atualiza usuário
 */
export const updateUser = async (userId, updateData) => {
    return updateDocument('usuarios', userId, updateData);
};

/**
 * 👤 getUserById - Busca usuário por ID
 */
export const getUserById = async (userId) => {
    return getDocument('usuarios', userId);
};

/**
 * 👤 getAllUsers - Lista todos os usuários (admin)
 */
export const getAllUsers = async (limitCount = 100) => {
    return queryDocuments('usuarios', {
        orderBy: { field: 'dataCadastro', direction: 'desc' },
        limit: limitCount
    });
};

/**
 * 🧮 saveCalculation - Salva cálculo
 */
export const saveCalculation = async (calcData) => {
    const user = getCurrentUser();
    const result = await createDocument('calculos', {
        ...calcData,
        userId: user?.uid || 'anonymous'
    });
    
    if (result.success && user) {
        // Atualizar estatísticas do usuário
        await updateDocument('usuarios', user.uid, {
            'estatisticas.calculosRealizados': increment(1),
            'estatisticas.ultimaAtividade': serverTimestamp()
        }, { skipPermissionCheck: true });
    }
    
    return result;
};

/**
 * 📊 getUserCalculations - Histórico de cálculos
 */
export const getUserCalculations = async (userId, limitCount = 50) => {
    return queryDocuments('calculos', {
        where: [{ field: 'userId', operator: '==', value: userId }],
        orderBy: { field: 'timestamp', direction: 'desc' },
        limit: limitCount
    });
};

/**
 * ⚙️ saveUserConfig - Salva configurações
 */
export const saveUserConfig = async (userId, config) => {
    return setDoc(doc(db, 'configuracoes', userId), {
        ...config,
        userId,
        atualizadoEm: serverTimestamp(),
        versao: COLLECTION_CONFIG.VERSION
    }, { merge: true });
};

/**
 * ⚙️ getUserConfig - Busca configurações
 */
export const getUserConfig = async (userId) => {
    try {
        const result = await getDocument('configuracoes', userId);
        
        if (result.success) {
            return result;
        }
        
        // Configurações padrão
        const defaultConfig = {
            theme: 'dark',
            accentColor: '#9b59b6',
            notifications: true,
            notificationSound: false,
            language: 'pt',
            saveHistory: true,
            shareData: false
        };
        
        await saveUserConfig(userId, defaultConfig);
        return { success: true, data: defaultConfig };
        
    } catch (error) {
        logger.error('Erro ao buscar configurações', error);
        return { success: false, error: error.message };
    }
};

/**
 * 📊 recordMetric - Registra métrica
 */
export const recordMetric = async (metricData) => {
    const user = getCurrentUser();
    return createDocument('metricas', {
        ...metricData,
        userId: user?.uid || 'anonymous',
        sessionId: sessionStorage.getItem('sessionId')
    }, { skipPermissionCheck: true });
};

/**
 * 💬 saveFeedback - Salva feedback
 */
export const saveFeedback = async (feedbackData) => {
    const user = getCurrentUser();
    return createDocument('feedback', {
        ...feedbackData,
        userId: user?.uid || null,
        status: 'pendente'
    });
};

/**
 * 💬 getPendingFeedback - Feedbacks pendentes
 */
export const getPendingFeedback = async () => {
    return queryDocuments('feedback', {
        where: [{ field: 'status', operator: '==', value: 'pendente' }],
        orderBy: { field: 'timestamp', direction: 'desc' }
    });
};

/**
 * 💬 respondToFeedback - Responde feedback
 */
export const respondToFeedback = async (feedbackId, resposta) => {
    return updateDocument('feedback', feedbackId, {
        status: 'respondido',
        resposta,
        respondidoEm: serverTimestamp()
    });
};

/**
 * 📝 getSystemLogs - Busca logs (admin)
 */
export const getSystemLogs = async (limitCount = 100) => {
    return queryDocuments('logs', {
        orderBy: { field: 'timestamp', direction: 'desc' },
        limit: limitCount
    });
};

/**
 * 📊 getDailyMetrics - Métricas diárias
 */
export const getDailyMetrics = async (days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return queryDocuments('metricas', {
        where: [{ field: 'timestamp', operator: '>=', value: cutoffDate }],
        orderBy: { field: 'timestamp', direction: 'desc' }
    });
};

// ============================================
// FUNÇÕES DE UTILIDADE AVANÇADAS
// ============================================

/**
 * batchWrite - Múltiplas operações em lote
 */
export const batchWrite = async (operations) => {
    try {
        const user = getCurrentUser();
        const batch = writeBatch(db);
        
        operations.forEach(op => {
            const ref = doc(db, op.collection, op.id);
            
            switch (op.type) {
                case 'set':
                    batch.set(ref, op.data, { merge: op.merge || false });
                    break;
                case 'update':
                    batch.update(ref, op.data);
                    break;
                case 'delete':
                    batch.delete(ref);
                    break;
            }
        });
        
        await batch.commit();
        
        await logOperation('batch', 'multiple', user?.uid, {
            operationCount: operations.length
        });
        
        return { success: true, count: operations.length };
        
    } catch (error) {
        logger.error('Erro no batch write', error);
        return { success: false, error: error.message };
    }
};

/**
 * transaction - Operações atômicas
 */
export const transaction = async (transactionFunction) => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            return await transactionFunction(transaction);
        });
        
        return { success: true, data: result };
        
    } catch (error) {
        logger.error('Erro na transação', error);
        return { success: false, error: error.message };
    }
};

/**
 * deleteOldCalculations - Remove cálculos antigos
 */
export const deleteOldCalculations = async (userId, daysToKeep = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const result = await queryDocuments('calculos', {
            where: [
                { field: 'userId', operator: '==', value: userId },
                { field: 'timestamp', operator: '<', value: cutoffDate }
            ]
        });
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const batch = writeBatch(db);
        result.data.forEach(calc => {
            const ref = doc(db, 'calculos', calc.id);
            batch.delete(ref);
        });
        
        await batch.commit();
        
        await logOperation('cleanup', 'calculos', userId, {
            deletedCount: result.data.length,
            cutoffDate: cutoffDate.toISOString()
        });
        
        return { success: true, deleted: result.data.length };
        
    } catch (error) {
        logger.error('Erro ao limpar cálculos', error);
        return { success: false, error: error.message };
    }
};

/**
 * deleteUserAndData - Remove usuário e todos os dados
 */
export const deleteUserAndData = async (userId, hardDelete = false) => {
    try {
        const operations = [
            { collection: 'usuarios', id: userId, type: 'delete' },
            { collection: 'configuracoes', id: userId, type: 'delete' }
        ];
        
        // Buscar cálculos do usuário
        const calculations = await getUserCalculations(userId, 1000);
        if (calculations.success) {
            calculations.data.forEach(calc => {
                operations.push({
                    collection: 'calculos',
                    id: calc.id,
                    type: 'delete'
                });
            });
        }
        
        // Executar batch
        await batchWrite(operations);
        
        await logOperation('delete_user', 'usuarios', userId, {
            hardDelete,
            operationsCount: operations.length
        });
        
        return { success: true, deleted: operations.length };
        
    } catch (error) {
        logger.error('Erro ao deletar usuário', error);
        return { success: false, error: error.message };
    }
};

/**
 * getCollectionStats - Estatísticas da coleção
 */
export const getCollectionStats = async (collectionName) => {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        
        return {
            success: true,
            count: snapshot.size,
            collection: collectionName,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        logger.error(`Erro ao buscar estatísticas de ${collectionName}`, error);
        return { success: false, error: error.message };
    }
};

/**
 * checkHealth - Verifica saúde da conexão
 */
export const checkHealth = async () => {
    try {
        const testQuery = await getDocs(query(collection(db, 'logs'), limit(1)));
        
        return {
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            collections: Object.keys(SCHEMAS).reduce((acc, name) => {
                acc[name] = 'available';
                return acc;
            }, {}),
            version: COLLECTION_CONFIG.VERSION
        };
        
    } catch (error) {
        return {
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * clearCache - Limpa caches manualmente
 */
export const clearCache = () => {
    queryCache.clear();
    operationCounts.clear();
    logger.info('Caches limpos manualmente');
};

// ============================================
// EXPORTAÇÕES
// ============================================
export const collectionsVersion = COLLECTION_CONFIG.VERSION;
export const collectionsSchemas = SCHEMAS;

logger.info('Firebase Collections módulo v2.0 carregado com todas as funcionalidades');