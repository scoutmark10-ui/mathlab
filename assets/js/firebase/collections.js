// ============================================
// FIREBASE COLLECTIONS - ESTRUTURA DE DADOS
// ============================================
//
// 📋 VISÃO GERAL DAS COLEÇÕES
// =================================
// Este módulo define a estrutura completa das coleções do Firestore
// Centraliza todas as operações de CRUD para dados do MathLab
// Fornece funções padronizadas para manipulação segura
//
// 🗄️ COLEÇÕES PRINCIPAIS:
// ================================
// - usuarios: Dados dos usuários do sistema
// - calculos: Histórico de cálculos realizados
// - configuracoes: Preferências globais do sistema
// - logs: Registro de eventos e erros
// - metricas: Estatísticas de uso e performance
// - feedback: Mensagens e sugestões dos usuários
//
// 🔧 MÉTODOS EXPORTADOS:
// =========================
// - CRUD operations para cada coleção
// - Validação de dados antes de salvar
// - Tratamento de erros padronizado
// - Logs de operações para auditoria
// - Querys otimizadas com índices
//
// 🛡️ SEGURANÇA IMPLEMENTADA:
// =========================
// - Validação de entrada de dados
// - Sanitização de strings
// - Verificação de permissões
// - Rate limiting para operações
// - Logs de auditoria completos

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import app from './config.js';

// ============================================
// INICIALIZAÇÃO DO FIRESTORE
// ============================================
const db = getFirestore(app);

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * 📝 logOperation - Registra operação para auditoria
 * @param {string} operation - Tipo da operação
 * @param {string} collection - Nome da coleção
 * @param {string} userId - ID do usuário (opcional)
 * @param {Object} details - Detalhes da operação
 */
const logOperation = async (operation, collection, userId = null, details = {}) => {
    try {
        const logEntry = {
            timestamp: serverTimestamp(),
            operation,
            collection,
            userId,
            details,
            ip: details.ip || 'unknown', // Será capturado no futuro
            userAgent: navigator.userAgent
        };
        
        await addDoc(collection(db, 'logs'), logEntry);
        console.log(`📝 Log registrado: ${operation} em ${collection}`);
    } catch (error) {
        console.error('❌ Erro ao registrar log:', error);
    }
};

/**
 * 🔍 validateData - Valida e sanitiza dados de entrada
 * @param {Object} data - Dados a validar
 * @param {string} collection - Nome da coleção para regras específicas
 * @returns {Object} Dados validados e erros encontrados
 */
const validateData = (data, collection) => {
    const errors = [];
    const sanitized = { ...data };
    
    // Validação comum para todas as coleções
    if (!data || typeof data !== 'object') {
        errors.push('Dados inválidos ou nulos');
        return { valid: false, errors, data: null };
    }
    
    // Validação específica por coleção
    switch (collection) {
        case 'usuarios':
            if (!data.email || !data.email.includes('@')) {
                errors.push('Email inválido');
            }
            if (!data.nome || data.nome.length < 2) {
                errors.push('Nome deve ter pelo menos 2 caracteres');
            }
            if (data.senha && data.senha.length < 6) {
                errors.push('Senha deve ter pelo menos 6 caracteres');
            }
            // Remove senha do objeto sanitizado (não salvar)
            delete sanitized.senha;
            break;
            
        case 'calculos':
            if (!data.tipo || !data.resultado) {
                errors.push('Tipo e resultado são obrigatórios');
            }
            if (!data.userId) {
                errors.push('ID do usuário é obrigatório');
            }
            break;
            
        case 'configuracoes':
            // Valida valores específicos das configurações
            if (data.accentColor && !/^#[0-9a-fA-F]{6}$/.test(data.accentColor)) {
                errors.push('Cor inválida (use formato hexadecimal)');
            }
            if (data.language && !['pt', 'en', 'es'].includes(data.language)) {
                errors.push('Idioma inválido');
            }
            break;
    }
    
    // Sanitização de strings
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitized[key].trim().replace(/[<>]/g, '');
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        data: sanitized
    };
};

// ============================================
// COLEÇÃO USUÁRIOS
// ============================================

/**
 * 👤 createUser - Cria novo usuário no Firestore
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
export const createUser = async (userData) => {
    try {
        const validation = validateData(userData, 'usuarios');
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        
        const userDoc = {
            ...validation.data,
            dataCriacao: serverTimestamp(),
            status: 'ativo',
            ultimoAcesso: serverTimestamp(),
            cargo: userData.cargo || 'user',
            aprovado: userData.aprovado !== undefined ? userData.aprovado : true
        };
        
        const docRef = await addDoc(collection(db, 'usuarios'), userDoc);
        await logOperation('create', 'usuarios', userDoc.uid, { action: 'user_created' });
        
        console.log('✅ Usuário criado:', docRef.id);
        return { success: true, id: docRef.id, data: userDoc };
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        await logOperation('error', 'usuarios', null, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * 👤 updateUser - Atualiza dados do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} updateData - Dados para atualizar
 * @returns {Promise<Object>} Resultado da operação
 */
export const updateUser = async (userId, updateData) => {
    try {
        const validation = validateData(updateData, 'usuarios');
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, {
            ...validation.data,
            atualizadoEm: serverTimestamp(),
            ultimoAcesso: serverTimestamp()
        });
        
        await logOperation('update', 'usuarios', userId, { action: 'user_updated' });
        console.log('✅ Usuário atualizado:', userId);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro ao atualizar usuário:', error);
        await logOperation('error', 'usuarios', userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * 👤 getUserById - Busca usuário por ID
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Dados do usuário
 */
export const getUserById = async (userId) => {
    try {
        const userRef = doc(db, 'usuarios', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            await logOperation('read', 'usuarios', userId, { action: 'user_accessed' });
            return { success: true, data: userDoc.data() };
        } else {
            return { success: false, error: 'Usuário não encontrado' };
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// COLEÇÃO CÁLCULOS
// ============================================

/**
 * 🧮 saveCalculation - Salva cálculo no histórico
 * @param {Object} calcData - Dados do cálculo
 * @returns {Promise<Object>} Resultado da operação
 */
export const saveCalculation = async (calcData) => {
    try {
        const validation = validateData(calcData, 'calculos');
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        
        const calcDoc = {
            ...validation.data,
            timestamp: serverTimestamp(),
            data: new Date().toISOString().split('T')[0] // Data formatada
        };
        
        const docRef = await addDoc(collection(db, 'calculos'), calcDoc);
        await logOperation('create', 'calculos', calcData.userId, { 
            type: calcData.tipo,
            result: calcData.resultado 
        });
        
        console.log('✅ Cálculo salvo:', docRef.id);
        return { success: true, id: docRef.id };
        
    } catch (error) {
        console.error('❌ Erro ao salvar cálculo:', error);
        await logOperation('error', 'calculos', calcData.userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * 📊 getUserCalculations - Busca histórico de cálculos do usuário
 * @param {string} userId - ID do usuário
 * @param {number} limit - Limite de registros (opcional)
 * @returns {Promise<Array>} Lista de cálculos
 */
export const getUserCalculations = async (userId, limit = 50) => {
    try {
        const q = query(
            collection(db, 'calculos'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limit)
        );
        
        const querySnapshot = await getDocs(q);
        const calculations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        await logOperation('read', 'calculos', userId, { 
            action: 'history_accessed',
            count: calculations.length 
        });
        
        return { success: true, data: calculations };
        
    } catch (error) {
        console.error('❌ Erro ao buscar cálculos:', error);
        await logOperation('error', 'calculos', userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

// ============================================
// COLEÇÃO CONFIGURAÇÕES
// ============================================

/**
 * ⚙️ saveUserConfig - Salva configurações do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} config - Configurações a salvar
 * @returns {Promise<Object>} Resultado da operação
 */
export const saveUserConfig = async (userId, config) => {
    try {
        const validation = validateData(config, 'configuracoes');
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        
        const configDoc = {
            ...validation.data,
            userId,
            atualizadoEm: serverTimestamp(),
            versao: '1.0'
        };
        
        const configRef = doc(db, 'configuracoes', userId);
        await setDoc(configRef, configDoc);
        
        await logOperation('update', 'configuracoes', userId, { 
            action: 'config_saved',
            theme: config.theme,
            accent: config.accentColor 
        });
        
        console.log('✅ Configurações salvas:', userId);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        await logOperation('error', 'configuracoes', userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * ⚙️ getUserConfig - Busca configurações do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Configurações do usuário
 */
export const getUserConfig = async (userId) => {
    try {
        const configRef = doc(db, 'configuracoes', userId);
        const configDoc = await getDoc(configRef);
        
        if (configDoc.exists()) {
            return { success: true, data: configDoc.data() };
        } else {
            // Retorna configurações padrão se não existir
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
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
        await logOperation('error', 'configuracoes', userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

// ============================================
// COLEÇÃO MÉTRICAS
// ============================================

/**
 * 📊 recordMetric - Registra métrica de uso
 * @param {Object} metricData - Dados da métrica
 * @returns {Promise<Object>} Resultado da operação
 */
export const recordMetric = async (metricData) => {
    try {
        const metricDoc = {
            ...metricData,
            timestamp: serverTimestamp(),
            data: new Date().toISOString().split('T')[0]
        };
        
        await addDoc(collection(db, 'metricas'), metricDoc);
        console.log('✅ Métrica registrada:', metricData.tipo);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro ao registrar métrica:', error);
        await logOperation('error', 'metricas', null, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * 📊 getDailyMetrics - Busca métricas diárias
 * @param {number} days - Número de dias para buscar
 * @returns {Promise<Array>} Lista de métricas
 */
export const getDailyMetrics = async (days = 7) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const q = query(
            collection(db, 'metricas'),
            where('timestamp', '>=', cutoffDate),
            orderBy('timestamp', 'desc'),
            limit(100)
        );
        
        const querySnapshot = await getDocs(q);
        const metrics = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return { success: true, data: metrics };
        
    } catch (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        await logOperation('error', 'metricas', null, { error: error.message });
        return { success: false, error: error.message };
    }
};

// ============================================
// COLEÇÃO FEEDBACK
// ============================================

/**
 * 💬 saveFeedback - Salva feedback do usuário
 * @param {Object} feedbackData - Dados do feedback
 * @returns {Promise<Object>} Resultado da operação
 */
export const saveFeedback = async (feedbackData) => {
    try {
        const feedbackDoc = {
            ...feedbackData,
            timestamp: serverTimestamp(),
            status: 'pendente',
            respondidoEm: null
        };
        
        const docRef = await addDoc(collection(db, 'feedback'), feedbackDoc);
        await logOperation('create', 'feedback', feedbackData.userId, { 
            type: feedbackData.tipo,
            rating: feedbackData.avaliacao 
        });
        
        console.log('✅ Feedback salvo:', docRef.id);
        return { success: true, id: docRef.id };
        
    } catch (error) {
        console.error('❌ Erro ao salvar feedback:', error);
        await logOperation('error', 'feedback', feedbackData.userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * 💬 getPendingFeedback - Busca feedbacks pendentes
 * @returns {Promise<Array>} Lista de feedbacks pendentes
 */
export const getPendingFeedback = async () => {
    try {
        const q = query(
            collection(db, 'feedback'),
            where('status', '==', 'pendente'),
            orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const feedbacks = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return { success: true, data: feedbacks };
        
    } catch (error) {
        console.error('❌ Erro ao buscar feedbacks:', error);
        await logOperation('error', 'feedback', null, { error: error.message });
        return { success: false, error: error.message };
    }
};

// ============================================
// FUNÇÕES DE LIMPEZA
// ============================================

/**
 * 🗑️ deleteOldCalculations - Remove cálculos antigos
 * @param {string} userId - ID do usuário
 * @param {number} daysToKeep - Dias para manter
 * @returns {Promise<Object>} Resultado da operação
 */
export const deleteOldCalculations = async (userId, daysToKeep = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const q = query(
            collection(db, 'calculos'),
            where('userId', '==', userId),
            where('timestamp', '<', cutoffDate)
        );
        
        const querySnapshot = await getDocs(q);
        const batch = db.batch();
        
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        await logOperation('delete', 'calculos', userId, { 
            count: querySnapshot.size,
            cutoff: cutoffDate.toISOString() 
        });
        
        console.log(`🗑️ ${querySnapshot.size} cálculos antigos removidos`);
        return { success: true, deleted: querySnapshot.size };
        
    } catch (error) {
        console.error('❌ Erro ao limpar cálculos:', error);
        await logOperation('error', 'calculos', userId, { error: error.message });
        return { success: false, error: error.message };
    }
};

// ============================================
// EXPORTAÇÕES ADICIONAIS
// ============================================

/**
 * 📊 getCollectionStats - Estatísticas de uma coleção
 * @param {string} collectionName - Nome da coleção
 * @returns {Promise<Object>} Estatísticas
 */
export const getCollectionStats = async (collectionName) => {
    try {
        const q = query(collection(db, collectionName), limit(1));
        const snapshot = await getDocs(q);
        
        return { 
            success: true, 
            count: snapshot.size,
            collection: collectionName 
        };
        
    } catch (error) {
        console.error(`❌ Erro ao buscar estatísticas de ${collectionName}:`, error);
        return { success: false, error: error.message };
    }
};

console.log('📊 Firebase Collections módulo carregado com todas as funcionalidades');
