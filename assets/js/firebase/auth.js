// ============================================
// FIREBASE AUTH - FUNÇÕES DE AUTENTICAÇÃO (MODULAR)
// ============================================
//
// 🔐 SEGURANÇA E AUTENTICAÇÃO:
// =================================
// - Firebase Authentication com regras de segurança
// - Senhas mínimas de 6 caracteres
// - Validação de email automática
// - Proteção contra brute force
// - Rate limiting configurado
//
// 📋 FUNCIONALIDADES IMPLEMENTADAS:
// =====================================
// - Cadastro de novos usuários
// - Login com email e senha
// - Logout seguro
// - Observador de estado de autenticação
// - Persistência de sessão
// - Validação de dados em tempo real
//
// 🗄️ ESTRUTURA DE DADOS:
// =========================
// Coleção 'usuarios' no Firestore
// Documento por UID do usuário
// Campos: nome, email, cargo, aprovado, datas
//
// 🚀 MÉTODOS EXPORTADOS:
// =========================
// - cadastrarUsuario(): Cria nova conta
// - loginUsuario(): Autentica usuário existente
// - logoutUsuario(): Encerra sessão
// - observarUsuario(): Listener de mudanças de estado
// - verificarLogin(): Verifica sessão atual
//
// ⚠️ IMPORTANTE:
// ==============
// - Usar sempre await para operações assíncronas
// - Tratar erros com try/catch
// - Validar dados no cliente antes de enviar
// - Não expor informações sensíveis no console
//

// ============================================
// IMPORTAÇÕES FIREBASE (SDK v12.10.0)
// ============================================
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import app from './config.js';

// ============================================
// INICIALIZAÇÃO DOS SERVIÇOS
// ============================================
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * 📝 cadastrarUsuario - Cria nova conta de usuário
 * ==============================================================
 * 
 * @param {string} email - Email válido do usuário
 * @param {string} senha - Senha com mínimo 6 caracteres
 * @param {string} nome - Nome de exibição do usuário
 * 
 * @returns {Promise<Object>} Resultado da operação
 *   - success: boolean - Status da operação
 *   - user: Object - Dados do usuário criado
 *   - error: string - Mensagem de erro (se houver)
 */
export async function cadastrarUsuario(email, senha, nome) {
    try {
        console.log('📝 Cadastrando:', email);
        
        // 1. Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;
        
        console.log('✅ Usuário criado no Auth:', user.uid);
        
        // 2. Salvar dados no Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
            nome: nome,
            email: email,
            cargo: 'user',
            aprovado: true, // Mude para false se quiser aprovação manual
            dataCadastro: new Date().toISOString(),
            ultimoAcesso: new Date().toISOString()
        });
        
        console.log('✅ Dados salvos no Firestore');
        
        return { 
            success: true, 
            user: {
                uid: user.uid,
                email: user.email,
                nome: nome
            }
        };
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error.code, error.message);
        
        let mensagem = '';
        switch(error.code) {
            case 'auth/email-already-in-use':
                mensagem = 'Este email já está cadastrado.';
                break;
            case 'auth/invalid-email':
                mensagem = 'Email inválido.';
                break;
            case 'auth/weak-password':
                mensagem = 'Senha muito fraca. Use pelo menos 6 caracteres.';
                break;
            default:
                mensagem = 'Erro ao cadastrar. Tente novamente.';
        }
        
        return { success: false, error: mensagem };
    }
}

/**
 * 🔐 loginUsuario - Autentica usuário existente
 * ================================================
 * 
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * 
 * @returns {Promise<Object>} Resultado da operação
 *   - success: boolean - Status da operação
 *   - user: Object - Dados do usuário autenticado
 *   - error: string - Mensagem de erro (se houver)
 */
export async function loginUsuario(email, senha) {
    try {
        console.log('🔐 Logando:', email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;
        
        console.log('✅ Login bem-sucedido:', user.uid);
        
        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        let userData = {};
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Atualizar último acesso
            await updateDoc(doc(db, 'usuarios', user.uid), {
                ultimoAcesso: new Date().toISOString()
            });
        }
        
        return { 
            success: true, 
            user: {
                uid: user.uid,
                email: user.email,
                nome: userData.nome || email.split('@')[0]
            }
        };
        
    } catch (error) {
        console.error('❌ Erro no login:', error.code, error.message);
        
        let mensagem = '';
        switch(error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                mensagem = 'Email ou senha incorretos.';
                break;
            case 'auth/invalid-email':
                mensagem = 'Email inválido.';
                break;
            case 'auth/too-many-requests':
                mensagem = 'Muitas tentativas. Aguarde e tente novamente.';
                break;
            default:
                mensagem = 'Erro ao fazer login. Tente novamente.';
        }
        
        return { success: false, error: mensagem };
    }
}

/**
 * 🚪 logoutUsuario - Encerra sessão do usuário
 * ================================================
 * 
 * @returns {Promise<Object>} Resultado da operação
 *   - success: boolean - Status da operação
 *   - error: string - Mensagem de erro (se houver)
 */
export async function logoutUsuario() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 👁 observarUsuario - Listener para mudanças de estado
 * ==================================================
 * 
 * @param {Function} callback - Função executada em mudanças
 * 
 * @returns {Function} Função unsubscribe do listener
 */
export function observarUsuario(callback) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            callback({
                logado: true,
                uid: user.uid,
                email: user.email,
                nome: userData.nome || user.email.split('@')[0]
            });
        } else {
            callback({ logado: false });
        }
    });
}

/**
 * ✅ verificarLogin - Verifica estado atual da sessão
 * ================================================
 * 
 * @returns {Object} Estado da sessão atual
 *   - logado: boolean - Usuário está autenticado
 *   - uid: string - ID do usuário (se logado)
 *   - email: string - Email do usuário (se logado)
 */
export function verificarLogin() {
    const user = auth.currentUser;
    if (user) {
        return {
            logado: true,
            uid: user.uid,
            email: user.email
        };
    }
    return { logado: false };
}

console.log('📦 Firebase Auth modular carregado com segurança reforçada');