/**
 * ============================================
 * MÓDULO 16: AUTENTICAÇÃO MODO PRODUÇÃO
 * ============================================
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

const auth = getAuth(app);
const db = getFirestore(app);

// Estado Local
let isProcessing = false;

/**
 * initLogin - Ponto de entrada
 */
export function initLogin() {
    console.log('🔐 Sistema de Autenticação MathLab v2.0');

    // Escutar mudança de estado (Apenas se estiver na página de login/cadastro)
    const isAuthPage = document.body.classList.contains('auth-page');
    onAuthStateChanged(auth, (user) => {
        if (user && isAuthPage && !isProcessing) {
            console.log('📱 Usuário já identificado. Redirecionando para a Home...');
            // Garantir que redireciona para a raiz correta
            window.location.href = '../index.html';
        }
    });

    // Vincular Eventos
    const forms = {
        login: document.getElementById('loginForm'),
        cadastro: document.getElementById('cadastroForm')
    };

    forms.login?.addEventListener('submit', (e) => handleAuthAction(e, 'entrar'));
    forms.cadastro?.addEventListener('submit', (e) => handleAuthAction(e, 'cadastrar'));

    // Botoes Sociais
    document.getElementById('btnGoogle')?.addEventListener('click', () => socialLogin('google'));
    document.getElementById('btnGithub')?.addEventListener('click', () => socialLogin('github'));

    // Inicializar UI
    mostrarLogin();
}

/**
 * handleAuthAction - Centraliza Login e Cadastro com Email
 */
async function handleAuthAction(e, acao) {
    e.preventDefault();
    if (isProcessing) return;

    const email = acao === 'entrar' ? document.getElementById('email').value : document.getElementById('emailCadastro').value;
    const senha = acao === 'entrar' ? document.getElementById('senha').value : document.getElementById('senhaCadastro').value;
    const nome = acao === 'cadastrar' ? document.getElementById('nome').value : null;

    if (!email || !senha || (acao === 'cadastrar' && !nome)) {
        showFeedback('error', 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    setLoading(true, acao);

    try {
        let userCredential;
        if (acao === 'entrar') {
            userCredential = await signInWithEmailAndPassword(auth, email, senha);
            await syncUserData(userCredential.user.uid);
            showFeedback('success', 'Sessão autorizada! Acessando laboratório...');
        } else {
            userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            await createInitialProfile(userCredential.user, { nome });
            showFeedback('success', 'Conta criada com sucesso! Boas aulas.');
        }

        setTimeout(() => window.location.href = '../index.html', 1500);

    } catch (error) {
        console.error(`❌ Erro em ${acao}:`, error.code);
        showFeedback('error', translateFirebaseError(error.code));
        setLoading(false, acao);
    }
}

/**
 * socialLogin - Autenticação com Provedores Terceiros
 */
async function socialLogin(provedor) {
    if (isProcessing) return;

    setLoading(true, 'social');
    const provider = provedor === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verificar se é novo usuário para criar perfil
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (!userDoc.exists()) {
            await createInitialProfile(user, { nome: user.displayName });
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

/**
 * syncUserData - Sincroniza dados com Firestore e LocalStorage
 */
async function syncUserData(uid) {
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        await updateDoc(userRef, { ultimoAcesso: serverTimestamp() });

        localStorage.setItem('mathlab_user', JSON.stringify({
            uid,
            nome: data.nome,
            email: data.email,
            cargo: data.cargo,
            avatar: data.avatar || null
        }));
        localStorage.setItem('mathlab_logado', 'true');
    }
}

/**
 * createInitialProfile - Cria o documento do usuário no Firestore
 */
async function createInitialProfile(user, extras) {
    const profile = {
        nome: extras.nome || 'Estudante MathLab',
        email: user.email,
        uid: user.uid,
        cargo: 'user', // Padrão é user
        aprovado: true,
        dataCadastro: serverTimestamp(),
        ultimoAcesso: serverTimestamp(),
        estatisticas: { calculosRealizados: 0 }
    };

    await setDoc(doc(db, 'usuarios', user.uid), profile);
    localStorage.setItem('mathlab_user', JSON.stringify(profile));
    localStorage.setItem('mathlab_logado', 'true');
}

/**
 * setLoading - Gerencia o estado visual de processamento
 */
function setLoading(loading, context) {
    isProcessing = loading;
    const btns = {
        entrar: document.getElementById('btnSubmitLogin'),
        cadastrar: document.getElementById('btnSubmitCadastro'),
        social: [document.getElementById('btnGoogle'), document.getElementById('btnGithub')]
    };

    const apply = (btn, text) => {
        if (!btn) return;
        btn.disabled = loading;
        btn.style.opacity = loading ? '0.7' : '1';
        if (loading) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processando...`;
        else btn.querySelector('span').innerText = text;
    };

    if (context === 'entrar') apply(btns.entrar, 'Entrar no Sistema');
    else if (context === 'cadastrar') apply(btns.cadastrar, 'Criar Minha Conta');
    else if (context === 'social') {
        btns.social.forEach(b => { if (b) b.disabled = loading; });
    }
}

/**
 * showFeedback - Exibe alertas de sucesso ou erro
 */
function showFeedback(type, message) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) return;

    msgDiv.innerText = message;
    msgDiv.className = `auth-message ${type}`;
    msgDiv.style.display = 'block';

    if (type === 'error') {
        // Vibração se suportado
        if (navigator.vibrate) navigator.vibrate(100);
    }
}

/**
 * toggleSenha - Alterna visibilidade da senha
 */
export function toggleSenha(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

/**
 * Tradução de Erros Firebase
 */
function translateFirebaseError(code) {
    const errors = {
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta para este usuário.',
        'auth/invalid-email': 'O endereço de email é inválido.',
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada.',
        'auth/too-many-requests': 'Acesso bloqueado temporariamente por excesso de tentativas.'
    };
    return errors[code] || 'Ocorreu um erro inesperado. Tente novamente.';
}

// Funções de UI alternáveis
export function mostrarLogin() {
    document.getElementById('loginDiv').classList.add('active');
    document.getElementById('cadastroDiv').classList.remove('active');
    document.getElementById('btnLogin').classList.add('active');
    document.getElementById('btnCadastro').classList.remove('active');

    document.getElementById('authIcon').className = 'fas fa-lock';
    document.getElementById('authTitle').innerText = 'Bem-vindo de volta';
    document.getElementById('authSubtitle').innerText = 'Acesse sua conta para continuar seus estudos';
}

export function mostrarCadastro() {
    document.getElementById('loginDiv').classList.remove('active');
    document.getElementById('cadastroDiv').classList.add('active');
    document.getElementById('btnLogin').classList.remove('active');
    document.getElementById('btnCadastro').classList.add('active');

    document.getElementById('authIcon').className = 'fas fa-user-plus';
    document.getElementById('authTitle').innerText = 'Crie sua conta';
    document.getElementById('authSubtitle').innerText = 'Junte-se à maior comunidade de matemática';
}

/**
 * recuperarSenha - Envia email para recuperação
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
        showFeedback('success', 'Email de recuperação despachado! Verifique sua caixa de entrada.');
    } catch (error) {
        console.error('Erro na recuperação:', error);
        showFeedback('error', translateFirebaseError(error.code));
    }
}

// Exposição Global Segura
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.toggleSenha = toggleSenha;
window.recuperarSenha = recuperarSenha;

// Auto-boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
} else {
    initLogin();
}