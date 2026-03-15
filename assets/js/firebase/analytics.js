// ============================================
// FIREBASE ANALYTICS - RASTREAMENTO DE EVENTOS (MODULAR)
// ============================================

import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import app from './config.js';

// Inicializar serviços
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================== RASTREAMENTO DE ACESSO A FERRAMENTAS ====================
export async function rastrearAcessoFerramenta(nomeFerramenta) {
    const user = auth.currentUser;
    
    // Registrar evento no Analytics
    logEvent(analytics, 'ferramenta_acessada', {
        nome: nomeFerramenta,
        usuario_id: user?.uid || 'anonimo',
        timestamp: Date.now()
    });
    
    // Salvar no Firestore para métricas detalhadas (apenas se logado)
    if (user) {
        try {
            await addDoc(collection(db, 'metricas'), {
                tipo: 'acesso_ferramenta',
                ferramenta: nomeFerramenta,
                usuario_id: user.uid,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Erro ao salvar métrica no Firestore:', error);
        }
    }
}

// ==================== RASTREAMENTO DE CÁLCULOS ====================
export async function rastrearCalculo(ferramenta, dados) {
    const user = auth.currentUser;
    
    // Registrar evento no Analytics
    logEvent(analytics, 'calculo_realizado', {
        ferramenta: ferramenta,
        ...dados,
        usuario_id: user?.uid || 'anonimo'
    });
    
    // Salvar histórico do usuário (apenas se logado)
    if (user) {
        try {
            await addDoc(collection(db, 'usuarios', user.uid, 'historico'), {
                ferramenta: ferramenta,
                dados: dados,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Erro ao salvar histórico no Firestore:', error);
        }
    }
}

// ==================== RASTREAMENTO DE TEMPO NA FERRAMENTA ====================
export function rastrearTempoNaFerramenta(nomeFerramenta, segundos) {
    logEvent(analytics, 'tempo_ferramenta', {
        ferramenta: nomeFerramenta,
        duracao_segundos: segundos
    });
}

console.log('📦 Firebase Analytics modular carregado');