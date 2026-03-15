// ============================================
// MÓDULO 05: FUNÇÕES PARA BHASKARA (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

/**
 * calcularBhaskara - Calcula as raízes de uma equação do 2º grau
 * Função chamada pelo onclick no HTML
 */
export function calcularBhaskara() {
    const a = parseFloat(document.getElementById('bhaskara-a')?.value);
    const b = parseFloat(document.getElementById('bhaskara-b')?.value);
    const c = parseFloat(document.getElementById('bhaskara-c')?.value);
    const resultadoDiv = document.getElementById('bhaskaraResultado');

    if (!resultadoDiv) return;

    // Validações
    if (!isValidNumber(a) || !isValidNumber(b) || !isValidNumber(c)) {
        resultadoDiv.innerHTML = '<span class="error">❌ Preencha todos os coeficientes!</span>';
        return;
    }

    if (a === 0) {
        resultadoDiv.innerHTML = '<span class="error">❌ Coeficiente a não pode ser zero!</span>';
        return;
    }

    // Cálculo do delta
    const delta = b * b - 4 * a * c;
    
    let explicacao = `
        <strong>📐 Equação:</strong> ${formatNumber(a)}x² ${b >= 0 ? '+' : '-'} ${Math.abs(formatNumber(b))}x ${c >= 0 ? '+' : '-'} ${Math.abs(formatNumber(c))} = 0<br>
        <strong>Δ = b² - 4ac</strong> = ${formatNumber(b)}² - 4·${formatNumber(a)}·${formatNumber(c)}<br>
        <strong>Δ =</strong> ${formatNumber(delta)}<br>
    `;

    if (delta < 0) {
        explicacao += `<br><span class="warning">⚠️ Raízes complexas: Δ = ${formatNumber(delta)}</span>`;
    } else if (delta === 0) {
        const x = -b / (2 * a);
        explicacao += `<br><strong>✅ Raiz única (Δ = 0):</strong><br>`;
        explicacao += `x = -b/2a = ${formatNumber(-b)}/(2·${formatNumber(a)}) = ${formatNumber(x)}`;
    } else {
        const x1 = (-b + Math.sqrt(delta)) / (2 * a);
        const x2 = (-b - Math.sqrt(delta)) / (2 * a);
        explicacao += `<br><strong>✅ Duas raízes reais:</strong><br>`;
        explicacao += `x₁ = (-b + √Δ)/2a = (${formatNumber(-b)} + √${formatNumber(delta)})/(2·${formatNumber(a)}) = ${formatNumber(x1)}<br>`;
        explicacao += `x₂ = (-b - √Δ)/2a = (${formatNumber(-b)} - √${formatNumber(delta)})/(2·${formatNumber(a)}) = ${formatNumber(x2)}`;
        
        // Soma e produto
        const soma = -b / a;
        const produto = c / a;
        explicacao += `<br><br><small>📌 Soma das raízes: ${formatNumber(soma)}</small>`;
        explicacao += `<br><small>📌 Produto das raízes: ${formatNumber(produto)}</small>`;
    }

    resultadoDiv.innerHTML = explicacao;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('bhaskara', `${a}x²+${b}x+${c}`, `Δ=${delta}`);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('bhaskara', { a, b, c, delta });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.calcularBhaskara = calcularBhaskara;