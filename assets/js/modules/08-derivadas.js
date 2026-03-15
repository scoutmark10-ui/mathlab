// ============================================
// MÓDULO 08: FUNÇÕES PARA DERIVADAS (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularDerivada - Calcula a derivada de uma função em um ponto
 */
export function calcularDerivada() {
    const funcao = document.getElementById('funcao')?.value;
    const ponto = parseFloat(document.getElementById('pontoDerivada')?.value);
    const resultadoDiv = document.getElementById('derivadaResultado');

    if (!resultadoDiv || !funcao) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Selecione uma função!</span>';
        return;
    }

    let derivada, explicacao;
    const x = ponto || 0;

    switch(funcao) {
        case 'x^2':
            derivada = 2 * x;
            explicacao = `f(x) = x²<br>f'(x) = 2x<br>f'(${formatNumber(x)}) = 2·${formatNumber(x)} = ${formatNumber(derivada)}`;
            break;
        case 'x^3':
            derivada = 3 * x * x;
            explicacao = `f(x) = x³<br>f'(x) = 3x²<br>f'(${formatNumber(x)}) = 3·${formatNumber(x)}² = ${formatNumber(derivada)}`;
            break;
        case 'sin(x)':
            derivada = Math.cos(x);
            explicacao = `f(x) = sen(x)<br>f'(x) = cos(x)<br>f'(${formatNumber(x)}) = cos(${formatNumber(x)}) = ${formatNumber(derivada)}`;
            break;
        case 'cos(x)':
            derivada = -Math.sin(x);
            explicacao = `f(x) = cos(x)<br>f'(x) = -sen(x)<br>f'(${formatNumber(x)}) = -sen(${formatNumber(x)}) = ${formatNumber(derivada)}`;
            break;
        case 'e^x':
            derivada = Math.exp(x);
            explicacao = `f(x) = eˣ<br>f'(x) = eˣ<br>f'(${formatNumber(x)}) = e^${formatNumber(x)} = ${formatNumber(derivada)}`;
            break;
        case 'ln(x)':
            if (x <= 0) {
                resultadoDiv.innerHTML = '<span class="error">❌ ln(x) definido apenas para x > 0!</span>';
                return;
            }
            derivada = 1 / x;
            explicacao = `f(x) = ln(x)<br>f'(x) = 1/x<br>f'(${formatNumber(x)}) = 1/${formatNumber(x)} = ${formatNumber(derivada)}`;
            break;
        default:
            resultadoDiv.innerHTML = '<span class="error">❌ Função não reconhecida!</span>';
            return;
    }

    resultadoDiv.innerHTML = explicacao;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('derivada', `${funcao} em x=${x}`, derivada);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('derivada', { funcao, ponto: x, resultado: derivada });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularDerivada = calcularDerivada;