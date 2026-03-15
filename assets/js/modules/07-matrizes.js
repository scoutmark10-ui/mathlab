// ============================================
// MÓDULO 07: FUNÇÕES PARA MATRIZES (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularMatriz - Calcula determinante e matriz inversa
 */
export function calcularMatriz() {
    const tamanho = document.getElementById('matrizTamanho')?.value || '2x2';
    const resultadoDiv = document.getElementById('matrizResultado');
    
    if (!resultadoDiv) return;

    let determinante;
    
    if (tamanho === '2x2') {
        const a = parseFloat(document.getElementById('m11')?.value) || 0;
        const b = parseFloat(document.getElementById('m12')?.value) || 0;
        const c = parseFloat(document.getElementById('m21')?.value) || 0;
        const d = parseFloat(document.getElementById('m22')?.value) || 0;
        
        determinante = a * d - b * c;
        
        let explicacao = `
            <strong>📊 Matriz 2x2:</strong><br>
            [ ${formatNumber(a)}  ${formatNumber(b)} ]<br>
            [ ${formatNumber(c)}  ${formatNumber(d)} ]<br><br>
            <strong>Determinante:</strong> det = ad - bc = ${formatNumber(a)}·${formatNumber(d)} - ${formatNumber(b)}·${formatNumber(c)} = ${formatNumber(determinante)}<br>
        `;
        
        if (determinante !== 0) {
            // Matriz inversa
            const invA = d / determinante;
            const invB = -b / determinante;
            const invC = -c / determinante;
            const invD = a / determinante;
            
            explicacao += `<br><strong>Matriz Inversa:</strong><br>`;
            explicacao += `[ ${formatNumber(invA)}  ${formatNumber(invB)} ]<br>`;
            explicacao += `[ ${formatNumber(invC)}  ${formatNumber(invD)} ]<br>`;
        }
        
        resultadoDiv.innerHTML = explicacao;
        
    } else if (tamanho === '3x3') {
        // Matriz 3x3
        const a = parseFloat(document.getElementById('m11_3')?.value) || 0;
        const b = parseFloat(document.getElementById('m12_3')?.value) || 0;
        const c = parseFloat(document.getElementById('m13_3')?.value) || 0;
        const d = parseFloat(document.getElementById('m21_3')?.value) || 0;
        const e = parseFloat(document.getElementById('m22_3')?.value) || 0;
        const f = parseFloat(document.getElementById('m23_3')?.value) || 0;
        const g = parseFloat(document.getElementById('m31_3')?.value) || 0;
        const h = parseFloat(document.getElementById('m32_3')?.value) || 0;
        const i = parseFloat(document.getElementById('m33_3')?.value) || 0;
        
        // Determinante 3x3 (Regra de Sarrus)
        determinante = a * e * i + b * f * g + c * d * h - c * e * g - b * d * i - a * f * h;
        
        let explicacao = `
            <strong>📊 Matriz 3x3:</strong><br>
            [ ${formatNumber(a)}  ${formatNumber(b)}  ${formatNumber(c)} ]<br>
            [ ${formatNumber(d)}  ${formatNumber(e)}  ${formatNumber(f)} ]<br>
            [ ${formatNumber(g)}  ${formatNumber(h)}  ${formatNumber(i)} ]<br><br>
            <strong>Determinante (Regra de Sarrus):</strong><br>
            det = ${formatNumber(a)}·${formatNumber(e)}·${formatNumber(i)} + ${formatNumber(b)}·${formatNumber(f)}·${formatNumber(g)} + ${formatNumber(c)}·${formatNumber(d)}·${formatNumber(h)} - 
            ${formatNumber(c)}·${formatNumber(e)}·${formatNumber(g)} - ${formatNumber(b)}·${formatNumber(d)}·${formatNumber(i)} - ${formatNumber(a)}·${formatNumber(f)}·${formatNumber(h)}<br>
            <strong>= ${formatNumber(determinante)}</strong>
        `;
        
        resultadoDiv.innerHTML = explicacao;
    }
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('matriz', `Matriz ${tamanho}`, `det=${formatNumber(determinante)}`);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('matriz', { tamanho, determinante });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularMatriz = calcularMatriz;