// ============================================
// MÓDULO 02: HISTÓRICO DE CÁLCULOS COM FIREBASE
// ============================================

import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import app from '../firebase/config.js';

// Inicializar serviços
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * salvarHistorico - Salva um cálculo no Firestore
 * @param {string} tipo - Tipo de cálculo (ex: 'logaritmo', 'potencia')
 * @param {string} entrada - Entrada do usuário (ex: '2^3')
 * @param {string|number} resultado - Resultado do cálculo
 */
export async function salvarHistorico(tipo, entrada, resultado) {
    const user = auth.currentUser;
    
    // Se não estiver logado, não salva (ou pode salvar anônimo se preferir)
    if (!user) {
        console.log('Usuário não logado - histórico não salvo');
        return { success: false, error: 'Usuário não logado' };
    }

    try {
        // Referência para a coleção do usuário
        const historicoRef = collection(db, 'usuarios', user.uid, 'historico');
        
        // Adicionar documento
        await addDoc(historicoRef, {
            tipo: tipo,
            entrada: entrada,
            resultado: resultado,
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Histórico salvo no Firebase:', tipo);
        
        // Atualizar a interface
        atualizarHistorico();
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erro ao salvar histórico no Firebase:', error);
        return { success: false, error: error.message };
    }
}

/**
 * atualizarHistorico - Busca e exibe o histórico do Firestore
 */
export async function atualizarHistorico() {
    const historicoLista = document.getElementById('historico-lista');
    if (!historicoLista) {
        console.log('Elemento historico-lista não encontrado nesta página');
        return;
    }

    const user = auth.currentUser;
    
    if (!user) {
        historicoLista.innerHTML = '<div class="historico-vazio">Faça login para ver seu histórico</div>';
        return;
    }

    try {
        // Buscar histórico do usuário
        const historicoRef = collection(db, 'usuarios', user.uid, 'historico');
        const q = query(historicoRef, orderBy('timestamp', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            historicoLista.innerHTML = '<div class="historico-vazio">Nenhum cálculo ainda</div>';
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            // Formatar data
            const data = new Date(item.timestamp).toLocaleString('pt-BR');
            
            html += `
                <div class="historico-item" data-id="${doc.id}">
                    <div class="historico-item-header">
                        <span class="historico-tipo">${item.tipo}</span>
                        <small class="historico-data">${data}</small>
                    </div>
                    <div class="historico-conteudo">${item.entrada} = ${item.resultado}</div>
                </div>
            `;
        });
        
        historicoLista.innerHTML = html;
        console.log('✅ Histórico atualizado com', querySnapshot.size, 'itens');
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        historicoLista.innerHTML = '<div class="historico-vazio">Erro ao carregar histórico</div>';
    }
}

/**
 * limparHistorico - Remove TODO o histórico do usuário no Firestore
 */
export async function limparHistorico() {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Faça login para gerenciar seu histórico');
        return;
    }

    if (!confirm('Tem certeza que deseja limpar todo o histórico?')) {
        return;
    }

    try {
        // Buscar todos os documentos do histórico
        const historicoRef = collection(db, 'usuarios', user.uid, 'historico');
        const querySnapshot = await getDocs(historicoRef);
        
        // Deletar cada documento
        const deletePromises = [];
        querySnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(deletePromises);
        
        console.log('✅ Histórico limpo com sucesso');
        atualizarHistorico();
        
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        alert('Erro ao limpar histórico. Tente novamente.');
    }
}

/**
 * limparHistoricoItem - Remove UM item específico do histórico (opcional)
 * @param {string} docId - ID do documento no Firestore
 */
export async function limparHistoricoItem(docId) {
    const user = auth.currentUser;
    
    if (!user) return;

    try {
        await deleteDoc(doc(db, 'usuarios', user.uid, 'historico', docId));
        console.log('✅ Item removido do histórico');
        atualizarHistorico();
        
    } catch (error) {
        console.error('❌ Erro ao remover item:', error);
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.salvarHistorico = salvarHistorico;
window.atualizarHistorico = atualizarHistorico;
window.limparHistorico = limparHistorico;
window.limparHistoricoItem = limparHistoricoItem;

console.log('📦 Módulo de histórico com Firebase carregado');