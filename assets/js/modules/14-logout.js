// ============================================
// MÓDULO 14: FUNÇÕES DE LOGOUT (MODULAR)
// ============================================

/**
 * mostrarModalLogout - Exibe o modal de confirmação de logout
 * Se o modal não existir, chama confirmarLogout diretamente
 */
export function mostrarModalLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('active');
        console.log('🚪 Modal de logout exibido');
    } else {
        console.warn('⚠️ Modal não encontrado, fazendo logout direto');
        confirmarLogout();
    }
}

/**
 * fecharModal - Fecha o modal de logout
 */
export function fecharModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('🚪 Modal de logout fechado');
    }
}

/**
 * determinarCaminhoLogin - Determina o caminho correto para a página de login
 * @returns {string} Caminho relativo para login.html
 */
function determinarCaminhoLogin() {
    const path = window.location.pathname;
    
    if (path.includes('/pages/admin/')) {
        return '../login.html'; // pages/admin/ → ../login.html
    } else if (path.includes('/pages/')) {
        return 'login.html'; // pages/ → login.html
    } else {
        return './pages/login.html'; // raiz → ./pages/login.html
    }
}

/**
 * confirmarLogout - Executa o logout e redireciona para a página de login
 */
export async function confirmarLogout() {
    console.log('🚪 Iniciando processo de logout...');
    
    try {
        // 1. Logout do Firebase
        if (window.auth) {
            await window.auth.signOut();
            console.log('✅ Logout do Firebase realizado');
        } else {
            console.warn('⚠️ Firebase não disponível');
        }
    } catch (error) {
        console.error('❌ Erro no logout do Firebase:', error);
    }

    // 2. Limpar dados locais
    try {
        localStorage.removeItem('mathlab_user');
        localStorage.removeItem('mathlab_settings');
        localStorage.removeItem('mathlab_logado');
        console.log('✅ Dados locais removidos');
    } catch (e) {
        console.warn('⚠️ Erro ao limpar localStorage:', e);
    }

    // 3. Fechar modal se estiver aberto
    fecharModal();

    // 4. Determinar caminho correto
    const target = determinarCaminhoLogin();
    console.log('📤 Redirecionando para:', target);

    // 5. Redirecionar
    window.location.href = target;
}

// ============================================
// LISTENER GLOBAL PARA TECLA ESC
// ============================================

let listenerInicializado = false;

/**
 * initEscapeListener - Inicializa o listener para fechar o modal com ESC
 */
function initEscapeListener() {
    if (listenerInicializado) return;
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('logoutModal');
            if (modal && modal.classList.contains('active')) {
                fecharModal();
                console.log('🔽 Modal fechado com tecla ESC');
            }
        }
    });
    
    listenerInicializado = true;
    console.log('✅ Listener ESC inicializado');
}

// Inicializar o listener
initEscapeListener();

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.mostrarModalLogout = mostrarModalLogout;
window.fecharModal = fecharModal;
window.confirmarLogout = confirmarLogout;

console.log('📦 Módulo de logout carregado');