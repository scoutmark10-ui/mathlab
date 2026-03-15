// ============================================
// MÓDULO 19: FUNÇÕES PARA PÁGINA DE BOAS-VINDAS
// ============================================

/**
 * initWelcome - Inicializa a página de boas-vindas
 */
export function initWelcome() {
    console.log('👋 Página de boas-vindas inicializada');

    // Criar símbolos matemáticos flutuantes
    criarSimbolosMatematicos();

    // Efeito de hover no card (opcional)
    const card = document.getElementById('welcomeCard');
    if (card) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y * -0.5}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
        });
    }
}

/**
 * criarSimbolosMatematicos - Cria símbolos flutuantes no fundo
 */
function criarSimbolosMatematicos() {
    const symbols = ['∑', '∫', '√', 'π', 'Δ', '∞', 'α', 'β', 'θ', 'λ', '÷', '×', '∂', '≈', '≠', 'log', 'sin', 'cos'];
    const container = document.getElementById('mathSymbols');

    if (!container) return;

    symbols.forEach((sym) => {
        const el = document.createElement('span');
        el.className = 'sym';
        el.textContent = sym;
        el.style.left = Math.random() * 100 + 'vw';
        el.style.animationDuration = (12 + Math.random() * 18) + 's';
        el.style.animationDelay = Math.random() * 20 + 's';
        el.style.fontSize = (0.9 + Math.random() * 1.2) + 'rem';
        container.appendChild(el);
    });
}

/**
 * marcarBoasVindasComoVisto - Registra que o usuário já viu a página inicial
 */
export function marcarBoasVindasComoVisto() {
    localStorage.setItem('mathlab_welcome_seen', 'true');
    console.log('✅ Boas-vindas registradas');
}

// Expor para o global (para uso em onclick no HTML)
window.marcarBoasVindasComoVisto = marcarBoasVindasComoVisto;

// ============================================
// INICIALIZAÇÃO
// ============================================


// Executar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcome);
} else {
    initWelcome();
}

console.log('📦 Módulo de boas-vindas carregado');