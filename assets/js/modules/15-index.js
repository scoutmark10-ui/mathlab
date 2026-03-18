/**
 * MÓDULO 15: index.js - Funcionalidades específicas da página inicial
 * 
 * Este módulo gerencia:
 * - Sidebar (abrir/fechar)
 * - Estado de login (visitante vs usuário logado)
 * - Logout com Firebase
 * - Tema claro/escuro
 * - Calculadoras rápidas
 * - Interatividade da interface
 */

// ==================== ESTADO GLOBAL ====================
let usuarioLogado = false;
let usuarioNome = '';
let usuarioEmail = '';
let usuarioUid = '';

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se é o primeiro acesso (Welcome Page)
    const isWelcomePage = document.body.classList.contains('welcome-page') || window.location.pathname.includes('welcome.html');
    const welcomeSeen = localStorage.getItem('mathlab_welcome_seen');

    /* 
    if (!welcomeSeen && !isWelcomePage) {
        console.log('🚀 Redirecionando para Boas-vindas (Primeiro acesso)');
        window.location.href = './pages/welcome.html';
        return;
    }
    */

    // Carregar tema salvo
    carregarTema();

    // Carregar interface baseada no login
    carregarInterface();

    // Configurar sidebar
    configurarSidebar();

    // Configurar modal
    configurarModal();

    // Configurar dropdown para fechar ao clicar fora
    configurarDropdown();

    // Tecla ESC fecha modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') fecharModal();
    });

    // Observar mudanças no estado de autenticação (Modular)
    import('../firebase/auth.js').then(module => {
        module.observarUsuario((userState) => {
            if (userState.logado) {
                console.log('✅ Usuário identificado:', userState.nome);
                localStorage.setItem('mathlab_user', JSON.stringify({
                    uid: userState.uid,
                    nome: userState.nome,
                    email: userState.email,
                    logado: true
                }));
                localStorage.setItem('mathlab_logado', 'true');
            } else {
                localStorage.setItem('mathlab_logado', 'false');
            }
            carregarInterface();
        });
    }).catch(err => {
        console.error('❌ Erro ao carregar auth.js:', err);
    });
});

// ==================== CARREGAR TEMA ====================
function carregarTema() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

// ==================== CONFIGURAR SIDEBAR ====================
function configurarSidebar() {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu-item');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) fecharSidebar();
        });
    });
}

// ==================== CONFIGURAR MODAL ====================
function configurarModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) fecharModal();
        });
    }
}

// ==================== CONFIGURAR DROPDOWN ====================
function configurarDropdown() {
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (event) => {
        const dropdown = document.querySelector('.user-dropdown');
        const dropdownContent = document.querySelector('.dropdown-content');

        if (dropdown && dropdownContent && !dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Reabrir dropdown ao passar o mouse (opcional)
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        userDropdown.addEventListener('mouseenter', () => {
            const dropdownContent = document.querySelector('.dropdown-content');
            if (dropdownContent) {
                dropdownContent.style.display = 'block';
            }
        });
    }
}

// ==================== SIDEBAR ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function fecharSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

// ==================== PERFIL ====================
function irParaPerfil() {
    if (usuarioLogado) {
        window.location.href = './pages/perfil.html';
    } else {
        window.location.href = './pages/login.html';
    }
}

// ==================== LOGOUT ====================
function mostrarModalLogout() {
    if (!usuarioLogado) {
        window.location.href = './pages/login.html';
        return;
    }
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function fecharModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function confirmarLogout() {
    try {
        const { logoutUsuario } = await import('../firebase/auth.js');
        await logoutUsuario();
        console.log('✅ Logout modular realizado');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
    }

    // Limpar localStorage
    localStorage.removeItem('mathlab_user');
    localStorage.setItem('mathlab_logado', 'false');

    // Atualizar estado
    usuarioLogado = false;
    usuarioNome = '';
    usuarioEmail = '';
    usuarioUid = '';

    // Recarregar interface
    carregarInterface();

    // Fechar modal
    fecharModal();

    // Fechar dropdown se estiver aberto
    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.style.display = 'none';
    }

    alert('🔵 Você saiu da sua conta com sucesso!');
}

// ==================== TEMA RÁPIDO ====================
function mudarTemaRapido() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');

    // Fechar dropdown
    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.style.display = 'none';
        setTimeout(() => { dropdown.style.display = ''; }, 200);
    }
}

// ==================== CARREGAR INTERFACE ====================
function carregarInterface() {
    console.log('🔄 Carregando interface...');

    // Verificar localStorage
    const userData = localStorage.getItem('mathlab_user');
    const logado = localStorage.getItem('mathlab_logado') === 'true';

    if (userData && logado) {
        try {
            const user = JSON.parse(userData);
            usuarioLogado = true;
            usuarioNome = user.nome || 'Usuário';
            usuarioEmail = user.email || 'usuario@email.com';
            usuarioUid = user.uid || '';
            console.log('✅ Usuário logado:', usuarioNome, usuarioEmail);
        } catch (e) {
            console.error('❌ Erro ao parsear userData:', e);
            usuarioLogado = false;
        }
    } else {
        usuarioLogado = false;
        console.log('👤 Visitante');
    }

    // Elementos da interface
    const sidebarUserInfo = document.getElementById('sidebarUserInfo');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    const guestBanner = document.getElementById('guestBanner');
    const dropdownContent = document.getElementById('dropdownContent');

    if (!sidebarUserInfo) console.warn('⚠️ Elemento sidebarUserInfo não encontrado');
    if (!dropdownContent) console.warn('⚠️ Elemento dropdownContent não encontrado');

    if (usuarioLogado) {
        // ==================== USUÁRIO LOGADO ====================
        console.log('✅ Mostrando interface de usuário logado');

        // Sidebar user info
        if (sidebarUserInfo) {
            sidebarUserInfo.innerHTML = `
                <h4>${usuarioNome} <span class="guest-badge" style="background:#2ecc71;">✓</span></h4>
                <p>${usuarioEmail}</p>
            `;
        }

        // Sidebar avatar
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<i class="fas fa-user-check"></i>`;
        }

        // Sidebar logout button
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
            sidebarLogoutBtn.onclick = mostrarModalLogout;
        }

        // Guest banner (esconder)
        if (guestBanner) {
            guestBanner.style.display = 'none';
        }

        // Dropdown
        if (dropdownContent) {
            dropdownContent.innerHTML = `
                <a href="./pages/perfil.html"><i class="fas fa-user-circle"></i> Perfil</a>
                <a href="./pages/definicoes.html"><i class="fas fa-cog"></i> Definições</a>
                <button onclick="mudarTemaRapido()"><i class="fas fa-palette"></i> Tema Rápido</button>
                <button onclick="mostrarModalLogout()"><i class="fas fa-sign-out-alt"></i> Sair</button>
            `;
        }
    } else {
        // ==================== VISITANTE ====================
        console.log('👤 Mostrando interface de visitante');

        // Sidebar user info
        if (sidebarUserInfo) {
            sidebarUserInfo.innerHTML = `
                <h4>Visitante <span class="guest-badge">Visitante</span></h4>
                <p>Faça login para mais</p>
            `;
        }

        // Sidebar avatar
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        }

        // Sidebar logout button (vira Entrar)
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            sidebarLogoutBtn.onclick = () => window.location.href = './pages/login.html';
        }

        // Guest banner (mostrar)
        if (guestBanner) {
            guestBanner.style.display = 'flex';
        }

        // Dropdown
        if (dropdownContent) {
            dropdownContent.innerHTML = `
                <a href="./pages/login.html"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="./pages/welcome.html"><i class="fas fa-star"></i> Welcome</a>
                <button onclick="mudarTemaRapido()"><i class="fas fa-palette"></i> Tema Rápido</button>
                <a href="./pages/definicoes.html"><i class="fas fa-cog"></i> Definições</a>
            `;
        }
    }
}

// ==================== FUNÇÕES DA CALCULADORA RÁPIDA ====================
function calcularQuickBhaskara() {
    const a = parseFloat(document.getElementById('quick-a')?.value);
    const b = parseFloat(document.getElementById('quick-b')?.value);
    const c = parseFloat(document.getElementById('quick-c')?.value);
    const resultDiv = document.getElementById('quick-bhaskara-result');

    if (!resultDiv) return;

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
        resultDiv.innerHTML = '❌ Preencha todos os campos!';
        return;
    }

    if (a === 0) {
        resultDiv.innerHTML = '❌ a não pode ser zero!';
        return;
    }

    const delta = b * b - 4 * a * c;

    if (delta < 0) {
        resultDiv.innerHTML = `Δ = ${delta.toFixed(2)} (sem raízes reais)`;
    } else if (delta === 0) {
        const x = -b / (2 * a);
        resultDiv.innerHTML = `Δ = 0 | x = ${x.toFixed(2)}`;
    } else {
        const x1 = (-b + Math.sqrt(delta)) / (2 * a);
        const x2 = (-b - Math.sqrt(delta)) / (2 * a);
        resultDiv.innerHTML = `Δ = ${delta.toFixed(2)} | x₁ = ${x1.toFixed(2)} | x₂ = ${x2.toFixed(2)}`;
    }
}

function calcularQuickPercent() {
    const value = parseFloat(document.getElementById('quick-value')?.value);
    const percent = parseFloat(document.getElementById('quick-percent')?.value);
    const resultDiv = document.getElementById('quick-percent-result');

    if (!resultDiv) return;

    if (isNaN(value) || isNaN(percent)) {
        resultDiv.innerHTML = '❌ Preencha todos os campos!';
        return;
    }

    const result = (value * percent) / 100;
    resultDiv.innerHTML = `${percent}% de ${value} = ${result.toFixed(2)}`;
}

// ==================== FUNÇÃO PARA TESTES ====================
function fazerLoginSimulado() {
    const userData = {
        uid: 'teste-123',
        nome: 'Usuário Teste',
        email: 'teste@email.com',
        logado: true
    };

    localStorage.setItem('mathlab_user', JSON.stringify(userData));
    localStorage.setItem('mathlab_logado', 'true');

    carregarInterface();
    console.log('✅ Login simulado realizado');
}

// ==================== EXPOR FUNÇÕES GLOBAIS ====================
window.toggleSidebar = toggleSidebar;
window.fecharSidebar = fecharSidebar;
window.irParaPerfil = irParaPerfil;
window.mostrarModalLogout = mostrarModalLogout;
window.fecharModal = fecharModal;
window.confirmarLogout = confirmarLogout;
window.mudarTemaRapido = mudarTemaRapido;
window.calcularQuickBhaskara = calcularQuickBhaskara;
window.calcularQuickPercent = calcularQuickPercent;
window.fazerLoginSimulado = fazerLoginSimulado;

console.log('📦 Módulo 15-index.js carregado com sucesso');
console.log('✅ Funções disponíveis:', Object.keys(window).filter(k => 
    ['toggleSidebar', 'calcularQuickBhaskara', 'mostrarModalLogout', 'irParaPerfil'].includes(k)
));