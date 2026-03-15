// ============================================
// MÓDULO 18: CONVERSÕES DE UNIDADES (MODULAR - PRODUÇÃO)
// ============================================

import {
  formatNumber,
  isValidNumber
} from './00-utils.js';
import {
  salvarHistorico
} from './02-history.js';

console.log('📦 Módulo de conversões carregado!');

// Tabelas de conversão
const conversoes = {
  comprimento: {
    metros: {
      fator: 1,
      nome: 'Metros (m)'
    },
    km: {
      fator: 1000,
      nome: 'Quilômetros (km)'
    },
    cm: {
      fator: 0.01,
      nome: 'Centímetros (cm)'
    },
    mm: {
      fator: 0.001,
      nome: 'Milímetros (mm)'
    },
    milhas: {
      fator: 1609.34,
      nome: 'Milhas'
    },
    pes: {
      fator: 0.3048,
      nome: 'Pés'
    },
    polegadas: {
      fator: 0.0254,
      nome: 'Polegadas'
    }
  },
  massa: {
    kg: {
      fator: 1,
      nome: 'Quilogramas (kg)'
    },
    g: {
      fator: 0.001,
      nome: 'Gramas (g)'
    },
    mg: {
      fator: 0.000001,
      nome: 'Miligramas (mg)'
    },
    lb: {
      fator: 0.453592,
      nome: 'Libras (lb)'
    },
    oz: {
      fator: 0.0283495,
      nome: 'Onças (oz)'
    }
  },
  temperatura: {
    celsius: {
      nome: 'Celsius (°C)'
    },
    fahrenheit: {
      nome: 'Fahrenheit (°F)'
    },
    kelvin: {
      nome: 'Kelvin (K)'
    }
  },
  volume: {
    litros: {
      fator: 1,
      nome: 'Litros (L)'
    },
    ml: {
      fator: 0.001,
      nome: 'Mililitros (mL)'
    },
    m3: {
      fator: 1000,
      nome: 'Metros cúbicos (m³)'
    },
    galao: {
      fator: 3.78541,
      nome: 'Galões (US)'
    }
  },
  tempo: {
    segundos: {
      fator: 1,
      nome: 'Segundos'
    },
    minutos: {
      fator: 60,
      nome: 'Minutos'
    },
    horas: {
      fator: 3600,
      nome: 'Horas'
    },
    dias: {
      fator: 86400,
      nome: 'Dias'
    }
  },
  velocidade: {
    ms: {
      fator: 1,
      nome: 'm/s'
    },
    kmh: {
      fator: 0.277778,
      nome: 'km/h'
    },
    mph: {
      fator: 0.44704,
      nome: 'mph'
    }
  }
};

/**
* converterUnidade - Função principal de conversão
* Chamada pelo onclick no HTML
*/
export function converterUnidade() {
  const tipo = document.getElementById('tipoConversao')?.value;
  const valor = parseFloat(document.getElementById('valorConversao')?.value);
  const de = document.getElementById('converterDe')?.value;
  const para = document.getElementById('converterPara')?.value;
  const resultadoDiv = document.getElementById('conversaoResultado');

  if (!resultadoDiv || !tipo || !de || !para) {
    if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Erro nos parâmetros!</span>';
    return;
  }

  if (!isValidNumber(valor)) {
    resultadoDiv.innerHTML = '<span class="error">❌ Digite um valor válido!</span>';
    return;
  }

  let resultado;
  let explicacao = '';

  try {
    if (tipo === 'temperatura') {
      // Conversão de temperatura (fórmulas específicas)
      if (de === 'celsius' && para === 'fahrenheit') {
        resultado = valor * 9/5 + 32;
        explicacao = `${valor}°C × 9/5 + 32 = ${resultado.toFixed(2)}°F`;
      } else if (de === 'celsius' && para === 'kelvin') {
        resultado = valor + 273.15;
        explicacao = `${valor}°C + 273.15 = ${resultado.toFixed(2)}K`;
      } else if (de === 'fahrenheit' && para === 'celsius') {
        resultado = (valor - 32) * 5/9;
        explicacao = `(${valor}°F - 32) × 5/9 = ${resultado.toFixed(2)}°C`;
      } else if (de === 'fahrenheit' && para === 'kelvin') {
        resultado = (valor - 32) * 5/9 + 273.15;
        explicacao = `(${valor}°F - 32) × 5/9 + 273.15 = ${resultado.toFixed(2)}K`;
      } else if (de === 'kelvin' && para === 'celsius') {
        resultado = valor - 273.15;
        explicacao = `${valor}K - 273.15 = ${resultado.toFixed(2)}°C`;
      } else if (de === 'kelvin' && para === 'fahrenheit') {
        resultado = (valor - 273.15) * 9/5 + 32;
        explicacao = `(${valor}K - 273.15) × 9/5 + 32 = ${resultado.toFixed(2)}°F`;
      } else {
        resultado = valor; // mesma unidade
        explicacao = `${valor} (mesma unidade)`;
      }
    } else {
      // Conversão com fator (comprimento, massa, volume, tempo, velocidade)
      const fatorDe = conversoes[tipo][de].fator;
      const fatorPara = conversoes[tipo][para].fator;

      // Converte para a unidade base primeiro e depois para a destino
      const valorBase = valor * fatorDe;
      resultado = valorBase / fatorPara;

      explicacao = `${valor} ${de} = ${formatNumber(resultado)} ${para}`;

      // Adiciona explicação do fator se for um número redondo
      if (Number.isInteger(fatorDe) && Number.isInteger(fatorPara)) {
        explicacao += `<br><small>📌 Fator: ${fatorDe}/${fatorPara} = ${(fatorDe/fatorPara).toFixed(4)}</small>`;
      }
    }

    // Formata o resultado (evita muitas casas decimais)
    const resultadoFormatado = formatNumber(resultado, 6);

    resultadoDiv.innerHTML = `
    <strong>${formatNumber(valor)} ${de}</strong> =
    <strong style="color: var(--accent-primary); font-size: 1.3rem;">${resultadoFormatado} ${para}</strong>
    <br><small>${explicacao}</small>
    `;

    // Salva no histórico (usando a função importada)
    salvarHistorico('conversão', `${valor}${de}→${para}`, resultadoFormatado);

    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
      window.rastrearCalculo('conversao', {
        tipo, de, para, valor, resultado
      });
    }

  } catch (error) {
    resultadoDiv.innerHTML = '<span class="error">❌ Erro na conversão!</span>';
    console.error('Erro na conversão:', error);
  }
}

/**
* atualizarOpcoesConversao - Atualiza os selects de unidades baseado no tipo
* Chamada pelo onchange no HTML
*/
export function atualizarOpcoesConversao() {
  const tipo = document.getElementById('tipoConversao')?.value;
  const deSelect = document.getElementById('converterDe');
  const paraSelect = document.getElementById('converterPara');

  if (!tipo || !deSelect || !paraSelect) return;

  // Limpa os selects
  deSelect.innerHTML = '';
  paraSelect.innerHTML = '';

  // Pega as unidades do tipo selecionado
  const unidades = conversoes[tipo];
  const keys = Object.keys(unidades);

  // Preenche os selects
  keys.forEach((key, index) => {
    const unidade = unidades[key];
    deSelect.innerHTML += `<option value="${key}" ${index === 0 ? 'selected': ''}>${unidade.nome}</option>`;
    paraSelect.innerHTML += `<option value="${key}" ${index === 1 ? 'selected': ''}>${unidade.nome}</option>`;
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
* initConversao - Inicializa os listeners da página de conversão
* Chamada apenas quando o módulo é carregado
*/
function initConversao() {
  // Se estiver na página de conversões, inicializa os selects
  if (document.getElementById('tipoConversao')) {
    atualizarOpcoesConversao();

    // Adiciona event listener para mudança de tipo
    document.getElementById('tipoConversao').addEventListener('change', function() {
      atualizarOpcoesConversao();
    });
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConversao);
} else {
  initConversao();
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick no HTML)
// ============================================
window.converterUnidade = converterUnidade;
window.atualizarOpcoesConversao = atualizarOpcoesConversao;