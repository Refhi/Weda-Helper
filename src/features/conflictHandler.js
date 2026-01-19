// Injecter un canari pour détecter la présence de l'extension
(function injectCanary() {
  const KNOWN_VERSIONS = {
    'dbdodecalholckdneehnejnipbgalami': 'Weda-Helper Stable',
    'fpdenfdeokgbpclegchejhfmnemcbddi': 'Weda-Helper Beta'
  };
  
  const currentExtensionId = chrome.runtime.id;
  const currentVersion = chrome.runtime.getManifest().version;
  const currentName = KNOWN_VERSIONS[currentExtensionId] || `Extension inconnue (${currentExtensionId})`;  
  const canaryId = `weda-helper-canary-${currentExtensionId}`;
  
  // Rechercher tous les canaris existants (sauf le nôtre)
  const allCanaries = Array.from(document.querySelectorAll('[id^="weda-helper-canary-"]'))
    .filter(canary => canary.id !== canaryId);
  
  if (allCanaries.length > 0) {
    // Conflit détecté
    const conflicts = allCanaries.map(canary => {
      const extensionId = canary.getAttribute('data-extension-id');
      const version = canary.getAttribute('data-version');
      const name = KNOWN_VERSIONS[extensionId] || `Extension inconnue (${extensionId})`;
      return { extensionId, version, name };
    });
    
    console.error(`⚠️ CONFLIT DÉTECTÉ: ${conflicts.length} autre(s) version(s) de Weda-Helper active(s) sur cette page!`);
    conflicts.forEach(conflict => {
      console.error(`  - ${conflict.name} (v${conflict.version})`);
    });
    console.error(`  - ${currentName} (v${currentVersion}) [CETTE EXTENSION]`);
    
    // Afficher un bandeau d'avertissement
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
      padding: 15px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease-out;
    `;
    
    const conflictList = conflicts.map(c => 
      `<li>${c.name} (v${c.version})</li>`
    ).join('');
    
    banner.innerHTML = `
      ⚠️ CONFLIT D'EXTENSIONS DÉTECTÉ !<br>
      <span style="font-size: 12px; font-weight: normal;">
        Plusieurs versions de Weda-Helper sont actives simultanément :<br>
        <ul style="text-align: left; display: inline-block; margin: 10px 0;">
          ${conflictList}
          <li>${currentName} (v${currentVersion}) <strong>[CETTE EXTENSION]</strong></li>
        </ul>
        <br>
        Cela peut causer des dysfonctionnements graves.<br>
        Désactivez toutes les versions sauf une dans <a href="chrome://extensions" target="_blank" style="color: #fff; text-decoration: underline;">chrome://extensions</a>
      </span>
      <br>
      <button style="margin-top: 10px; padding: 5px 15px; background: white; color: #ff6b6b; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;" 
              onclick="this.parentElement.remove()">
        OK, j'ai compris
      </button>
    `;
    
    // Ajouter l'animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    // Injecter le bandeau dès que possible
    if (document.body) {
      document.body.appendChild(banner);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(banner);
      });
    }
  }
  
  // Injecter notre propre canari
  const canary = document.createElement('div');
  canary.id = canaryId;
  canary.style.display = 'none';
  canary.setAttribute('data-extension-id', currentExtensionId);
  canary.setAttribute('data-version', currentVersion);
  canary.setAttribute('data-name', currentName);
  canary.setAttribute('data-loaded', new Date().toISOString());
  
  // Injecter le canari dès que possible
  if (document.body) {
    document.body.appendChild(canary);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(canary);
    });
  }
  
  console.log(`✅ Canari injecté: ${canary.id} (${currentName} v${currentVersion})`);
})();