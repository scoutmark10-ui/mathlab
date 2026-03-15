// ============================================
// MÓDULO 00: UTILITÁRIOS GLOBAIS (MODULAR)
// ============================================

/**
* formatNumber - Formata número evitando notação científica para números pequenos
* @param {number} num - Número a ser formatado
* @param {number} decimals - Casas decimais (padrão: 6)
* @returns {string} Número formatado
*/
export function formatNumber(num, decimals = 6) {
  if (Math.abs(num) < 0.000001 && num !== 0) {
    return num.toExponential(4);
  }
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
* isValidNumber - Verifica se um valor é um número válido
* @param {any} value - Valor a ser verificado
* @returns {boolean} True se for um número válido
*/
export function isValidNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
* showError - Exibe mensagem de erro em um elemento
* @param {string} elementId - ID do elemento
* @param {string} message - Mensagem de erro
*/
export function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<span class="error">❌ ${message}</span>`;
  }
}

/**
* showSuccess - Exibe mensagem de sucesso em um elemento
* @param {string} elementId - ID do elemento
* @param {string} message - Mensagem de sucesso
*/
export function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<span class="success">✅ ${message}</span>`;
  }
}

/**
* hexToRgb - Converte cor hexadecimal para string RGB
* @param {string} hex - Cor em formato hexadecimal (ex: "#9b59b6")
* @returns {string} String no formato "r, g, b"
*/
export function hexToRgb(hex) {
  let cleanHex = hex.replace(/^#/, '');

  // Expandir shorthand (ex.: #abc -> #aabbcc)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  // Validar HEX
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    console.warn('Hex inválido, usando fallback roxo');
    return '155, 89, 182'; // Roxo fallback
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

/**
* escurecerCorHSL - Escurece uma cor em formato hexadecimal usando HSL
* @param {string} hex - Cor em formato hexadecimal
* @param {number} percent - Percentual para escurecer (0-100)
* @returns {string} Nova cor em formato hexadecimal
*/
export function escurecerCorHSL(hex, percent) {
  let r,
  g,
  b;

  // Converter HEX para RGB
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  // Normalizar RGB
  r /= 255;
  g /= 255;
  b /= 255;

  // Converter para HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
  s,
  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // Cinza
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min): d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6: 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Escurecer (reduzir luminosidade)
  l = Math.max(0, l - percent / 100);

  // Converter de volta para RGB
  let rgb;
  if (s === 0) {
    rgb = [l,
      l,
      l].map(v => Math.round(v * 255));
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s): l + s - l * s;
    const p = 2 * l - q;

    rgb = [
      hue2rgb(p, q, h + 1/3),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1/3)
    ].map(v => Math.round(v * 255));
  }

  // Converter para HEX
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}