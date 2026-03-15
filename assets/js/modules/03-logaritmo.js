// ============================================
// MÓDULO 03: FUNÇÕES PARA LOGARITMOS (COMPLETO)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

// ============================================
// FUNÇÃO PRINCIPAL DE CÁLCULO
// ============================================

export function calcularLog() {
    const base = parseFloat(document.getElementById('logBase')?.value);
    const argumento = parseFloat(document.getElementById('logArgumento')?.value);
    const resultadoDiv = document.getElementById('logResultado');

    if (!resultadoDiv) return;

    // Validações
    if (!isValidNumber(base) || !isValidNumber(argumento)) {
        resultadoDiv.innerHTML = '<span class="error">❌ Preencha todos os campos!</span>';
        return;
    }

    if (base <= 0 || base === 1) {
        resultadoDiv.innerHTML = '<span class="error">❌ Base deve ser > 0 e ≠ 1!</span>';
        return;
    }

    if (argumento <= 0) {
        resultadoDiv.innerHTML = '<span class="error">❌ Argumento deve ser > 0!</span>';
        return;
    }

    try {
        const resultado = Math.log(argumento) / Math.log(base);
        const resultadoArredondado = Math.round(resultado * 1000000) / 1000000;
        
        let explicacao = `log<sub>${base}</sub>(${argumento}) = ${resultadoArredondado}`;
        
        if (Math.abs(resultado - Math.round(resultado)) < 0.0000001) {
            const inteiro = Math.round(resultado);
            const potencia = Math.pow(base, inteiro);
            if (Math.abs(potencia - argumento) < 0.0000001) {
                explicacao += `<br><small>✅ Pois ${base}<sup>${inteiro}</sup> = ${formatNumber(potencia)}</small>`;
            }
        }
        
        explicacao += `<br><small>📌 logₐ(x) = ln(x)/ln(a)</small>`;
        resultadoDiv.innerHTML = explicacao;
        
        salvarHistorico('log', `${base}(${argumento})`, resultadoArredondado);
        
    } catch (error) {
        resultadoDiv.innerHTML = '<span class="error">❌ Erro no cálculo!</span>';
        console.error('Erro no cálculo de logaritmo:', error);
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

export function usarExemplo(base, argumento) {
    document.getElementById('logBase').value = base;
    document.getElementById('logArgumento').value = argumento;
    calcularLog();
}

export function mostrarResposta(num) {
    const resp = document.getElementById('resp' + num);
    if (resp) {
        resp.classList.toggle('show');
    }
}

export function usarNaCalculadora(base, argumento) {
    document.getElementById('logBase').value = base;
    document.getElementById('logArgumento').value = argumento;
    calcularLog();
    document.querySelector('.calc-card')?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// EXPOR PARA GLOBAL (OBRIGATÓRIO!)
// ============================================
window.calcularLog = calcularLog;
window.usarExemplo = usarExemplo;
window.mostrarResposta = mostrarResposta;
window.usarNaCalculadora = usarNaCalculadora;