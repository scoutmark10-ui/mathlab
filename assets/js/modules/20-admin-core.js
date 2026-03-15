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

/**
 * inicializarSegurancaAdmin - Protege a página administrativa
 */
export function inicializarSegurancaAdmin() {
    // Esconder conteúdo inicialmente para evitar "flicker" de acesso
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';

    onAuthStateChanged(auth, async (user) => {
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

            // Se chegou aqui, é admin. Mostrar o conteúdo.
            console.log('✅ ADMIN CORE - Acesso autorizado para:', user.email);
            document.body.style.opacity = '1';

            // Carregar dados de configuração sensíveis de forma "segura"
            window.adminReady = true;
            document.dispatchEvent(new CustomEvent('adminAuthorized', { detail: userDoc.data() }));

            // Inicializar Menu Toggle
            const menuToggle = document.getElementById('adminMenuToggle');
            const sidebar = document.getElementById('adminSidebar');

            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sidebar.classList.toggle('active');
                });

                // Fechar ao clicar fora
                document.addEventListener('click', (e) => {
                    if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
                        sidebar.classList.remove('active');
                    }
                });
            }

        } catch (error) {
            console.error('❌ ADMIN CORE - Erro na verificação:', error);
            window.location.href = '../../index.html';
        }
    });
}

/**
 * getAdminSecrets - Busca chaves e URLs sensíveis do Firestore
 * (Mais seguro que deixar hardcoded no HTML/JS)
 */
export async function getAdminSecrets() {
    try {
        const configDoc = await getDoc(doc(db, 'config', 'admin_secrets'));
        if (configDoc.exists()) {
            return configDoc.data();
        }
        return null;
    } catch (error) {
        console.error('❌ ADMIN CORE - Erro ao buscar segredos:', error);
        return null;
    }
}

// Inicializar automaticamente se estiver em uma página admin (exceto no setup)
const isSetupPage = window.location.pathname.includes('setup.html');
if (window.location.pathname.includes('/admin/') && !isSetupPage) {
    inicializarSegurancaAdmin();
}
