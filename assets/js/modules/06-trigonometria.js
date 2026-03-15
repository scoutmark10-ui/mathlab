// ============================================
// MÓDULO 06: FUNÇÕES PARA TRIGONOMETRIA (MODULAR)
// ============================================

import { formatNumber, isValidNumber } from './00-utils.js';
import { salvarHistorico } from './02-history.js';

// Modo atual: 'degrees' ou 'radians'
let trigMode = 'degrees';

/**
 * toggleTrigMode - Alterna entre graus e radianos
 */
export function toggleTrigMode() {
    trigMode = trigMode === 'degrees' ? 'radians' : 'degrees';
    const btn = document.getElementById('trigModeBtn');
    if (btn) {
        btn.innerHTML = trigMode === 'degrees' ? '📐 Graus' : '📐 Radianos';
    }
    calcularTrig();
}

/**
 * calcularTrig - Calcula seno, cosseno e tangente
 */
export function calcularTrig() {
    const angulo = parseFloat(document.getElementById('angulo')?.value);
    const resultadoDiv = document.getElementById('trigResultado');

    if (!resultadoDiv || !isValidNumber(angulo)) {
        if (resultadoDiv) resultadoDiv.innerHTML = '<span class="error">❌ Digite um ângulo válido!</span>';
        return;
    }

    // Converter para radianos se necessário
    let anguloRad = angulo;
    if (trigMode === 'degrees') {
        anguloRad = angulo * Math.PI / 180;
    }

    const seno = Math.sin(anguloRad);
    const cosseno = Math.cos(anguloRad);
    const tangente = Math.tan(anguloRad);
    
    // Evitar valores muito grandes para tangente
    const tangenteFormatada = Math.abs(tangente) > 1e10 ? '∞' : formatNumber(tangente);

    let explicacao = `
        <strong>📐 Ângulo: ${formatNumber(angulo)} ${trigMode === 'degrees' ? '°' : 'rad'}</strong><br><br>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
            <div style="background: rgba(155, 89, 182, 0.1); padding: 10px; border-radius: 5px;">
                <div style="color: var(--accent-primary);">SENO</div>
                <div style="font-size: 1.3rem;">${formatNumber(seno)}</div>
            </div>
            <div style="background: rgba(142, 68, 173, 0.1); padding: 10px; border-radius: 5px;">
                <div style="color: var(--accent-secondary);">COSSENO</div>
                <div style="font-size: 1.3rem;">${formatNumber(cosseno)}</div>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
                <div style="color: #fff;">TANGENTE</div>
                <div style="font-size: 1.3rem;">${tangenteFormatada}</div>
            </div>
        </div>
    `;

    // Identidades
    explicacao += `<br><br><small>📌 sen² + cos² = ${formatNumber(seno * seno + cosseno * cosseno)}</small>`;

    resultadoDiv.innerHTML = explicacao;
    
    // Salvar no histórico
    if (typeof salvarHistorico === 'function') {
        salvarHistorico('trigonometria', `${angulo}°`, `${formatNumber(seno)}, ${formatNumber(cosseno)}`);
    }
    
    // Rastrear uso (opcional)
    if (typeof window.rastrearCalculo === 'function') {
        window.rastrearCalculo('trigonometria', { angulo, modo: trigMode, seno, cosseno, tangente });
    }
}

// ============================================
// EXPOR PARA GLOBAL (necessário para onclick)
// ============================================
window.toggleTrigMode = toggleTrigMode;
window.calcularTrig = calcularTrig;