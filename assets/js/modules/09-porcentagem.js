// ============================================
// MÓDULO 09: FUNÇÕES PARA PORCENTAGEM (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularPorcentagem - Calcula porcentagem, aumento ou desconto
 */
export function calcularPorcentagem() {
    const valor = parseFloat(document.getElementById('valorPorcentagem')?.value);
    const percentual = parseFloat(document.getElementById('percentual')?.value);
    const tipo = document.getElementById('tipoPorcentagem')?.value;
    const resultadoDiv = document.getElementById('porcentagemResultado');

    if (!resultadoDiv || !isValidNumber(valor) || !isValidNumber(percentual)) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Preencha todos os campos!</span>';
        return;
    }

    let resultado, explicacao;

    switch(tipo) {
        case 'percentual':
            resultado = (valor * percentual) / 100;
            explicacao = `${percentual}% de ${formatNumber(valor)} = (${percentual} × ${formatNumber(valor)}) / 100 = ${formatNumber(resultado)}`;
            break;
        case 'aumento':
            resultado = valor * (1 + percentual / 100);
            explicacao = `${formatNumber(valor)} com aumento de ${percentual}% = ${formatNumber(valor)} × (1 + ${percentual}/100) = ${formatNumber(resultado)}`;
            break;
        case 'desconto':
            resultado = valor * (1 - percentual / 100);
            explicacao = `${formatNumber(valor)} com desconto de ${percentual}% = ${formatNumber(valor)} × (1 - ${percentual}/100) = ${formatNumber(resultado)}`;
            break;
        default:
            resultadoDiv.innerHTML = '<span class="error">❌ Tipo de cálculo inválido!</span>';
            return;
    }

    resultadoDiv.innerHTML = explicacao;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('porcentagem', `${percentual}% de ${valor}`, resultado);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('porcentagem', { tipo, valor, percentual, resultado });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularPorcentagem = calcularPorcentagem;