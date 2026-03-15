/**
 * ============================================
 * MÓDULO 21: GESTÃO DE MENSAGENS ADMIN (MODULAR)
 * ============================================
 */

import { getAdminSecrets } from './20-admin-core.js';

let mensagens = [];
let mensagemSelecionada = null;
let SCRIPT_CONFIG = null;

/**
 * inicializarMensagens - Ponto de entrada para a página de mensagens
 */
async function inicializarMensagens() {
    console.log('📬 Módulo de Mensagens inicializado');

    // Aguardar autorização do admin antes de carregar
    document.addEventListener('adminAuthorized', async () => {
        const secrets = await getAdminSecrets();

        // Fallback se não encontrar no Firestore (para fins de desenvolvimento)
        SCRIPT_CONFIG = secrets || {
            url: 'https://script.google.com/macros/s/AKfycbzHitkzwLKkHnkBfsmQtRwsVjSvOWUhCUaaEMUNFupeVqjkpUdLicZETn6082c2rsfj/exec',
            senha: 'mathlab2026'
        };

        carregarMensagens();
    });

    // Vincular eventos globais necessários para botões dinâmicos
    window.carregarMensagens = carregarMensagens;
    window.fecharModal = fecharModal;
    window.abrirMensagem = abrirMensagem;
    window.enviarResposta = enviarResposta;

    // Preview em tempo real
    const txtArea = document.getElementById('respostaTexto');
    if (txtArea) {
        txtArea.addEventListener('input', atualizarPreview);
    }
}

/**
 * carregarMensagens - Busca mensagens da planilha via Apps Script
 */
async function carregarMensagens() {
    if (!SCRIPT_CONFIG) return;

    const listaDiv = document.getElementById('mensagensLista');
    const btnAtualizar = document.getElementById('btnAtualizar');

    try {
        listaDiv.innerHTML = `
            <div class="loading-spinner center group-spacing">
                <i class="fas fa-spinner fa-spin fa-2x color-accent"></i>
                <p class="group-spacing">Sincronizando com a nuvem...</p>
            </div>
        `;

        if (btnAtualizar) {
            btnAtualizar.disabled = true;
            btnAtualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
        }

        const response = await fetch(`${SCRIPT_CONFIG.url}?acao=listar&senha=${SCRIPT_CONFIG.senha}`);
        const dados = await response.json();

        if (dados.error) throw new Error(dados.error);

        mensagens = dados;
        renderizarMensagens();

    } catch (erro) {
        console.error('❌ ERRO AO CARREGAR:', erro);
        listaDiv.innerHTML = `
            <div class="error-card group-spacing">
                <i class="fas fa-wifi-slash fa-2x"></i>
                <p>Falha na conexão com o banco de dados.</p>
                <button class="btn btn-secondary btn-small" onclick="carregarMensagens()">Tentar Reconectar</button>
            </div>
        `;
    } finally {
        if (btnAtualizar) {
            btnAtualizar.disabled = false;
            btnAtualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
        }
    }
}

/**
 * renderizarMensagens - Cria os cards de mensagem no DOM
 */
function renderizarMensagens() {
    const lista = document.getElementById('mensagensLista');
    if (!lista) return;

    if (!mensagens || mensagens.length === 0) {
        lista.innerHTML = `
            <div class="empty-state center group-spacing">
                <i class="fas fa-inbox fa-3x color-secondary"></i>
                <p>Caixa de entrada vazia</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = mensagens.map(msg => {
        const data = new Date(msg.data).toLocaleString('pt-BR');
        const isNew = msg.status === 'NÃO RESPONDIDA';

        return `
            <div class="mensagem-item ${isNew ? 'nao-respondida' : ''}" onclick="abrirMensagem(${msg.id})">
                <div class="mensagem-header">
                    <span class="mensagem-nome">
                        <i class="fas fa-user-circle"></i> ${msg.nome}
                        <span class="status-badge ${isNew ? 'status-nao-respondida' : 'status-respondida'}">
                            ${isNew ? 'NOVA' : 'RESPONDIDA'}
                        </span>
                    </span>
                    <span class="mensagem-data">
                        <i class="far fa-calendar-alt"></i> ${data}
                    </span>
                </div>
                <div class="mensagem-assunto">
                    <strong>Assunto:</strong> ${msg.assunto}
                </div>
                <div class="mensagem-preview">
                    ${msg.mensagem.substring(0, 120)}${msg.mensagem.length > 120 ? '...' : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * abrirMensagem - Prepara o modal com os dados da mensagem
 */
function abrirMensagem(id) {
    mensagemSelecionada = mensagens.find(m => m.id == id);
    if (!mensagemSelecionada) return;

    const modal = document.getElementById('respostaModal');
    const modalOriginal = document.getElementById('modalMensagemOriginal');

    if (modal) modal.classList.add('active');

    if (modalOriginal) {
        modalOriginal.innerHTML = `
            <div class="msg-meta">
                <p><strong>De:</strong> ${mensagemSelecionada.nome} (${mensagemSelecionada.email})</p>
                <p><strong>Assunto:</strong> ${mensagemSelecionada.assunto}</p>
            </div>
            <div class="msg-body-text">
                ${mensagemSelecionada.mensagem.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    document.getElementById('respostaTexto').value = mensagemSelecionada.resposta || '';
    atualizarPreview();
}

/**
 * enviarResposta - Envia a resposta de volta ao App Script
 */
async function enviarResposta() {
    const resposta = document.getElementById('respostaTexto').value.trim();
    const btnEnviar = document.getElementById('btnEnviarResposta');

    if (!resposta) return;
    if (!mensagemSelecionada) return;

    try {
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Despachando...';

        // Melhorado: usando encodeURIComponent para evitar bugs com caracteres especiais
        const query = `acao=responder&senha=${SCRIPT_CONFIG.senha}&id=${mensagemSelecionada.id}&resposta=${encodeURIComponent(resposta)}`;
        const response = await fetch(`${SCRIPT_CONFIG.url}?${query}`);
        const resultado = await response.json();

        if (resultado.success) {
            fecharModal();
            carregarMensagens();
            // Feedback visual de sucesso (pode usar o módulo utils se disponível)
        } else {
            throw new Error('Falha no processamento');
        }

    } catch (erro) {
        console.error('❌ ERRO AO ENVIAR:', erro);
        alert('Falha ao enviar resposta. Verifique sua conexão.');
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Agora';
    }
}

/**
 * atualizarPreview - Gera a visualização do email formatado
 */
function atualizarPreview() {
    const texto = document.getElementById('respostaTexto').value || '...';
    const preview = document.getElementById('previewEmail');
    if (!preview) return;

    preview.innerHTML = `
        <div class="email-layout">
            <div class="email-header-preview">Suporte MathLab</div>
            <p>Olá ${mensagemSelecionada?.nome || 'Usuário'},</p>
            <p>${texto.replace(/\n/g, '<br>')}</p>
            <div class="email-footer-preview">
                Atenciosamente,<br>
                <strong>Zinko Dev</strong> - MathLab Admin
            </div>
        </div>
    `;
}

/**
 * fecharModal - Limpa e esconde o modal
 */
function fecharModal() {
    const modal = document.getElementById('respostaModal');
    if (modal) modal.classList.remove('active');
    mensagemSelecionada = null;
}

// Auto-inicializar
document.addEventListener('DOMContentLoaded', inicializarMensagens);
