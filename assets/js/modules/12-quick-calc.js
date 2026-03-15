// ============================================
// MÓDULO 12: FUNÇÕES PARA CALCULADORA RÁPIDA (MODULAR - PRODUÇÃO)
// ============================================

import {
  formatNumber,
  isValidNumber
} from './00-utils.js';

/**
* calcularQuickBhaskara - Calcula Bhaskara rapidamente na página inicial
* Função chamada pelo onclick no HTML
*/
export function calcularQuickBhaskara() {
  const a = parseFloat(document.getElementById('quick-a')?.value);
  const b = parseFloat(document.getElementById('quick-b')?.value);
  const c = parseFloat(document.getElementById('quick-c')?.value);
  const resultDiv = document.getElementById('quick-bhaskara-result');

  if (!resultDiv) return;

  if (!isValidNumber(a) || !isValidNumber(b) || !isValidNumber(c)) {
    resultDiv.innerHTML = '❌ Preencha todos os campos!';
    return;
  }

  if (a === 0) {
    resultDiv.innerHTML = '❌ a não pode ser zero';
    return;
  }

  const delta = b * b - 4 * a * c;

  if (delta < 0) {
    resultDiv.innerHTML = `Δ = ${formatNumber(delta)} (sem raízes reais)`;
  } else if (delta === 0) {
    const x = -b / (2 * a);
    resultDiv.innerHTML = `Δ = 0 | x = ${formatNumber(x)}`;
  } else {
    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);
    resultDiv.innerHTML = `Δ = ${formatNumber(delta)} | x₁ = ${formatNumber(x1)} | x₂ = ${formatNumber(x2)}`;
  }

  // Opcional: rastrear uso da calculadora rápida
  if (typeof window.rastrearCalculo === 'function') {
    window.rastrearCalculo('quick_bhaskara', {
      a, b, c, delta
    });
  }
}

/**
* calcularQuickPercent - Calcula porcentagem rapidamente na página inicial
* Função chamada pelo onclick no HTML
*/
export function calcularQuickPercent() {
  const value = parseFloat(document.getElementById('quick-value')?.value);
  const percent = parseFloat(document.getElementById('quick-percent')?.value);
  const resultDiv = document.getElementById('quick-percent-result');

  if (!resultDiv) return;

  if (!isValidNumber(value) || !isValidNumber(percent)) {
    resultDiv.innerHTML = '❌ Preencha todos os campos!';
    return;
  }

  const result = (value * percent) / 100;
  resultDiv.innerHTML = `${percent}% de ${formatNumber(value)} = ${formatNumber(result)}`;

  // Opcional: rastrear uso da calculadora rápida
  if (typeof window.rastrearCalculo === 'function') {
    window.rastrearCalculo('quick_percent', {
      value, percent, result
    });
  }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick no HTML)
// ============================================
window.calcularQuickBhaskara = calcularQuickBhaskara;
window.calcularQuickPercent = calcularQuickPercent;