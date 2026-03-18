/**
 * ============================================
 * MÓDULO 20: ADMIN CORE - SEGURANÇA E AUTH
 * ============================================
 */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from '../firebase/config.js';

const auth = getAuth(app);
const db = getFirestore(app);

let timeoutInatividade;
let verificacaoTimeout;

/**
 * resetInatividade - Reseta o timer de inatividade
 */
function resetInatividade() {
    clearTimeout(timeoutInatividade);
    timeoutInatividade = setTimeout(() => {
        console.log('⏰ ADMIN CORE - Inatividade detectada. Redirecionando para login.');
        window.location.href = '../../pages/login.html';
    }, 30 * 60 * 1000); // 30 minutos
}

/**
 * inicializarSegurancaAdmin - Protege a página administrativa
 */
export function inicializarSegurancaAdmin() {
    // Mostrar loading enquanto verifica
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'admin-loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Verificando credenciais de administrador...</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Timeout de segurança
    verificacaoTimeout = setTimeout(() => {
        console.error('⏰ ADMIN CORE - Timeout na verificação de segurança');
        window.location.href = '../../pages/login.html';
    }, 5000);

    onAuthStateChanged(auth, async (user) => {
        clearTimeout(verificacaoTimeout);
        
        if (!user) {
            console.log('🚫 ADMIN CORE - Usuário não autenticado. Redirecionando...');
            window.location.href = '../../pages/login.html';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));

            if (!userDoc.exists() || userDoc.data().cargo !== 'admin') {
                console.log('🚫 ADMIN CORE - Acesso negado: Não é administrador.');
                alert('Acesso negado. Esta área é restrita a administradores.');
                window.location.href = '../../index.html';
                return;
            }

            // Remover loading
            loadingDiv.remove();

            // Se chegou aqui, é admin. Mostrar o conteúdo.
            console.log('✅ ADMIN CORE - Acesso autorizado para:', user.email);
            document.body.style.opacity = '1';

            // Carregar dados de configuração sensíveis
            window.adminReady = true;
            document.dispatchEvent(new CustomEvent('adminAuthorized', { 
                detail: { 
                    ...userDoc.data(),
                    uid: user.uid,
                    email: user.email
                } 
            }));

            // Inicializar Menu Toggle
            const menuToggle = document.getElementById('adminMenuToggle');
            const sidebar = document.getElementById('adminSidebar');

            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sidebar.classList.toggle('active');
                    resetInatividade();
                });

                // Fechar ao clicar fora
                document.addEventListener('click', (e) => {
                    if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
                        sidebar.classList.remove('active');
                    }
                    resetInatividade();
                });
            }

            // Configurar monitor de inatividade
            ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
                document.addEventListener(event, resetInatividade);
            });
            
            // Iniciar timer de inatividade
            resetInatividade();

        } catch (error) {
            console.error('❌ ADMIN CORE - Erro na verificação:', error);
            loadingDiv.remove();
            window.location.href = '../../index.html';
        }
    });
}

/**
 * getAdminSecrets - Busca chaves e URLs sensíveis do Firestore
 * @returns {Promise<Object|null>} Configurações secretas
 */
export async function getAdminSecrets() {
    try {
        const configDoc = await getDoc(doc(db, 'config', 'admin_secrets'));
        if (configDoc.exists()) {
            console.log('🔐 ADMIN CORE - Segredos carregados com sucesso');
            return configDoc.data();
        }
        console.warn('⚠️ ADMIN CORE - Nenhum segredo encontrado');
        return null;
    } catch (error) {
        console.error('❌ ADMIN CORE - Erro ao buscar segredos:', error);
        return null;
    }
}

/**
 * verificarSessaoAdmin - Verifica se a sessão atual é de admin
 * @returns {Promise<boolean>} True se for admin
 */
export async function verificarSessaoAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        return userDoc.exists() && userDoc.data().cargo === 'admin';
    } catch {
        return false;
    }
}

/**
 * fazerLogoutAdmin - Faz logout e redireciona
 */
export function fazerLogoutAdmin() {
    auth.signOut().then(() => {
        window.location.href = '../../pages/login.html';
    });
}

// Inicializar automaticamente se estiver em uma página admin (exceto no setup)
const isSetupPage = window.location.pathname.includes('setup.html');
if (window.location.pathname.includes('/admin/') && !isSetupPage) {
    // Adicionar estilos de loading dinamicamente
    const style = document.createElement('style');
    style.textContent = `
        .admin-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        
        .loading-spinner {
            text-align: center;
            color: var(--accent-primary);
        }
        
        .loading-spinner i {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .loading-spinner p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }
    `;
    document.head.appendChild(style);
    
    inicializarSegurancaAdmin();
}