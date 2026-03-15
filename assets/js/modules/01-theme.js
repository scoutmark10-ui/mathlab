// ============================================
// MÓDULO 01: SISTEMA DE TEMA E CONFIGURAÇÕES (MODULAR)
// ============================================
//
// 🎨 FUNCIONALIDADES PRINCIPAIS:
// =================================
// - Alternância entre tema claro/escuro
// - Personalização de cores de destaque
// - Persistência de configurações no localStorage
// - Carregamento automático de preferências
// - Interface responsiva a mudanças de tema
//
// 📦 DEPENDÊNCIAS:
// ====================
// - 00-utils.js (funções utilitárias de cor)
// - Variáveis CSS definidas em 01-variables.css
//
// 🔧 MÉTODOS EXPORTADOS:
// =========================
// - toggleTheme(): Alterna tema claro/escuro
// - loadTheme(): Carrega tema salvo
// - carregarConfiguracoes(): Carrega todas as configurações
// - salvarConfiguracoes(): Salva configurações atuais
// - aplicarCorDestaque(): Aplica cor personalizada
// - resetarConfiguracoes(): Restaura padrões
// - atualizarCamposConfiguracoes(): Atualiza UI com valores salvos
// - carregarSettingsDoStorage(): Carrega do localStorage
//
// 💾 ARMAZENAMENTO:
// ==================
// - localStorage chave: 'mathlab_settings'
// - Formato: JSON com todas as configurações
// - Fallback para valores padrão quando não há salvos
//
// 🎯 INTEGRAÇÃO:
// ================
// - Usado por: pages/definicoes.html
// - Importado por: assets/js/script.js (módulo principal)
// - Interage com: CSS variables dinâmicas
//

import {
  hexToRgb,
  escurecerCorHSL
} from './00-utils.js';

// ============================================
// FUNÇÕES DE TEMA
// ============================================
//
// 🌓 toggleTheme - Alterna entre modo claro e escuro
// ==============================================
// Funcionalidade principal de alternância de tema
// Atualiza: body class, localStorage, ícones e UI
//
// 📝 loadTheme - Carrega tema salvo (versão simples)
// =====================================================
// Compatibilidade com versões antigas do sistema
// Prioriza configuração salva sobre tema padrão
//

/**
* toggleTheme - Alterna entre modo claro e escuro
*/
export function toggleTheme() {
  document.body.classList.toggle('light-mode');

  // Salvar preferência
  const settings = carregarSettingsDoStorage() || {};
  settings.theme = document.body.classList.contains('light-mode') ? 'light': 'dark';
  localStorage.setItem('mathlab_settings', JSON.stringify(settings));

  // Atualizar ícone do toggle se existir
  const icon = document.querySelector('.theme-toggle i');
  if (icon) {
    icon.className = document.body.classList.contains('light-mode') ? 'fas fa-sun': 'fas fa-moon';
  }

  // Atualizar toggle checkbox se existir
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = document.body.classList.contains('light-mode');
  }
}

/**
* loadTheme - Carrega tema salvo (versão simples para compatibilidade)
*/
export function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = 'fas fa-sun';
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
//
// 💾 carregarSettingsDoStorage - Carrega configurações do localStorage
// ==================================================================
// - Retorna objeto parseado ou null se não existir
// - Trata erros de parsing de forma segura
// - Formato esperado: { theme, accentColor, notifications, ... }
//
// ⚙️ salvarConfiguracoes - Salva configurações (usada na página de definições)
// ==========================================================================
// - Coleta valores atuais dos elementos DOM
// - Salva em localStorage como JSON
// - Aplica alterações visuais imediatamente
// - Mostra feedback visual de sucesso
//
// 🔄 carregarConfiguracoes - Carrega configurações do localStorage e aplica
// ========================================================================
// - Carrega configurações salvas na inicialização
// - Aplica tema, cores e atualiza UI
// - Trata erros de forma segura com try/catch
//
// 🎨 aplicarCorDestaque - Aplica cor de destaque nas variáveis CSS
// ==============================================================================
// - Atualiza CSS custom properties dinamicamente
// - Calcula cores secundárias automaticamente
// - Aplica efeitos visuais (glow, borders)
// - Suporta qualquer formato de cor hexadecimal
//
// 🔄 resetarConfiguracoes - Restaura configurações padrão
// ======================================================
// - Confirmação com usuário antes de resetar
// - Limpa localStorage completamente
// - Restaura todos os valores para padrão de fábrica
// - Atualiza interface completa
//
// 📱 atualizarCamposConfiguracoes - Atualiza campos da página de definições
// ========================================================================
// - Sincroniza valores do localStorage com elementos DOM
// - Atualiza todos os inputs e selects da página
// - Usa optional chaining (?.) para segurança
//

/**
* carregarSettingsDoStorage - Carrega configurações do localStorage
*/
export function carregarSettingsDoStorage() {
  const saved = localStorage.getItem('mathlab_settings');
  return saved ? JSON.parse(saved): null;
}

/**
* salvarConfiguracoes - Salva configurações (usada na página de definições)
*/
export function salvarConfiguracoes() {
  const settings = {
    theme: document.getElementById('themeToggle')?.checked ? 'light': 'dark',
    accentColor: document.getElementById('accentColor')?.value || '#9b59b6',
    notifications: document.getElementById('notifications')?.checked ?? true,
    notificationSound: document.getElementById('notificationSound')?.checked ?? false,
    language: document.getElementById('language')?.value || 'pt',
    saveHistory: document.getElementById('saveHistory')?.checked ?? true,
    shareData: document.getElementById('shareData')?.checked ?? false
  };

  localStorage.setItem('mathlab_settings', JSON.stringify(settings));
  aplicarCorDestaque(settings.accentColor);

  // Mostrar mensagem de sucesso
  const msg = document.getElementById('saveMessage');
  if (msg) {
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);
  }
}

/**
* carregarConfiguracoes - Carrega configurações do localStorage e aplica
*/
export function carregarConfiguracoes() {
  const settings = carregarSettingsDoStorage();
  if (!settings) return;

  try {
    // Aplicar tema
    if (settings.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }

    // Atualizar toggle de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.checked = settings.theme === 'light';
    }

    // Aplicar cor de destaque
    if (settings.accentColor) {
      aplicarCorDestaque(settings.accentColor);
    }

    // Atualizar campos da página de definições
    atualizarCamposConfiguracoes(settings);

  } catch (e) {
    console.warn('Erro ao carregar configurações:', e);
  }
}

/**
* atualizarCamposConfiguracoes - Atualiza campos da página de definições
* @param {Object} settings - Configurações carregadas
*/
export function atualizarCamposConfiguracoes(settings) {
  // Cor de destaque
  const accentSelect = document.getElementById('accentColor');
  if (accentSelect && settings.accentColor) {
    accentSelect.value = settings.accentColor;
  }

  // Notificações
  const notifications = document.getElementById('notifications');
  if (notifications) {
    notifications.checked = settings.notifications ?? true;
  }

  // Som de notificação
  const notificationSound = document.getElementById('notificationSound');
  if (notificationSound) {
    notificationSound.checked = settings.notificationSound ?? false;
  }

  // Idioma
  const language = document.getElementById('language');
  if (language) {
    language.value = settings.language || 'pt';
  }

  // Histórico
  const saveHistory = document.getElementById('saveHistory');
  if (saveHistory) {
    saveHistory.checked = settings.saveHistory ?? true;
  }

  // Compartilhamento de dados
  const shareData = document.getElementById('shareData');
  if (shareData) {
    shareData.checked = settings.shareData ?? false;
  }
}

/**
* aplicarCorDestaque - Aplica cor de destaque nas variáveis CSS
* @param {string} cor - Cor em formato hexadecimal
*/
export function aplicarCorDestaque(cor) {
  const DEFAULT_PRIMARY = '#9b59b6';
  const DEFAULT_SECONDARY = '#8e44ad';
  const DEFAULT_RGB = '155, 89, 182';

  if (cor === DEFAULT_PRIMARY) {
    document.documentElement.style.setProperty('--accent-primary', DEFAULT_PRIMARY);
    document.documentElement.style.setProperty('--accent-secondary', DEFAULT_SECONDARY);
    document.documentElement.style.setProperty('--border-color', `rgba(${DEFAULT_RGB}, 0.2)`);
    document.documentElement.style.setProperty('--accent-glow', `0 0 15px ${DEFAULT_PRIMARY}80`);
  } else {
    const secundaria = escurecerCorHSL(cor, 20);
    const rgb = hexToRgb(cor);
    document.documentElement.style.setProperty('--accent-primary', cor);
    document.documentElement.style.setProperty('--accent-secondary', secundaria);
    document.documentElement.style.setProperty('--border-color', `rgba(${rgb}, 0.2)`);
    document.documentElement.style.setProperty('--accent-glow', `0 0 15px ${cor}80`);
  }
}

/**
* resetarConfiguracoes - Restaura configurações padrão
*/
export function resetarConfiguracoes() {
  if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
    localStorage.removeItem('mathlab_settings');

    // Resetar para valores padrão
    document.body.classList.remove('light-mode');

    const accentSelect = document.getElementById('accentColor');
    if (accentSelect) {
      accentSelect.value = '#9b59b6';
      aplicarCorDestaque('#9b59b6');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.checked = false;
    }

    // Resetar outros campos
    const notifications = document.getElementById('notifications');
    if (notifications) notifications.checked = true;

    const notificationSound = document.getElementById('notificationSound');
    if (notificationSound) notificationSound.checked = false;

    const language = document.getElementById('language');
    if (language) language.value = 'pt';

    const saveHistory = document.getElementById('saveHistory');
    if (saveHistory) saveHistory.checked = true;

    const shareData = document.getElementById('shareData');
    if (shareData) shareData.checked = false;

    // Mostrar mensagem
    const msg = document.getElementById('resetMessage');
    if (msg) {
      msg.classList.add('show');
      setTimeout(() => msg.classList.remove('show'), 3000);
    }
  }
}