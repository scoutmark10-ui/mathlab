// ============================================
// MÓDULO 29: FUNÇÕES PARA PÁGINA DE CONTATO
// ============================================

// URL do Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzHitkzwLKkHnkBfsmQtRwsVjSvOWUhCUaaEMUNFupeVqjkpUdLicZETn6082c2rsfj/exec';

/**
 * copiarTexto - Copia texto para a área de transferência
 * @param {string} texto - Texto a ser copiado
 */
export function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(function() {
        mostrarFeedback('✅ Copiado para a área de transferência!', 'success', 2000);
    }, function() {
        mostrarFeedback('❌ Erro ao copiar. Tente novamente.', 'error', 2000);
    });
}

/**
 * mostrarFeedback - Exibe mensagem de feedback
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo de mensagem ('success', 'error', 'info')
 * @param {number} tempo - Tempo em ms para exibir
 */
function mostrarFeedback(mensagem, tipo, tempo = 3000) {
    const feedbackDiv = document.getElementById('feedbackMessage');
    if (!feedbackDiv) return;
    
    feedbackDiv.className = `feedback-message ${tipo}`;
    feedbackDiv.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${mensagem}`;

    setTimeout(() => {
        feedbackDiv.style.display = 'none';
        feedbackDiv.className = 'feedback-message';
    }, tempo);
}

/**
 * enviarFeedback - Envia o formulário de contato
 * @param {Event} event - Evento de submit
 */
export async function enviarFeedback(event) {
    event.preventDefault();

    const nome = document.getElementById('nome')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const assunto = document.getElementById('assunto')?.value;
    const mensagem = document.getElementById('mensagem')?.value.trim();
    const submitBtn = document.getElementById('submitBtn');
    const feedbackDiv = document.getElementById('feedbackMessage');

    if (!submitBtn || !feedbackDiv) return;

    // Validações
    if (!nome || !email || !assunto || !mensagem) {
        mostrarFeedback('❌ Preencha todos os campos!', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        mostrarFeedback('❌ Email inválido!', 'error');
        return;
    }

    if (mensagem.length < 10) {
        mostrarFeedback('❌ Mensagem muito curta (mínimo 10 caracteres)', 'error');
        return;
    }

    // Desabilitar botão
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        // Enviar para o Google Apps Script
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                assunto: assunto,
                mensagem: mensagem,
                data: new Date().toLocaleString('pt-BR')
            })
        });

        // Feedback de sucesso
        mostrarFeedback('✅ Mensagem enviada com sucesso! Responderemos em breve.', 'success');

        // Limpar formulário
        document.getElementById('feedbackForm')?.reset();

        console.log('📧 Mensagem enviada com sucesso');

    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        mostrarFeedback('❌ Erro ao enviar. Tente novamente.', 'error');
    } finally {
        // Reabilitar botão
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensagem';
    }
}

/**
 * initContato - Inicializa a página de contato
 */
export function initContato() {
    console.log('📧 Página de contato inicializada');
    
    // Adicionar listener para o formulário
    const form = document.getElementById('feedbackForm');
    if (form) {
        form.addEventListener('submit', enviarFeedback);
    }
}

// Inicializar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContato);
} else {
    initContato();
}

// Exportar funções para o escopo global (necessário para onclick)
window.copiarTexto = copiarTexto;
window.enviarFeedback = enviarFeedback;

console.log('📦 Módulo de contato carregado');