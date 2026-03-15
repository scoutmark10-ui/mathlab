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
  } else {
    // Se não houver modal, redirecionar diretamente
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
  }
}

/**
* confirmarLogout - Executa o logout e redireciona para a página de login
*/
export async function confirmarLogout() {
  try {
    if (window.auth) {
      await window.auth.signOut();
    }
  } catch (error) {
    console.error('Erro no logout do Firebase:', error);
  }

  // Opcional: limpar localStorage se ainda estiver usando
  localStorage.removeItem('mathlab_user');
  localStorage.removeItem('mathlab_settings');

  fecharModal();
  // Redirecionar para login (funciona da raiz ou das pages de forma inteligente)
  const path = window.location.pathname;
  let target = './pages/login.html';
  if (path.includes('/pages/admin/')) target = '../login.html';
  else if (path.includes('/pages/')) target = 'login.html';
  window.location.href = target;
}

// ============================================
// LISTENER GLOBAL PARA TECLA ESC
// ============================================

/**
* Inicializa o listener para fechar o modal com a tecla ESC
* Esta função deve ser chamada apenas uma vez, por isso está fora das exportações
*/
function initEscapeListener() {
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      fecharModal();
    }
  });
}

// Inicializar o listener quando o módulo for carregado
initEscapeListener();

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.mostrarModalLogout = mostrarModalLogout;
window.fecharModal = fecharModal;
window.confirmarLogout = confirmarLogout;