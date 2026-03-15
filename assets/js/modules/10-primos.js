// ============================================
// MÓDULO 10: FUNÇÕES PARA NÚMEROS PRIMOS (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * verificarPrimo - Verifica se um número é primo
 */
export function verificarPrimo() {
    const numero = parseInt(document.getElementById('numeroPrimo')?.value);
    const resultadoDiv = document.getElementById('primoResultado');

    if (!resultadoDiv || isNaN(numero) || numero < 2) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Digite um número ≥ 2!</span>';
        return;
    }

    let isPrimo = true;
    const divisores = [];

    for (let i = 2; i <= Math.sqrt(numero); i++) {
        if (numero % i === 0) {
            isPrimo = false;
            divisores.push(i);
            if (i !== numero / i) divisores.push(numero / i);
        }
    }

    divisores.sort((a, b) => a - b);

    let explicacao = `<strong>${numero}</strong> `;
    
    if (isPrimo) {
        explicacao += `✅ é um número primo!`;
    } else {
        explicacao += `❌ não é primo.<br>`;
        explicacao += `Divisores: 1, ${divisores.join(', ')}, ${numero}`;
    }

    resultadoDiv.innerHTML = explicacao;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('primos', `${numero}`, isPrimo ? 'primo' : 'não primo');
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('verificar_primo', { numero, isPrimo });
    }
}

/**
 * listarPrimos - Lista todos os números primos até um valor
 */
export function listarPrimos() {
    const ate = parseInt(document.getElementById('primosAte')?.value);
    const resultadoDiv = document.getElementById('primosLista');

    if (!resultadoDiv || isNaN(ate) || ate < 2) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Digite um número ≥ 2!</span>';
        return;
    }

    const primos = [];
    for (let num = 2; num <= ate; num++) {
        let isPrimo = true;
        for (let i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) {
                isPrimo = false;
                break;
            }
        }
        if (isPrimo) primos.push(num);
    }

    resultadoDiv.innerHTML = `
        <strong>Primos até ${ate}:</strong><br>
        ${primos.join(', ')}<br>
        <small>Total: ${primos.length} números primos</small>
    `;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('lista_primos', `até ${ate}`, `${primos.length} primos`);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('listar_primos', { ate, quantidade: primos.length });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.verificarPrimo = verificarPrimo;
window.listarPrimos = listarPrimos;