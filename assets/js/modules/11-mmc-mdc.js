// ============================================
// MÓDULO 11: FUNÇÕES PARA MMC E MDC (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularMDC - Calcula o Máximo Divisor Comum usando o algoritmo de Euclides
 * @param {number} num1 - Primeiro número
 * @param {number} num2 - Segundo número
 * @returns {number} MDC dos dois números
 */
export function calcularMDC(num1, num2) {
    let a = Math.abs(num1);
    let b = Math.abs(num2);
    
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    
    return a;
}

/**
 * calcularMMC - Calcula o Mínimo Múltiplo Comum
 */
export function calcularMMC() {
    const num1 = parseInt(document.getElementById('mmc1')?.value);
    const num2 = parseInt(document.getElementById('mmc2')?.value);
    const resultadoDiv = document.getElementById('mmcResultado');

    if (!resultadoDiv || isNaN(num1) || isNaN(num2) || num1 <= 0 || num2 <= 0) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Digite números positivos!</span>';
        return;
    }

    // Calcular MDC primeiro
    const mdc = calcularMDC(num1, num2);
    const mmc = (num1 * num2) / mdc;

    resultadoDiv.innerHTML = `
        <strong>MMC(${num1}, ${num2}) = ${mmc}</strong><br>
        <small>📌 Fórmula: MMC(a,b) = (a × b) / MDC(a,b)</small><br>
        <small>📌 MDC(${num1}, ${num2}) = ${mdc}</small>
    `;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('mmc', `${num1},${num2}`, mmc);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('mmc', { num1, num2, resultado: mmc });
    }
}

/**
 * calcularMDC_Interface - Função de interface para calcular MDC
 */
export function calcularMDC_Interface() {
    const num1 = parseInt(document.getElementById('mdc1')?.value);
    const num2 = parseInt(document.getElementById('mdc2')?.value);
    const resultadoDiv = document.getElementById('mdcResultado');

    if (!resultadoDiv || isNaN(num1) || isNaN(num2) || num1 <= 0 || num2 <= 0) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Digite números positivos!</span>';
        return;
    }

    const mdc = calcularMDC(num1, num2);

    resultadoDiv.innerHTML = `
        <strong>MDC(${num1}, ${num2}) = ${mdc}</strong><br>
        <small>📌 Algoritmo de Euclides</small>
    `;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('mdc', `${num1},${num2}`, mdc);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('mdc', { num1, num2, resultado: mdc });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularMMC = calcularMMC;
window.calcularMDC_Interface = calcularMDC_Interface;
window.calcularMDC = calcularMDC; // Utilitário