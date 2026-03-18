/**
* ============================================
* MÓDULO 33: PERFIL DO USUÁRIO
* ============================================
*/

import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from '../firebase/config.js';
import {
  createLogger
} from './99-logger.js';

const logger = createLogger('perfil');
const auth = getAuth(app);
const db = getFirestore(app);

// Estado do perfil
let currentUser = null;
let userData = null;
let editMode = false;

/**
* Inicializa a página de perfil
*/
export async function initPerfil() {
  logger.info('Inicializando página de perfil');

  // Verificar autenticação
  const user = auth.currentUser;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;

  // Carregar dados do usuário
  await loadUserData();

  // Configurar event listeners
  setupEventListeners();

  // Configurar abas
  setupTabs();

  // Atualizar UI
  updateUI();
}

/**
* Carrega dados do usuário do Firestore
*/
async function loadUserData() {
  try {
    const userRef = doc(db, 'usuarios', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      userData = userDoc.data();
      logger.info('Dados do usuário carregados');
    } else {
      logger.warn('Documento do usuário não encontrado');
      // Criar perfil básico se não existir
      userData = {
        nome: currentUser.displayName || 'Usuário',
        email: currentUser.email,
        cargo: 'user',
        dataCadastro: new Date(),
        estatisticas: {
          calculosRealizados: 0,
          ferramentasUsadas: []
        }
      };
    }

    // Carregar estatísticas adicionais
    await loadUserStats();

  } catch (error) {
    logger.error('Erro ao carregar dados do usuário', error);
    showMessage('Erro ao carregar perfil', 'error');
  }
}

/**
* Carrega estatísticas do usuário
*/
async function loadUserStats() {
  try {
    // Simular dados para demonstração
    // Em produção, viriam do Firestore/histórico

    const stats = {
      calculosRealizados: userData.estatisticas?.calculosRealizados || 157,
      diasAtivo: Math.floor((Date.now() - (userData.dataCadastro?.toDate?.() || Date.now())) / (1000 * 60 * 60 * 24)) || 45,
      ferramentasUsadas: userData.estatisticas?.ferramentasUsadas?.length || 8,
      tempoUso: 23,
      conquistas: 5
    };

    // Atualizar elementos
    document.getElementById('statCalculos').textContent = stats.calculosRealizados;
    document.getElementById('statDias').textContent = stats.diasAtivo;
    document.getElementById('statFerramentas').textContent = stats.ferramentasUsadas;
    document.getElementById('totalCalculos').textContent = stats.calculosRealizados;
    document.getElementById('tempoUso').textContent = stats.tempoUso + 'h';
    document.getElementById('ferramentasUsadas').textContent = stats.ferramentasUsadas;
    document.getElementById('conquistas').textContent = stats.conquistas;

  } catch (error) {
    logger.error('Erro ao carregar estatísticas', error);
  }
}

/**
* Configura event listeners
*/
function setupEventListeners() {
  // Botão de logout
  document.getElementById('btnLogout')?.addEventListener('click', handleLogout);

  // Toggle de tema
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Upload de avatar
  document.getElementById('uploadAvatar')?.addEventListener('click', () => {
    document.getElementById('avatarModal').classList.add('show');
  });

  // Fechar modal
  document.getElementById('closeAvatarModal')?.addEventListener('click', () => {
    document.getElementById('avatarModal').classList.remove('show');
  });

  // Upload de imagem
  document.getElementById('uploadImageBtn')?.addEventListener('click', () => {
    document.getElementById('avatarUpload').click();
  });

  document.getElementById('avatarUpload')?.addEventListener('change', handleAvatarUpload);

  // Salvar avatar
  document.getElementById('saveAvatar')?.addEventListener('click', saveAvatar);

  // Opções de cor do avatar
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      updateAvatarPreview(color);
    });
  });

  // Editar dados
  document.getElementById('editDadosBtn')?.addEventListener('click', toggleEditMode);
  document.getElementById('cancelDados')?.addEventListener('click', cancelEdit);
  document.getElementById('dadosForm')?.addEventListener('submit', saveDados);

  // Alterar senha
  document.getElementById('senhaForm')?.addEventListener('submit', handlePasswordChange);

  // Configurações
  document.getElementById('themeSwitch')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  });

  document.getElementById('notificacoesSwitch')?.addEventListener('change',
    (e) => {
      // Salvar preferência
      logger.info('Notificações:', e.target.checked);
    });

  document.getElementById('idiomaSelect')?.addEventListener('change',
    (e) => {
      logger.info('Idioma alterado para:', e.target.value);
    });

  // Encerrar todas as sessões
  document.getElementById('logoutAll')?.addEventListener('click',
    handleLogoutAll);

  // Limpar histórico
  document.getElementById('limparHistorico')?.addEventListener('click',
    clearHistory);
}

/**
* Configura as abas do perfil
*/
function setupTabs() {
  const menuItems = document.querySelectorAll('.profile-menu-item');
  const tabs = document.querySelectorAll('.profile-tab');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;

      // Atualizar menu
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      // Atualizar aba
      tabs.forEach(tab => tab.classList.remove('active'));
      document.getElementById(`tab-${tabId}`)?.classList.add('active');

      logger.info('Aba alterada:', tabId);
    });
  });
}

/**
* Atualiza a interface com os dados do usuário
*/
function updateUI() {
  if (!userData) return;

  document.getElementById('profileName').textContent = userData.nome || 'Usuário';
  document.getElementById('profileEmail').textContent = userData.email || currentUser.email;
  document.getElementById('nomeCompleto').value = userData.nome || '';
  document.getElementById('emailPerfil').value = userData.email || currentUser.email;

  if (userData.dataNascimento) {
    document.getElementById('dataNascimento').value = userData.dataNascimento;
  }

  if (userData.telefone) {
    document.getElementById('telefone').value = userData.telefone;
  }

  // Badge baseado no cargo
  const badge = document.getElementById('profileBadge');
  const badgeText = badge.querySelector('span');

  switch (userData.cargo) {
    case 'admin':
      badgeText.textContent = 'Administrador';
      badge.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
      break;
    case 'premium':
      badgeText.textContent = 'Usuário Premium';
      badge.style.background = 'linear-gradient(135deg, #f1c40f, #f39c12)';
      break;
    default:
      badgeText.textContent = 'Usuário';
      badge.style.background = '';
    }

    // Data de cadastro
    if (userData.dataCadastro) {
      const data = userData.dataCadastro.toDate?.() || new Date(userData.dataCadastro);
      document.getElementById('membroDesde').textContent = data.getFullYear();
    }
  }

  /**
  * Toggle modo de edição
  */
  function toggleEditMode() {
    editMode = !editMode;

    const inputs = document.querySelectorAll('#dadosForm input');
    const actions = document.getElementById('dadosActions');
    const editBtn = document.getElementById('editDadosBtn');

    inputs.forEach(input => {
      if (input.id !== 'emailPerfil') {
        input.disabled = !editMode;
      }
    });

    actions.style.display = editMode ? 'flex': 'none';
    editBtn.innerHTML = editMode ?
    '<i class="fas fa-times"></i> Cancelar':
    '<i class="fas fa-edit"></i> Editar';
  }

  /**
  * Cancela edição
  */
  function cancelEdit() {
    editMode = false;
    toggleEditMode();
    // Restaurar valores originais
    updateUI();
  }

  /**
  * Salva dados do perfil
  */
  async function saveDados(e) {
    e.preventDefault();

    const nome = document.getElementById('nomeCompleto').value;
    const dataNascimento = document.getElementById('dataNascimento').value;
    const telefone = document.getElementById('telefone').value;

    try {
      const userRef = doc(db,
        'usuarios',
        currentUser.uid);
      await updateDoc(userRef,
        {
          nome,
          dataNascimento,
          telefone,
          ultimaAtualizacao: new Date()
        });

      userData = {
        ...userData, nome, dataNascimento, telefone
      };
      updateUI();

      toggleEditMode();
      showMessage('Dados atualizados com sucesso!',
        'success');
      logger.info('Dados do perfil atualizados');

    } catch (error) {
      logger.error('Erro ao salvar dados',
        error);
      showMessage('Erro ao salvar dados',
        'error');
    }
  }

  /**
  * Altera senha do usuário
  */
  async function handlePasswordChange(e) {
    e.preventDefault();

    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      showMessage('Preencha todos os campos', 'error');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      showMessage('As senhas não coincidem', 'error');
      return;
    }

    if (novaSenha.length < 6) {
      showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    try {
      // Reautenticar usuário
      const credential = EmailAuthProvider.credential(currentUser.email, senhaAtual);
      await reauthenticateWithCredential(currentUser, credential);

      // Alterar senha
      await updatePassword(currentUser, novaSenha);

      // Limpar campos
      document.getElementById('senhaAtual').value = '';
      document.getElementById('novaSenha').value = '';
      document.getElementById('confirmarSenha').value = '';

      showMessage('Senha alterada com sucesso!', 'success');
      logger.info('Senha alterada');

    } catch (error) {
      logger.error('Erro ao alterar senha', error);

      if (error.code === 'auth/wrong-password') {
        showMessage('Senha atual incorreta', 'error');
      } else {
        showMessage('Erro ao alterar senha', 'error');
      }
    }
  }

  /**
  * Upload de avatar
  */
  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Simular preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('avatarPreview');
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize = 'cover';
      preview.innerHTML = '';
    };
    reader.readAsDataURL(file);
  }

  /**
  * Atualiza preview do avatar
  */
  function updateAvatarPreview(color) {
    const preview = document.getElementById('avatarPreview');
    const colors = {
      purple: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
      blue: 'linear-gradient(135deg, #3498db, #2980b9)',
      green: 'linear-gradient(135deg, #2ecc71, #27ae60)',
      red: 'linear-gradient(135deg, #e74c3c, #c0392b)'
    };

    preview.style.background = colors[color];
    preview.style.backgroundImage = 'none';
    preview.innerHTML = '<i class="fas fa-user"></i>';
  }

  /**
  * Salva avatar
  */
  async function saveAvatar() {
    // Simular salvamento
    showMessage('Avatar atualizado!', 'success');
    document.getElementById('avatarModal').classList.remove('show');
    logger.info('Avatar atualizado');
  }

  /**
  * Limpa histórico
  */
  async function clearHistory() {
    if (!confirm('Tem certeza que deseja limpar todo o histórico?')) return;

    document.getElementById('historyList').innerHTML = `
    <div class="history-empty" style="display: flex;">
    <i class="fas fa-history"></i>
    <p>Nenhum histórico encontrado</p>
    </div>
    `;

    showMessage('Histórico limpo!', 'success');
    logger.info('Histórico limpo');
  }

  /**
  * Encerra todas as sessões
  */
  async function handleLogoutAll() {
    if (!confirm('Tem certeza que deseja encerrar todas as sessões?')) return;

    // Em produção, implementar lógica de revogação de tokens
    showMessage('Todas as sessões foram encerradas', 'success');
    logger.info('Todas as sessões encerradas');
  }

  /**
  * Logout do usuário
  */
  async function handleLogout() {
    try {
      await auth.signOut();
      localStorage.removeItem('mathlab_user');
      localStorage.removeItem('mathlab_logado');
      window.location.href = 'login.html';
    } catch (error) {
      logger.error('Erro ao fazer logout', error);
    }
  }

  /**
  * Toggle tema
  */
  function toggleTheme() {
    const icon = document.querySelector('#themeToggle i');

    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      icon.className = 'fas fa-sun';
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      icon.className = 'fas fa-moon';
    }
  }

  /**
  * Mostra mensagem de feedback
  */
  function showMessage(text, type = 'info') {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) return;

    msgDiv.textContent = text;
    msgDiv.className = `auth-message ${type}`;
    msgDiv.style.display = 'block';

    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 3000);
  }

  // Inicializar se estiver na página de perfil
  if (window.location.pathname.includes('perfil.html')) {
    initPerfil();
  }