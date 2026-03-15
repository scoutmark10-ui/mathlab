// ============================================
// MÓDULO 13: UTILITÁRIOS DE INTERFACE (MODULAR)
// ============================================

/**
* mostrarResposta - Mostra/esconde a resposta de um exercício
* @param {number|string} num - Número do exercício (será usado no ID 'resp' + num)
*/
export function mostrarResposta(num) {
  const resp = document.getElementById('resp' + num);
  if (resp) {
    resp.classList.toggle('show');
  }
}

/**
* usarNaCalculadora - Preenche os valores de uma calculadora com um exemplo
* @param {number|string} base - Valor da base
* @param {number|string} argumento - Valor do argumento/expoente
* @param {string} pagina - Tipo de página ('log' ou 'potencia')
*/
export function usarNaCalculadora(base, argumento, pagina) {
  if (pagina === 'log') {
    const baseInput = document.getElementById('logBase');
    const argInput = document.getElementById('logArgumento');
    if (baseInput && argInput) {
      baseInput.value = base;
      argInput.value = argumento;
      // Tenta chamar a função calcularLog se ela existir globalmente
      if (typeof window.calcularLog === 'function') {
        window.calcularLog();
      }
    }
  } else if (pagina === 'potencia') {
    const baseInput = document.getElementById('base');
    const expInput = document.getElementById('expoente');
    if (baseInput && expInput) {
      baseInput.value = base;
      expInput.value = argumento;
      if (typeof window.calcularPotencia === 'function') {
        window.calcularPotencia();
      }
    }
  }
}

/**
* limparCampos - Limpa todos os campos que começam com um prefixo
* @param {string} prefixo - Prefixo dos IDs dos campos a serem limpos
*/
export function limparCampos(prefixo) {
  const inputs = document.querySelectorAll(`[id^="${prefixo}"]`);
  inputs.forEach(input => {
    if (input.type !== 'button' && input.type !== 'submit') {
      input.value = '';
    }
  });

  // Limpar resultados
  const resultadoDiv = document.getElementById(prefixo + 'Resultado');
  if (resultadoDiv) {
    resultadoDiv.innerHTML = 'Preencha os valores e clique em "Calcular"';
  }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.mostrarResposta = mostrarResposta;
window.usarNaCalculadora = usarNaCalculadora;
window.limparCampos = limparCampos;