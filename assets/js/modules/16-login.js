/**
 * ============================================
 * MÓDULO 16: AUTENTICAÇÃO MODO PRODUÇÃO
 * ============================================
 * 
 * Este módulo gerencia:
 * - Login com email/senha
 * - Cadastro de novos usuários
 * - Login com Google e GitHub
 * - Recuperação de senha
 * - Sincronização com Firestore
 * - Interface de usuário
 */

import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import app from '../firebase/config.js';

// ============================================
// INICIALIZAÇÃO DOS SERVIÇOS FIREBASE
// ============================================
const auth = getAuth(app);
const db = getFirestore(app);

// Estado Local
let isProcessing = false;

// ============================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ============================================

/**
 * initLogin - Ponto de entrada do módulo
 */
export function initLogin() {
    console.log('🔐 Sistema de Autenticação MathLab v2.0');

    // Aguardar DOM carregar antes de configurar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupAuth());
    } else {
        setupAuth();
    }
}

// ============================================
// CONFIGURAÇÃO DOS EVENTOS
// ============================================

/**
 * setupAuth - Configura todos os listeners da página
 */
function setupAuth() {
    console.log('✅ Configurando autenticação...');

    // Escutar mudança de estado do usuário
    onAuthStateChanged(auth, (user) => {
        const isAuthPage = document.body.classList.contains('auth-page');
        if (user && isAuthPage && !isProcessing) {
            console.log('📱 Usuário já identificado. Redirecionando...');
            window.location.href = '../index.html';
        }
    });

    // Vincular eventos dos formulários com verificação
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => handleAuthAction(e, 'entrar'));
    } else {
        console.warn('⚠️ loginForm não encontrado');
    }

    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', (e) => handleAuthAction(e, 'cadastrar'));
    } else {
        console.warn('⚠️ cadastroForm não encontrado');
    }

    // Botões de login social
    const btnGoogle = document.getElementById('btnGoogle');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => socialLogin('google'));
    }

    const btnGithub = document.getElementById('btnGithub');
    if (btnGithub) {
        btnGithub.addEventListener('click', () => socialLogin('github'));
    }

    // Inicializar UI
    mostrarLogin();
}

// ============================================
// HANDLER PRINCIPAL DE AUTENTICAÇÃO
// ============================================

/**
 * handleAuthAction - Centraliza Login e Cadastro com Email
 * @param {Event} e - Evento do formulário
 * @param {string} acao - 'entrar' ou 'cadastrar'
 */
async function handleAuthAction(e, acao) {
    e.preventDefault();
    if (isProcessing) return;

    // Obter valores dos campos
    let email, senha, nome;

    if (acao === 'entrar') {
        email = document.getElementById('email')?.value;
        senha = document.getElementById('senha')?.value;
    } else {
        email = document.getElementById('emailCadastro')?.value;
        senha = document.getElementById('senhaCadastro')?.value;
        nome = document.getElementById('nome')?.value;
    }

    // Validações
    if (!email || !senha || (acao === 'cadastrar' && !nome)) {
        showFeedback('error', 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    setLoading(true, acao);

    try {
        let userCredential;

        if (acao === 'entrar') {
            // LOGIN
            userCredential = await signInWithEmailAndPassword(auth, email, senha);
            await syncUserData(userCredential.user.uid);
            showFeedback('success', 'Sessão autorizada! Acessando laboratório...');
        } else {
            // CADASTRO
            userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            await createInitialProfile(userCredential.user, { nome });
            showFeedback('success', 'Conta criada com sucesso! Boas aulas.');
        }

        // Redirecionar após sucesso
        setTimeout(() => window.location.href = '../index.html', 1500);

    } catch (error) {
        console.error(`❌ Erro em ${acao}:`, error.code);
        showFeedback('error', translateFirebaseError(error.code));
        setLoading(false, acao);
    }
}

// ============================================
// LOGIN SOCIAL
// ============================================

/**
 * socialLogin - Autenticação com Provedores Terceiros
 * @param {string} provedor - 'google' ou 'github'
 */
async function socialLogin(provedor) {
    if (isProcessing) return;

    setLoading(true, 'social');
    
    const provider = provedor === 'google' 
        ? new GoogleAuthProvider() 
        : new GithubAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verificar se é novo usuário para criar perfil
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        
        if (!userDoc.exists()) {
            await createInitialProfile(user, { nome: user.displayName || 'Usuário Social' });
        } else {
            await syncUserData(user.uid);
        }

        showFeedback('success', `Identificado via ${provedor}! Entrando...`);
        setTimeout(() => window.location.href = '../index.html', 1500);

    } catch (error) {
        console.error('❌ Social Login Error:', error);
        showFeedback('error', 'Falha na conexão com o provedor social.');
        setLoading(false, 'social');
    }
}

// ============================================
// FUNÇÕES DE SINCRONIZAÇÃO COM FIRESTORE
// ============================================

/**
 * syncUserData - Sincroniza dados com Firestore e LocalStorage
 * @param {string} uid - ID do usuário
 */
async function syncUserData(uid) {
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        await updateDoc(userRef, { ultimoAcesso: serverTimestamp() });

        // Salvar no localStorage para acesso rápido
        localStorage.setItem('mathlab_user', JSON.stringify({
            uid,
            nome: data.nome || 'Usuário',
            email: data.email,
            cargo: data.cargo || 'user',
            avatar: data.avatar || null
        }));
        localStorage.setItem('mathlab_logado', 'true');
    }
}

/**
 * createInitialProfile - Cria o documento do usuário no Firestore
 * @param {Object} user - Objeto do usuário do Firebase
 * @param {Object} extras - Dados extras (nome, etc)
 */
async function createInitialProfile(user, extras) {
    const profile = {
        nome: extras.nome || 'Estudante MathLab',
        email: user.email,
        uid: user.uid,
        cargo: 'user',
        aprovado: true,
        dataCadastro: serverTimestamp(),
        ultimoAcesso: serverTimestamp(),
        estatisticas: { 
            calculosRealizados: 0,
            ferramentasUsadas: []
        }
    };

    await setDoc(doc(db, 'usuarios', user.uid), profile);
    
    localStorage.setItem('mathlab_user', JSON.stringify(profile));
    localStorage.setItem('mathlab_logado', 'true');
}

// ============================================
// CONTROLE DE ESTADO DA INTERFACE
// ============================================

/**
 * setLoading - Gerencia o estado visual de processamento
 * @param {boolean} loading - Estado de carregamento
 * @param {string} context - Contexto: 'entrar', 'cadastrar', 'social'
 */
function setLoading(loading, context) {
    isProcessing = loading;

    if (context === 'entrar') {
        const btn = document.getElementById('btnSubmitLogin');
        if (btn) {
            btn.disabled = loading;
            btn.style.opacity = loading ? '0.7' : '1';
            if (loading) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            } else {
                btn.innerHTML = '<span>Entrar no Sistema</span><i class="fas fa-chevron-right"></i>';
            }
        }
    } 
    else if (context === 'cadastrar') {
        const btn = document.getElementById('btnSubmitCadastro');
        if (btn) {
            btn.disabled = loading;
            btn.style.opacity = loading ? '0.7' : '1';
            if (loading) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            } else {
                btn.innerHTML = '<span>Criar Minha Conta</span><i class="fas fa-user-check"></i>';
            }
        }
    } 
    else if (context === 'social') {
        const btnGoogle = document.getElementById('btnGoogle');
        const btnGithub = document.getElementById('btnGithub');
        if (btnGoogle) btnGoogle.disabled = loading;
        if (btnGithub) btnGithub.disabled = loading;
    }
}

/**
 * showFeedback - Exibe alertas de sucesso ou erro
 * @param {string} type - Tipo: 'success', 'error', 'info'
 * @param {string} message - Mensagem a ser exibida
 */
function showFeedback(type, message) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) {
        console.warn('⚠️ Elemento mensagem não encontrado');
        return;
    }

    msgDiv.innerText = message;
    msgDiv.className = `auth-message ${type}`;
    msgDiv.style.display = 'block';

    // Vibração se suportado (apenas em erro)
    if (type === 'error' && navigator.vibrate) {
        navigator.vibrate(100);
    }

    // Auto-esconder após 5 segundos
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// FUNÇÕES DE INTERFACE DO USUÁRIO
// ============================================

/**
 * toggleSenha - Alterna visibilidade da senha
 * @param {string} inputId - ID do input de senha
 * @param {HTMLElement} icon - Elemento do ícone
 */
export function toggleSenha(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

/**
 * mostrarLogin - Alterna para o formulário de login
 */
export function mostrarLogin() {
    const loginDiv = document.getElementById('loginDiv');
    const cadastroDiv = document.getElementById('cadastroDiv');
    const btnLogin = document.getElementById('btnLogin');
    const btnCadastro = document.getElementById('btnCadastro');
    const authIcon = document.getElementById('authIcon');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    if (loginDiv) loginDiv.classList.add('active');
    if (cadastroDiv) cadastroDiv.classList.remove('active');
    if (btnLogin) btnLogin.classList.add('active');
    if (btnCadastro) btnCadastro.classList.remove('active');
    if (authIcon) authIcon.className = 'fas fa-lock';
    if (authTitle) authTitle.innerText = 'Bem-vindo de volta';
    if (authSubtitle) authSubtitle.innerText = 'Acesse sua conta para continuar seus estudos';
}

/**
 * mostrarCadastro - Alterna para o formulário de cadastro
 */
export function mostrarCadastro() {
    const loginDiv = document.getElementById('loginDiv');
    const cadastroDiv = document.getElementById('cadastroDiv');
    const btnLogin = document.getElementById('btnLogin');
    const btnCadastro = document.getElementById('btnCadastro');
    const authIcon = document.getElementById('authIcon');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    if (loginDiv) loginDiv.classList.remove('active');
    if (cadastroDiv) cadastroDiv.classList.add('active');
    if (btnLogin) btnLogin.classList.remove('active');
    if (btnCadastro) btnCadastro.classList.add('active');
    if (authIcon) authIcon.className = 'fas fa-user-plus';
    if (authTitle) authTitle.innerText = 'Crie sua conta';
    if (authSubtitle) authSubtitle.innerText = 'Junte-se à maior comunidade de matemática';
}

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

/**
 * recuperarSenha - Envia email para recuperação de senha
 */
export async function recuperarSenha() {
    const emailInput = document.getElementById('email') || document.getElementById('emailCadastro');
    const email = emailInput?.value;

    if (!email) {
        showFeedback('error', 'Por favor, digite seu email para procedermos com a recuperação.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showFeedback('success', 'Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error) {
        console.error('Erro na recuperação:', error);
        showFeedback('error', translateFirebaseError(error.code));
    }
}

// ============================================
// TRADUÇÃO DE ERROS DO FIREBASE
// ============================================

/**
 * translateFirebaseError - Traduz códigos de erro do Firebase
 * @param {string} code - Código do erro
 * @returns {string} Mensagem amigável
 */
function translateFirebaseError(code) {
    const errors = {
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta para este usuário.',
        'auth/invalid-email': 'O endereço de email é inválido.',
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada.',
        'auth/too-many-requests': 'Acesso bloqueado temporariamente por excesso de tentativas.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
        'auth/internal-error': 'Erro interno no servidor de autenticação.'
    };
    return errors[code] || 'Ocorreu um erro inesperado. Tente novamente.';
}

// ============================================
// EXPOSIÇÃO GLOBAL (para onclick no HTML)
// ============================================
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.toggleSenha = toggleSenha;
window.recuperarSenha = recuperarSenha;

// ============================================
// AUTO-INICIALIZAÇÃO
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
} else {
    initLogin();
}