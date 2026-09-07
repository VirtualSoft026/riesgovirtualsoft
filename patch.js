const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const replacement = \// --- Inyección del Módulo de Manuales Corporativos ---
    const manualesGrid = document.querySelector('.manuales-grid');
    if (manualesGrid) {
        fetch('manuales_list.json?t=' + Date.now())
            .then(res => res.json())
            .then(manuales => {
                manuales.forEach(item => {
                    const isDeepLink = item.type === 'teams-deep-link';
                    const linkTarget = isDeepLink ? '_self' : '_blank';
                    const relAttr = isDeepLink ? '' : 'rel="noopener noreferrer"';
                    
                    const hoverEffect = "this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.3)'; this.style.borderColor='var(--accent-primary)';";
                    const resetEffect = "this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='var(--glass-border)';";

                    manualesGrid.innerHTML += \\\
                        <a href="\\\" target="\\\" \\\ 
                           class="glass-panel" 
                           style="padding: 18px; display: flex; align-items: center; gap: 15px; text-decoration: none; transition: all 0.2s ease-out; cursor: pointer; border: 1px solid var(--glass-border); border-radius: var(--radius-md);"
                           onmouseover="\\\" 
                           onmouseout="\\\">
                            
                            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class='bx \\\' style="font-size: 26px; color: \\\;"></i>
                            </div>
                            <div style="display: flex; flex-direction: column; text-align: left; overflow: hidden;">
                                <span style="font-size: 15px; color: var(--text-primary); font-weight: 600; margin-bottom: 4px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                                    \\\
                                </span>
                                <span style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
                                    \\\
                                </span>
                            </div>
                        </a>
                    \\\;
                });
            })
            .catch(err => console.error("Error cargando la lista de manuales:", err));
    }
\;

let idx1 = code.indexOf('// --- Inyecci');
let idx2 = code.indexOf('console.error("Error cargando la lista de manuales:", err));', idx1);

if (idx1 !== -1 && idx2 !== -1) {
    idx2 = code.indexOf('}', idx2) + 1;
    code = code.substring(0, idx1) + replacement + code.substring(idx2);
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('Fixed via node');
} else {
    console.log('Indices not found', idx1, idx2);
}
