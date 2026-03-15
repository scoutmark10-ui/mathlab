// ============================================
// MÓDULO 17: FUNÇÕES DE ADMINISTRADOR (MODULAR)
// ============================================

import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from '../firebase/config.js';

// Inicializar serviços
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * quandoFirebasePronto - Aguarda Firebase estar pronto (versão modular)
 * @param {Function} callback - Função a ser executada
 */
function quandoFirebasePronto(callback) {
    if (auth && db) {
        callback();
    } else {
        console.warn('⚠️ Firebase não está pronto');
    }
}

// ============================================
// VERIFICAR ADMIN
// ============================================

/**
 * verificarAdmin - Verifica se o usuário atual é admin
 * Redireciona se não for
 * @returns {Promise<boolean>}
 */
export async function verificarAdmin() {
    return new Promise((resolve) => {
        quandoFirebasePronto(async () => {
            try {
                const user = auth.currentUser;

                if (!user) {
                    console.log('🚫 ADMIN - Usuário não logado');
                    window.location.href = '../login.html';
                    resolve(false);
                    return;
                }

                const userDoc = await getDoc(doc(db, 'usuarios', user.uid));

                if (!userDoc.exists()) {
                    console.log('🚫 ADMIN - Usuário não encontrado no banco');
                    window.location.href = '../login.html';
                    resolve(false);
                    return;
                }

                const userData = userDoc.data();

                if (userData.cargo !== 'admin') {
                    console.log('🚫 ADMIN - Usuário não é admin');
                    alert('Acesso negado. Apenas administradores podem acessar.');
                    window.location.href = '../../index.html';
                    resolve(false);
                    return;
                }

                console.log('✅ ADMIN - Acesso permitido');
                resolve(true);

            } catch (error) {
                console.error('❌ ADMIN - Erro ao verificar:', error);
                resolve(false);
            }
        });
    });
}

// ============================================
// LISTAR USUÁRIOS PENDENTES
// ============================================

/**
 * listarUsuariosPendentes - Busca usuários aguardando aprovação
 * @returns {Promise<Object>}
 */
export async function listarUsuariosPendentes() {
    return new Promise((resolve) => {
        quandoFirebasePronto(async () => {
            try {
                const q = query(
                    collection(db, 'usuarios'),
                    where('aprovado', '==', false),
                    orderBy('dataCadastro', 'desc')
                );
                const snapshot = await getDocs(q);

                const usuarios = [];
                snapshot.forEach(doc => {
                    usuarios.push({
                        uid: doc.id,
                        ...doc.data()
                    });
                });

                console.log(`📋 ADMIN - ${usuarios.length} usuários pendentes`);
                resolve({ success: true, usuarios });

            } catch (error) {
                console.error('❌ ADMIN - Erro ao listar pendentes:', error);
                resolve({ success: false, error: error.message });
            }
        });
    });
}

// ============================================
// APROVAR USUÁRIO
// ============================================

/**
 * aprovarUsuario - Aprova um usuário pendente
 * @param {string} uid - ID do usuário a aprovar
 * @returns {Promise<Object>}
 */
export async function aprovarUsuario(uid) {
    return new Promise((resolve) => {
        quandoFirebasePronto(async () => {
            try {
                await updateDoc(doc(db, 'usuarios', uid), {
                    aprovado: true,
                    dataAprovacao: new Date().toISOString()
                });

                console.log(`✅ ADMIN - Usuário ${uid} aprovado`);
                resolve({ success: true });

            } catch (error) {
                console.error('❌ ADMIN - Erro ao aprovar:', error);
                resolve({ success: false, error: error.message });
            }
        });
    });
}

// ============================================
// CONTAR USUÁRIOS
// ============================================

/**
 * contarUsuarios - Retorna estatísticas de usuários
 * @returns {Promise<Object>}
 */
export async function contarUsuarios() {
    return new Promise((resolve) => {
        quandoFirebasePronto(async () => {
            try {
                const todos = await getDocs(collection(db, 'usuarios'));

                const pendentesQuery = query(collection(db, 'usuarios'), where('aprovado', '==', false));
                const pendentes = await getDocs(pendentesQuery);

                const adminsQuery = query(collection(db, 'usuarios'), where('cargo', '==', 'admin'));
                const admins = await getDocs(adminsQuery);

                resolve({
                    success: true,
                    total: todos.size,
                    pendentes: pendentes.size,
                    admins: admins.size
                });

            } catch (error) {
                console.error('❌ ADMIN - Erro ao contar:', error);
                resolve({ success: false, error: error.message });
            }
        });
    });
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.verificarAdmin = verificarAdmin;
window.listarUsuariosPendentes = listarUsuariosPendentes;
window.aprovarUsuario = aprovarUsuario;
window.contarUsuarios = contarUsuarios;

console.log('📦 Módulo Admin carregado com sucesso!');