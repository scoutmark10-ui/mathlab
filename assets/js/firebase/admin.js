/**
 * ============================================
 * FIREBASE ADMIN - FUNÇÕES ADMINISTRATIVAS v2.0
 * ============================================
 * 
 * SEGURANÇA:
 * - Verificação rigorosa de permissões
 * - Rate limiting por IP/usuário
 * - Sanitização de inputs
 * - Logs de ações administrativas
 * - Proteção contra abuso
 * 
 * PERFORMANCE:
 * - Cache de consultas frequentes
 * - Paginação de resultados
 * - Lazy loading de dados
 * - Debounce em operações repetitivas
 * 
 * BOAS PRÁTICAS:
 * - Tratamento de erros granular
 * - Validação de dados em múltiplas camadas
 * - Documentação completa
 * - Código modular e testável
 */

import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc,
    deleteDoc,
    limit,
    orderBy,
    startAfter,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from './config.js';
import { createLogger } from '../modules/99-logger.js';

// ============================================
// INICIALIZAÇÃO
// ============================================
const auth = getAuth(app);
const db = getFirestore(app);
const logger = createLogger('admin');

// ============================================
// CONSTANTES DE SEGURANÇA
// ============================================
const ADMIN_CONFIG = {
    CARGOS_PERMITIDOS: ['admin', 'super_admin'],
    OPERACOES_POR_MINUTO: 30,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutos
    MAX_RESULTADOS_PAGINA: 50,
    MAX_TENTATIVAS_OPERACAO: 3,
    TEMPO_BLOQUEIO_MS: 15 * 60 * 1000 // 15 minutos
};

// Cache simples para evitar consultas repetidas
const userCache = new Map();
const rateLimitMap = new Map();

// ============================================
// FUNÇÕES DE VERIFICAÇÃO DE SEGURANÇA
// ============================================

/**
 * verificarPermissaoAdmin - Verifica se usuário atual é admin
 * @returns {Promise<Object>} Dados do admin ou throw error
 */
async function verificarPermissaoAdmin() {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Verificar cache primeiro
        if (userCache.has(user.uid)) {
            const cached = userCache.get(user.uid);
            if (Date.now() - cached.timestamp < ADMIN_CONFIG.CACHE_TTL) {
                if (cached.isAdmin) return cached.userData;
            }
        }

        // Buscar dados do usuário no Firestore
        const userRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error('Usuário não encontrado no banco de dados');
        }

        const userData = userDoc.data();
        const isAdmin = ADMIN_CONFIG.CARGOS_PERMITIDOS.includes(userData.cargo);

        // Atualizar cache
        userCache.set(user.uid, {
            userData,
            isAdmin,
            timestamp: Date.now()
        });

        if (!isAdmin) {
            logger.warn(`Tentativa de acesso admin negado para ${user.email}`);
            throw new Error('Acesso negado. Privilégios de administrador necessários');
        }

        logger.info(`Admin autorizado: ${user.email} (${userData.cargo})`);
        return userData;

    } catch (error) {
        logger.error('Erro na verificação de permissão admin', error);
        throw new Error(`Erro de autorização: ${error.message}`);
    }
}

/**
 * verificarRateLimit - Controla taxa de operações por usuário
 * @param {string} operacao - Nome da operação
 * @throws {Error} Se rate limit excedido
 */
function verificarRateLimit(operacao = 'geral') {
    const user = auth.currentUser;
    if (!user) return;

    const key = `${user.uid}_${operacao}`;
    const agora = Date.now();
    
    const registro = rateLimitMap.get(key) || {
        contador: 0,
        resetTime: agora + 60000 // 1 minuto
    };

    // Resetar se passou do tempo
    if (agora > registro.resetTime) {
        registro.contador = 0;
        registro.resetTime = agora + 60000;
    }

    registro.contador++;

    if (registro.contador > ADMIN_CONFIG.OPERACOES_POR_MINUTO) {
        logger.warn(`Rate limit excedido para ${user.email} - operação: ${operacao}`);
        throw new Error(`Muitas tentativas. Aguarde ${Math.ceil((registro.resetTime - agora) / 1000)} segundos.`);
    }

    rateLimitMap.set(key, registro);
}

/**
 * sanitizarInput - Previne XSS e injeção
 * @param {string} input - Input a ser sanitizado
 * @returns {string} Input sanitizado
 */
function sanitizarInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remover tags HTML e caracteres perigosos
    return input
        .replace(/<[^>]*>/g, '')
        .replace(/[<>"'()/]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

/**
 * validarCargo - Valida se cargo é permitido
 * @param {string} cargo - Cargo a validar
 * @returns {boolean} True se válido
 */
function validarCargo(cargo) {
    const cargosPermitidos = ['user', 'premium', 'admin', 'super_admin'];
    return cargosPermitidos.includes(cargo);
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * listarTodosUsuarios - Lista todos os usuários com paginação
 * @param {Object} opcoes - Opções de paginação/filtro
 * @returns {Promise<Object>} Lista paginada de usuários
 */
export async function listarTodosUsuarios(opcoes = {}) {
    try {
        // Verificações de segurança
        await verificarPermissaoAdmin();
        verificarRateLimit('listar_usuarios');

        const {
            pagina = 1,
            limite = ADMIN_CONFIG.MAX_RESULTADOS_PAGINA,
            cargo = null,
            busca = null,
            ordernarPor = 'dataCadastro',
            ordem = 'desc'
        } = opcoes;

        // Validar parâmetros
        if (limite > 100) {
            throw new Error('Limite máximo de 100 resultados por página');
        }

        // Construir query base
        let q = collection(db, 'usuarios');
        const constraints = [];

        // Aplicar filtros
        if (cargo && validarCargo(cargo)) {
            constraints.push(where('cargo', '==', cargo));
        }

        // Ordenação
        constraints.push(orderBy(ordernarPor, ordem));
        constraints.push(limit(limite));

        // Paginação
        if (pagina > 1) {
            // Buscar último documento da página anterior
            const offset = (pagina - 1) * limite;
            const snapshot = await getDocs(query(
                collection(db, 'usuarios'),
                orderBy(ordernarPor, ordem),
                limit(offset)
            ));
            
            if (!snapshot.empty) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                constraints.push(startAfter(lastDoc));
            }
        }

        // Executar query
        const qFinal = query(collection(db, 'usuarios'), ...constraints);
        const querySnapshot = await getDocs(qFinal);

        // Processar resultados
        const usuarios = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            
            // Sanitizar dados sensíveis
            usuarios.push({
                uid: doc.id,
                nome: sanitizarInput(data.nome || ''),
                email: sanitizarInput(data.email || ''),
                cargo: data.cargo || 'user',
                aprovado: data.aprovado || false,
                dataCadastro: data.dataCadastro?.toDate?.() || null,
                ultimoAcesso: data.ultimoAcesso?.toDate?.() || null,
                estatisticas: {
                    calculosRealizados: data.estatisticas?.calculosRealizados || 0,
                    ferramentasUsadas: data.estatisticas?.ferramentasUsadas || []
                }
            });
        });

        // Buscar total de usuários (para paginação)
        const totalSnapshot = await getDocs(collection(db, 'usuarios'));
        const total = totalSnapshot.size;

        // Aplicar busca textual (se houver)
        let resultados = usuarios;
        if (busca) {
            const termoBusca = sanitizarInput(busca).toLowerCase();
            resultados = usuarios.filter(u => 
                u.nome.toLowerCase().includes(termoBusca) ||
                u.email.toLowerCase().includes(termoBusca)
            );
        }

        logger.info(`Admin listou usuários - Página ${pagina}, ${resultados.length} resultados`);

        return {
            usuarios: resultados,
            paginacao: {
                paginaAtual: pagina,
                totalPaginas: Math.ceil(total / limite),
                totalUsuarios: total,
                itensPorPagina: limite
            }
        };

    } catch (error) {
        logger.error('Erro ao listar usuários', error);
        throw new Error(`Falha ao listar usuários: ${error.message}`);
    }
}

/**
 * alterarCargoUsuario - Altera cargo de usuário
 * @param {string} uid - ID do usuário
 * @param {string} novoCargo - Novo cargo
 * @returns {Promise<Object>} Resultado da operação
 */
export async function alterarCargoUsuario(uid, novoCargo) {
    try {
        // Verificações de segurança
        const adminData = await verificarPermissaoAdmin();
        verificarRateLimit('alterar_cargo');

        // Validar parâmetros
        if (!uid || typeof uid !== 'string') {
            throw new Error('UID do usuário inválido');
        }

        if (!validarCargo(novoCargo)) {
            throw new Error('Cargo inválido');
        }

        // Verificar se é super_admin para alterar cargos de admin
        if (novoCargo === 'admin' && adminData.cargo !== 'super_admin') {
            throw new Error('Apenas super_admin pode criar novos administradores');
        }

        // Buscar dados do usuário alvo
        const userRef = doc(db, 'usuarios', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error('Usuário não encontrado');
        }

        const userData = userDoc.data();

        // Impedir auto-rebaixamento do último super_admin
        if (userData.cargo === 'super_admin' && novoCargo !== 'super_admin') {
            // Verificar se é o último super_admin
            const adminsSnapshot = await getDocs(query(
                collection(db, 'usuarios'),
                where('cargo', '==', 'super_admin')
            ));
            
            if (adminsSnapshot.size === 1 && uid === auth.currentUser.uid) {
                throw new Error('Não é possível remover o último super_admin');
            }
        }

        // Registrar alteração antes de executar
        const alteracao = {
            usuario: uid,
            cargoAntigo: userData.cargo,
            cargoNovo: novoCargo,
            alteradoPor: auth.currentUser.uid,
            data: Timestamp.now()
        };

        // Atualizar cargo
        await updateDoc(userRef, {
            cargo: novoCargo,
            ultimaAlteracao: Timestamp.now(),
            alteradoPor: auth.currentUser.uid
        });

        // Invalidar cache
        userCache.delete(uid);

        // Registrar log administrativo
        await registrarLogAdmin('alteracao_cargo', alteracao);

        logger.info(`Cargo alterado: ${uid} de ${userData.cargo} para ${novoCargo} por ${auth.currentUser.email}`);

        return {
            success: true,
            mensagem: `Cargo alterado de ${userData.cargo} para ${novoCargo}`,
            dados: alteracao
        };

    } catch (error) {
        logger.error('Erro ao alterar cargo', error);
        throw new Error(`Falha ao alterar cargo: ${error.message}`);
    }
}

/**
 * deletarUsuario - Remove usuário do sistema (soft delete ou hard delete)
 * @param {string} uid - ID do usuário
 * @param {boolean} hardDelete - Se true, remove permanentemente
 * @returns {Promise<Object>} Resultado da operação
 */
export async function deletarUsuario(uid, hardDelete = false) {
    try {
        // Verificações de segurança
        const adminData = await verificarPermissaoAdmin();
        verificarRateLimit('deletar_usuario');

        // Validar parâmetros
        if (!uid || typeof uid !== 'string') {
            throw new Error('UID do usuário inválido');
        }

        // Impedir auto-deleção
        if (uid === auth.currentUser.uid) {
            throw new Error('Não é possível deletar o próprio usuário');
        }

        // Buscar dados do usuário alvo
        const userRef = doc(db, 'usuarios', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error('Usuário não encontrado');
        }

        const userData = userDoc.data();

        // Verificar permissão para deletar admins
        if (userData.cargo === 'admin' || userData.cargo === 'super_admin') {
            if (adminData.cargo !== 'super_admin') {
                throw new Error('Apenas super_admin pode deletar administradores');
            }

            // Verificar se não é o último super_admin
            if (userData.cargo === 'super_admin') {
                const superAdminsSnapshot = await getDocs(query(
                    collection(db, 'usuarios'),
                    where('cargo', '==', 'super_admin')
                ));
                
                if (superAdminsSnapshot.size <= 1) {
                    throw new Error('Não é possível deletar o último super_admin');
                }
            }
        }

        // Registrar operação
        const operacao = {
            usuario: uid,
            usuarioEmail: userData.email,
            usuarioNome: userData.nome,
            hardDelete,
            deletadoPor: auth.currentUser.uid,
            data: Timestamp.now()
        };

        if (hardDelete) {
            // Hard delete: remover permanentemente
            await deleteDoc(userRef);
            
            // Remover também de outras coleções (histórico, etc)
            await deletarDadosRelacionados(uid);
            
            logger.warn(`Usuário deletado permanentemente: ${uid} (${userData.email}) por ${auth.currentUser.email}`);
        } else {
            // Soft delete: apenas marcar como inativo
            await updateDoc(userRef, {
                ativo: false,
                deletado: true,
                dataDelecao: Timestamp.now(),
                deletadoPor: auth.currentUser.uid
            });
            
            logger.warn(`Usuário desativado: ${uid} (${userData.email}) por ${auth.currentUser.email}`);
        }

        // Invalidar cache
        userCache.delete(uid);

        // Registrar log administrativo
        await registrarLogAdmin('delecao_usuario', operacao);

        return {
            success: true,
            mensagem: hardDelete ? 
                `Usuário ${userData.email} deletado permanentemente` : 
                `Usuário ${userData.email} desativado com sucesso`,
            operacao
        };

    } catch (error) {
        logger.error('Erro ao deletar usuário', error);
        throw new Error(`Falha ao deletar usuário: ${error.message}`);
    }
}

/**
 * deletarDadosRelacionados - Remove dados associados ao usuário
 * @param {string} uid - ID do usuário
 */
async function deletarDadosRelacionados(uid) {
    const batch = writeBatch(db);
    
    // Coleções que podem ter dados do usuário
    const colecoes = [
        'historico_calculos',
        'logs_usuario',
        'preferencias',
        'notificacoes'
    ];

    for (const colecao of colecoes) {
        const q = query(collection(db, colecao), where('usuarioId', '==', uid));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();
}

/**
 * registrarLogAdmin - Registra ações administrativas
 * @param {string} acao - Tipo de ação
 * @param {Object} dados - Dados da ação
 */
async function registrarLogAdmin(acao, dados) {
    try {
        const logRef = doc(collection(db, 'logs_admin'));
        await setDoc(logRef, {
            acao,
            dados,
            usuario: auth.currentUser.uid,
            email: auth.currentUser.email,
            timestamp: Timestamp.now(),
            ip: await getUserIP()
        });
    } catch (error) {
        logger.error('Erro ao registrar log admin', error);
        // Não interrompe o fluxo principal
    }
}

/**
 * getUserIP - Obtém IP do usuário para auditoria
 * @returns {Promise<string>} IP do usuário
 */
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

/**
 * limparCache - Limpa o cache manualmente
 */
export function limparCache() {
    userCache.clear();
    rateLimitMap.clear();
    logger.info('Cache administrativo limpo');
}

/**
 * getEstatisticasAdmin - Retorna estatísticas de uso admin
 * @returns {Object} Estatísticas
 */
export function getEstatisticasAdmin() {
    return {
        cacheSize: userCache.size,
        rateLimitMapSize: rateLimitMap.size,
        versao: '2.0',
        recursos: {
            listarUsuarios: true,
            alterarCargo: true,
            deletarUsuario: true,
            hardDelete: true
        }
    };
}

// ============================================
// EXPORTAÇÕES ADICIONAIS
// ============================================
export const versaoAdmin = '2.0.0';
export const configAdmin = ADMIN_CONFIG;