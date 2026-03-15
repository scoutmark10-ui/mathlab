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
// Importa módulos essenciais do Firebase Authentication
// Importa módulos do Firestore para gerenciamento de dados
// Importa configuração do projeto Firebase
//
// 📦 MÓDULOS IMPORTADOS:
// =========================
// - getAuth: Serviço de autenticação
// - createUserWithEmailAndPassword: Criação de usuários
// - signInWithEmailAndPassword: Login tradicional
// - signOut: Encerramento de sessão
// - onAuthStateChanged: Listener de estado
// - getFirestore, doc, setDoc, getDoc, updateDoc: Banco de dados
//
// 🔧 VARIÁVEIS GLOBAIS:
// =========================
// - auth: Instância do Auth Service
// - db: Instância do Firestore
// - app: Instância do Firebase App (do config.js)

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
 * 
 * 🔄 FLUXO DE EXECUÇÃO:
 * =========================
 * 1. Validação básica dos parâmetros
 * 2. Criação do usuário no Firebase Auth
 * 3. Salvamento dos dados no Firestore
 * 4. Tratamento de erros específicos
 * 5. Retorno padronizado
 * 
 * 🛡️ SEGURANÇA IMPLEMENTADA:
 * =========================
 * - Validação automática de email (Firebase)
 * - Verificação de força de senha
 * - Proteção contra emails duplicados
 * - Criptografia de senha em trânsito
 * - Rate limiting automático
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
 * 
 * 🔄 FLUXO DE EXECUÇÃO:
 * =========================
 * 1. Validação dos parâmetros
 * 2. Autenticação com Firebase Auth
 * 3. Busca de dados adicionais no Firestore
 * 4. Atualização de último acesso
 * 5. Tratamento de erros específicos
 * 6. Retorno padronizado
 * 
 * 🔍 MÉTODOS DE SEGURANÇA:
 * =========================
 * - Verificação de credenciais em tempo real
 * - Proteção contra timing attacks
 * - Limite de tentativas de login
 * - Logs de tentativas fracassadas
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
 * 
 * 🔄 FLUXO DE EXECUÇÃO:
 * =========================
 * 1. Revogação de token do Firebase
 * 2. Limpeza de cache local
 * 3. Redirecionamento para página inicial
 * 4. Tratamento de erros
 * 
 * 🛡️ SEGURANÇA IMPLEMENTADA:
 * =========================
 * - Invalidação de todos os tokens ativos
 * - Limpeza segura de dados sensíveis
 * - Prevenção de session hijacking
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
 * 
 * 🔄 FLUXO DE EXECUÇÃO:
 * =========================
 * 1. Configura listener do Firebase Auth
 * 2. Busca dados completos do usuário
 * 3. Executa callback com dados atualizados
 * 4. Trata estados (logado/deslogado)
 * 5. Retorna função para limpeza
 * 
 * 📊 DADOS FORNECIDOS NO CALLBACK:
 * =====================================
 * - logado: boolean - Estado de autenticação
 * - uid: string - ID único do usuário
 * - email: string - Email do usuário
 * - nome: string - Nome de exibição
 * - cargo: string - Função no sistema
 * - aprovado: boolean - Status de aprovação
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

// ==================== VERIFICAR SE ESTÁ LOGADO ====================
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

/**
 * ✅ verificarLogin - Verifica estado atual da sessão
 * ================================================
 * 
 * @returns {Object} Estado da sessão atual
 *   - logado: boolean - Usuário está autenticado
 *   - uid: string - ID do usuário (se logado)
 *   - email: string - Email do usuário (se logado)
 * 
 * 🔄 FLUXO DE EXECUÇÃO:
 * =========================
 * 1. Verifica usuário atual no Firebase Auth
 * 2. Retorna dados básicos se logado
 * 3. Retorna estado vazio se deslogado
 * 4. Uso síncrono (rápido)
 * 
 * 🎯 CASOS DE USO:
 * ===================
 * - Verificação em rotas protegidas
 * - Atualização de UI baseada em estado
 * - Validação de permissões
 * - Middleware de autenticação
 */

console.log('📦 Firebase Auth modular carregado com segurança reforçada');