/**
 * ============================================
 * MÓDULO 16: LOGIN - AUTENTICAÇÃO COMPLETA
 * ============================================
 * 
 * Gerencia:
 * - Login com email/senha
 * - Cadastro de novos usuários
 * - Login com Google, GitHub e Apple
 * - Recuperação de senha
 * - Sincronização com Firestore
 */

import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    GoogleAuthProvider,
    GithubAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    browserLocalPersistence,
    setPersistence
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
// INICIALIZAÇÃO
// ============================================
const auth = getAuth(app);
const db = getFirestore(app);

// Estado
let isProcessing = false;
const tentativasLogin = new Map();
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO = 15 * 60 * 1000; // 15 minutos

// Detectar dispositivo Apple
const isAppleDevice = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

function log(mensagem, tipo = 'info') {
    if (tipo === 'erro') {
        console.error(`[Login] ${mensagem}`);
    } else {
        console.log(`[Login] ${mensagem}`);
    }
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarSenha(senha) {
    if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
    if (!/[A-Z]/.test(senha)) return 'A senha deve conter uma letra maiúscula';
    if (!/[0-9]/.test(senha)) return 'A senha deve conter um número';
    return null;
}

function checkRateLimit(email) {
    const tentativas = tentativasLogin.get(email) || { count: 0, timestamp: Date.now() };
    
    if (Date.now() - tentativas.timestamp > TEMPO_BLOQUEIO) {
        tentativas.count = 0;
        tentativas.timestamp = Date.now();
    }
    
    if (tentativas.count >= MAX_TENTATIVAS) {
        const minutos = Math.ceil((TEMPO_BLOQUEIO - (Date.now() - tentativas.timestamp)) / 60000);
        throw new Error(`Muitas tentativas. Tente novamente em ${minutos} minutos.`);
    }
    
    tentativas.count++;
    tentativasLogin.set(email, tentativas);
}

function mostrarMensagem(tipo, texto) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) return;
    
    msgDiv.textContent = texto;
    msgDiv.className = `auth-message ${tipo}`;
    msgDiv.style.display = 'block';
    
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 5000);
}

function setCarregando(ativo, contexto = '') {
    isProcessing = ativo;
    
    const botoes = {
        login: document.getElementById('btnSubmitLogin'),
        cadastro: document.getElementById('btnSubmitCadastro'),
        google: document.getElementById('btnGoogle'),
        github: document.getElementById('btnGithub'),
        apple: document.getElementById('btnApple')
    };
    
    if (contexto === 'entrar' && botoes.login) {
        botoes.login.disabled = ativo;
        botoes.login.style.opacity = ativo ? '0.7' : '1';
        botoes.login.innerHTML = ativo ? 
            '<i class="fas fa-spinner fa-spin"></i> Processando...' : 
            '<span>Entrar no Sistema</span><i class="fas fa-chevron-right"></i>';
    }
    else if (contexto === 'cadastrar' && botoes.cadastro) {
        botoes.cadastro.disabled = ativo;
        botoes.cadastro.style.opacity = ativo ? '0.7' : '1';
        botoes.cadastro.innerHTML = ativo ? 
            '<i class="fas fa-spinner fa-spin"></i> Processando...' : 
            '<span>Criar Minha Conta</span><i class="fas fa-user-check"></i>';
    }
    else if (contexto === 'social') {
        ['google', 'github', 'apple'].forEach(prov => {
            if (botoes[prov]) {
                botoes[prov].disabled = ativo;
                botoes[prov].style.opacity = ativo ? '0.5' : '1';
            }
        });
    }
}

// ============================================
// FUNÇÕES DO FIRESTORE
// ============================================

async function criarPerfilInicial(user, extras = {}) {
    try {
        const perfil = {
            uid: user.uid,
            nome: extras.nome || user.displayName || 'Estudante',
            email: user.email,
            cargo: 'user',
            provedor: extras.provedor || 'email',
            aprovado: true,
            avatar: user.photoURL || null,
            dataCadastro: serverTimestamp(),
            ultimoAcesso: serverTimestamp(),
            estatisticas: {
                calculosRealizados: 0,
                ferramentasUsadas: []
            }
        };
        
        await setDoc(doc(db, 'usuarios', user.uid), perfil);
        log(`Perfil criado para ${user.email}`);
        
        // Salvar no localStorage
        localStorage.setItem('mathlab_user', JSON.stringify(perfil));
        localStorage.setItem('mathlab_logado', 'true');
        
    } catch (error) {
        log(`Erro ao criar perfil: ${error.message}`, 'erro');
        throw error;
    }
}

async function sincronizarUsuario(uid) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const dados = userDoc.data();
            await updateDoc(userRef, { ultimoAcesso: serverTimestamp() });
            
            localStorage.setItem('mathlab_user', JSON.stringify({
                uid,
                nome: dados.nome,
                email: dados.email,
                cargo: dados.cargo || 'user',
                avatar: dados.avatar || null
            }));
            localStorage.setItem('mathlab_logado', 'true');
        }
    } catch (error) {
        log(`Erro ao sincronizar: ${error.message}`, 'erro');
    }
}

// ============================================
// HANDLERS DE AUTENTICAÇÃO
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    if (isProcessing) return;
    
    const email = document.getElementById('email')?.value.trim();
    const senha = document.getElementById('senha')?.value;
    
    if (!email || !senha) {
        mostrarMensagem('erro', 'Preencha todos os campos');
        return;
    }
    
    if (!validarEmail(email)) {
        mostrarMensagem('erro', 'Email inválido');
        return;
    }
    
    try {
        checkRateLimit(email);
    } catch (error) {
        mostrarMensagem('erro', error.message);
        return;
    }
    
    setCarregando(true, 'entrar');
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        await sincronizarUsuario(userCredential.user.uid);
        
        mostrarMensagem('sucesso', 'Login realizado! Redirecionando...');
        tentativasLogin.delete(email);
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        
    } catch (error) {
        log(`Erro no login: ${error.code}`, 'erro');
        tratarErroFirebase(error.code);
        setCarregando(false, 'entrar');
    }
}

async function handleCadastro(event) {
    event.preventDefault();
    if (isProcessing) return;
    
    const nome = document.getElementById('nome')?.value.trim();
    const email = document.getElementById('emailCadastro')?.value.trim();
    const senha = document.getElementById('senhaCadastro')?.value;
    
    if (!nome || !email || !senha) {
        mostrarMensagem('erro', 'Preencha todos os campos');
        return;
    }
    
    if (!validarEmail(email)) {
        mostrarMensagem('erro', 'Email inválido');
        return;
    }
    
    const erroSenha = validarSenha(senha);
    if (erroSenha) {
        mostrarMensagem('erro', erroSenha);
        return;
    }
    
    setCarregando(true, 'cadastrar');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await criarPerfilInicial(userCredential.user, { nome, provedor: 'email' });
        
        mostrarMensagem('sucesso', 'Conta criada! Redirecionando...');
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        
    } catch (error) {
        log(`Erro no cadastro: ${error.code}`, 'erro');
        tratarErroFirebase(error.code);
        setCarregando(false, 'cadastrar');
    }
}

async function handleSocialLogin(provedor) {
    if (isProcessing) return;
    setCarregando(true, 'social');
    
    let provider;
    let nomeProvedor = provedor;
    
    try {
        switch(provedor) {
            case 'google':
                provider = new GoogleAuthProvider();
                nomeProvedor = 'Google';
                break;
            case 'github':
                provider = new GithubAuthProvider();
                nomeProvedor = 'GitHub';
                break;
            case 'apple':
                provider = new OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                provider.setCustomParameters({ locale: 'pt-BR' });
                nomeProvedor = 'Apple';
                break;
            default:
                throw new Error('Provedor inválido');
        }
        
        let result;
        
        if (isAppleDevice && provedor === 'apple') {
            await signInWithRedirect(auth, provider);
            return;
        } else {
            result = await signInWithPopup(auth, provider);
        }
        
        if (result) {
            const user = result.user;
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            
            if (!userDoc.exists()) {
                await criarPerfilInicial(user, { 
                    nome: user.displayName,
                    provedor: provedor 
                });
            } else {
                await sincronizarUsuario(user.uid);
            }
            
            mostrarMensagem('sucesso', `Login via ${nomeProvedor} realizado!`);
            setTimeout(() => window.location.href = '../index.html', 1500);
        }
        
    } catch (error) {
        log(`Erro no login ${nomeProvedor}: ${error.code}`, 'erro');
        
        if (error.code === 'auth/popup-blocked' && provedor === 'apple') {
            try {
                await signInWithRedirect(auth, provider);
                return;
            } catch (redirectError) {
                log(`Erro no redirect: ${redirectError}`, 'erro');
            }
        }
        
        tratarErroSocial(error, nomeProvedor);
        setCarregando(false, 'social');
    }
}

async function handleRecuperarSenha() {
    const emailInput = document.getElementById('email') || document.getElementById('emailCadastro');
    const email = emailInput?.value.trim();
    
    if (!email) {
        mostrarMensagem('erro', 'Digite seu email');
        return;
    }
    
    if (!validarEmail(email)) {
        mostrarMensagem('erro', 'Email inválido');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarMensagem('sucesso', 'Email de recuperação enviado!');
    } catch (error) {
        log(`Erro na recuperação: ${error.code}`, 'erro');
        tratarErroFirebase(error.code);
    }
}

// ============================================
// TRATAMENTO DE ERROS
// ============================================

function tratarErroFirebase(code) {
    const erros = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/email-already-in-use': 'Email já cadastrado',
        'auth/weak-password': 'Senha muito fraca',
        'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde',
        'auth/network-request-failed': 'Erro de conexão',
        'auth/popup-closed-by-user': 'Login cancelado'
    };
    
    mostrarMensagem('erro', erros[code] || 'Erro inesperado');
}

function tratarErroSocial(error, provedor) {
    if (error.code === 'auth/popup-closed-by-user') {
        mostrarMensagem('info', 'Login cancelado');
    } else if (error.code === 'auth/popup-blocked') {
        mostrarMensagem('erro', 'Popup bloqueado pelo navegador');
    } else {
        mostrarMensagem('erro', `Erro ao conectar com ${provedor}`);
    }
}

// ============================================
// FUNÇÕES DE INTERFACE (GLOBAIS)
// ============================================

window.mostrarLogin = function() {
    document.getElementById('loginDiv')?.classList.add('active');
    document.getElementById('cadastroDiv')?.classList.remove('active');
    document.getElementById('btnLogin')?.classList.add('active');
    document.getElementById('btnCadastro')?.classList.remove('active');
    document.getElementById('authIcon').className = 'fas fa-lock';
    document.getElementById('authTitle').innerText = 'Bem-vindo de volta';
    document.getElementById('authSubtitle').innerText = 'Acesse sua conta para continuar seus estudos';
};

window.mostrarCadastro = function() {
    document.getElementById('loginDiv')?.classList.remove('active');
    document.getElementById('cadastroDiv')?.classList.add('active');
    document.getElementById('btnLogin')?.classList.remove('active');
    document.getElementById('btnCadastro')?.classList.add('active');
    document.getElementById('authIcon').className = 'fas fa-user-plus';
    document.getElementById('authTitle').innerText = 'Crie sua conta';
    document.getElementById('authSubtitle').innerText = 'Junte-se à maior comunidade de matemática';
};

window.toggleSenha = function(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

window.recuperarSenha = handleRecuperarSenha;

// ============================================
// INICIALIZAÇÃO
// ============================================

export function initLogin() {
    log('Inicializando módulo de login...');
    
    // Configurar persistência
    setPersistence(auth, browserLocalPersistence).catch(log);
    
    // Verificar resultado de redirect (Apple)
    getRedirectResult(auth).then(result => {
        if (result) {
            handleSocialLoginSuccess(result.user, 'Apple');
        }
    }).catch(log);
    
    // Observar estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = '../index.html';
        }
    });
    
    // Configurar eventos quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configurarEventos);
    } else {
        configurarEventos();
    }
}

function configurarEventos() {
    log('Configurando eventos dos formulários...');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        log('✓ Formulário de login configurado');
    }
    
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', handleCadastro);
        log('✓ Formulário de cadastro configurado');
    }
    
    const btnGoogle = document.getElementById('btnGoogle');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', () => handleSocialLogin('google'));
        log('✓ Botão Google configurado');
    }
    
    const btnGithub = document.getElementById('btnGithub');
    if (btnGithub) {
        btnGithub.addEventListener('click', () => handleSocialLogin('github'));
        log('✓ Botão GitHub configurado');
    }
    
    const btnApple = document.getElementById('btnApple');
    if (btnApple) {
        btnApple.addEventListener('click', () => handleSocialLogin('apple'));
        log('✓ Botão Apple configurado');
    }
}

// Auto-inicialização (será chamada pelo script.js)
if (typeof window !== 'undefined' && !window.location.pathname.includes('login.html')) {
    // Não inicializa automaticamente se não estiver na página de login
} else {
    initLogin();
}