// ============================================
// FIREBASE FIRESTORE - OPERAÇÕES NO BANCO DE DADOS (MODULAR)
// ============================================

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import app from './config.js';

// Inicializar Firestore
const db = getFirestore(app);

// ============================================
// SALVAR DADOS DO USUÁRIO
// ============================================

/**
 * salvarDadosUsuario - Salva ou atualiza dados de um usuário
 * @param {string} uid - ID do usuário
 * @param {Object} dados - Dados a serem salvos
 */
export async function salvarDadosUsuario(uid, dados) {
    try {
        await setDoc(doc(db, 'usuarios', uid), dados, { merge: true });
        console.log('✅ Dados salvos para usuário:', uid);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// BUSCAR DADOS DO USUÁRIO
// ============================================

/**
 * buscarDadosUsuario - Busca dados de um usuário
 * @param {string} uid - ID do usuário
 */
export async function buscarDadosUsuario(uid) {
    try {
        const docRef = doc(db, 'usuarios', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { success: true, dados: docSnap.data() };
        } else {
            return { success: false, error: 'Usuário não encontrado' };
        }
    } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SALVAR HISTÓRICO DE CÁLCULOS
// ============================================

/**
 * salvarHistoricoCalculo - Salva um cálculo no histórico do usuário
 * @param {string} uid - ID do usuário
 * @param {string} ferramenta - Nome da ferramenta usada
 * @param {Object} dados - Dados do cálculo
 */
export async function salvarHistoricoCalculo(uid, ferramenta, dados) {
    try {
        const historicoRef = collection(db, 'usuarios', uid, 'historico');
        await addDoc(historicoRef, {
            ferramenta: ferramenta,
            dados: dados,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Histórico salvo: ${ferramenta}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao salvar histórico:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// BUSCAR HISTÓRICO DO USUÁRIO
// ============================================

/**
 * buscarHistoricoUsuario - Busca o histórico de um usuário
 * @param {string} uid - ID do usuário
 * @param {number} limite - Quantidade máxima de registros
 */
export async function buscarHistoricoUsuario(uid, limite = 20) {
    try {
        const historicoRef = collection(db, 'usuarios', uid, 'historico');
        const q = query(historicoRef, orderBy('timestamp', 'desc'), limit(limite));
        const querySnapshot = await getDocs(q);
        
        const historico = [];
        querySnapshot.forEach((doc) => {
            historico.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, historico };
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        return { success: false, error: error.message };
    }
}

console.log('📦 Módulo Firestore modular carregado');