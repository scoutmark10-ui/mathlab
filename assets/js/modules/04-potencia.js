// ============================================
// MÓDULO 04: FUNÇÕES PARA POTÊNCIAS (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularPotencia - Calcula a potência de um número
 * Função chamada pelo onclick no HTML
 */
export function calcularPotencia() {
    const base = parseFloat(document.getElementById('base')?.value);
    const expoente = parseFloat(document.getElementById('expoente')?.value);
    const resultadoDiv = document.getElementById('resultado');

    if (!resultadoDiv) return;

    // Validações
    if (!isValidNumber(base) || !isValidNumber(expoente)) {
        resultadoDiv.innerHTML = '<span class="error">❌ Preencha todos os campos!</span>';
        return;
    }

    // Caso especial: 0⁰
    if (base === 0 && expoente === 0) {
        resultadoDiv.innerHTML = '<span class="error">❌ 0⁰ é indefinido!</span>';
        return;
    }

    try {
        const resultado = Math.pow(base, expoente);
        
        // Verificar se resultado é muito grande
        if (Math.abs(resultado) > 1e15) {
            resultadoDiv.innerHTML = `⚠️ ${base}<sup>${expoente}</sup> = ${resultado.toExponential(6)}`;
            return;
        }

        let explicacao = `${base}<sup>${expoente}</sup> = ${formatNumber(resultado)}`;
        
        // Explicação detalhada para expoentes pequenos
        if (expoente > 0 && Number.isInteger(expoente) && expoente <= 6 && Math.abs(base) < 100) {
            const termos = [];
            for (let i = 0; i < expoente; i++) {
                termos.push(base);
            }
            explicacao += `<br><small>📌 ${termos.join(' × ')} = ${formatNumber(resultado)}</small>`;
        } else if (expoente < 0) {
            explicacao += `<br><small>📌 a⁻ⁿ = 1/aⁿ = 1/${formatNumber(Math.pow(base, Math.abs(expoente)))}</small>`;
        } else if (expoente === 0.5) {
            explicacao += `<br><small>📌 √${base} = ${formatNumber(resultado)}</small>`;
        }
        
        resultadoDiv.innerHTML = explicacao;
        
        // Salvar no histórico
        if (typeof salvarHistorico === 'function') {
            salvarHistorico('potencia', `${base}^${expoente}`, resultado);
        }
        
        // Rastrear uso (opcional)
        if (typeof window.rastrearCalculo === 'function') {
            window.rastrearCalculo('potencia', { base, expoente, resultado });
        }
        
    } catch (error) {
        resultadoDiv.innerHTML = '<span class="error">❌ Erro no cálculo!</span>';
        console.error('Erro no cálculo de potência:', error);
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularPotencia = calcularPotencia;