/**
 * Script de diagnostic : teste séparément chaque méthode d'accrochage (une toutes les 3s),
 * avec remise à zéro (StopDrag) entre chaque tentative, pour isoler laquelle est réellement nécessaire.
 * Colle ce script dans la console après avoir lancé une recherche CIM10 (résultats visibles).
 * Observe visuellement (curseur "main" collé au texte, ou tout autre indice visuel) après chaque étape.
 */
(function () {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function dispatchMouse(el, type) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const x = Math.max(1, Math.round(rect.left + rect.width / 2));
        const y = Math.max(1, Math.round(rect.top + rect.height / 2));
        const ev = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: type === 'mouseup' || type === 'click' ? 0 : 1
        });
        el.dispatchEvent(ev);
        return ev;
    }

    function parseSetParamIdFromHand(hand) {
        const onclick = String(hand.getAttribute('onclick') || '');
        const m = onclick.match(/SetParamID\s*\(\s*this\s*,\s*event\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'/i);
        if (!m) return null;
        return {
            kind: Number(m[1]),
            id: Number(m[2]),
            label: String(m[3] || '').replace(/\\'/g, "'")
        };
    }

    function resetAccrochage(label) {
        try {
            if (typeof window.StopDrag === 'function') {
                window.StopDrag();
                console.log(`[diag] Réinitialisation via StopDrag() avant "${label}"`);
            } else {
                console.log(`[diag] StopDrag introuvable, pas de réinitialisation avant "${label}"`);
            }
        } catch (e) {
            console.warn('[diag] Échec StopDrag()', e);
        }
    }

    function announce(label) {
        console.log(`\n%c[diag] ÉTAPE EN COURS : ${label}`, 'font-weight:bold;font-size:14px;color:#0a6;');
    }

    async function test() {
        const arbre = document.querySelector('#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10');
        if (!arbre) {
            console.error('[diag] Arbre CIM10 introuvable. Lance une recherche CIM10 avant de relancer ce script.');
            return;
        }
        const hand = arbre.querySelector('img[title="Drag and Drop"]');
        if (!hand) {
            console.error('[diag] Aucune image "Drag and Drop" trouvée.');
            return;
        }
        const params = parseSetParamIdFromHand(hand);
        console.log('[diag] hand:', hand, '/ params extraits:', params);

        try { hand.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}

        // Étape 1 : uniquement un évènement "click" synthétique (déclenche naturellement l'attribut onclick du navigateur)
        resetAccrochage('1 - click synthétique seul');
        announce('1 - click synthétique seul (dispatchMouse click)');
        dispatchMouse(hand, 'click');
        await sleep(3000);

        // Étape 2 : séquence complète mouseover/mousemove/mousedown/mouseup/click
        resetAccrochage('2 - séquence souris complète');
        announce('2 - séquence souris complète (mouseover/mousemove/mousedown/mouseup/click)');
        dispatchMouse(hand, 'mouseover');
        dispatchMouse(hand, 'mousemove');
        dispatchMouse(hand, 'mousedown');
        dispatchMouse(hand, 'mouseup');
        dispatchMouse(hand, 'click');
        await sleep(3000);

        // Étape 3 : appel direct de hand.onclick (sans dispatch d'évènement du tout)
        resetAccrochage('3 - appel direct hand.onclick');
        announce('3 - appel direct hand.onclick (aucun évènement dispatché)');
        try {
            if (typeof hand.onclick === 'function') {
                hand.onclick.call(hand, { type: 'click' });
                console.log('[diag] hand.onclick appelé avec succès');
            } else {
                console.warn('[diag] hand.onclick n\'est pas une fonction :', typeof hand.onclick);
            }
        } catch (e) {
            console.warn('[diag] Échec appel hand.onclick', e);
        }
        await sleep(3000);

        // Étape 4 : appel direct de window.SetParamID (sans dispatch d'évènement ni onclick)
        resetAccrochage('4 - appel direct window.SetParamID');
        announce('4 - appel direct window.SetParamID (aucun évènement, aucun onclick)');
        try {
            if (params && typeof window.SetParamID === 'function') {
                window.SetParamID(hand, { type: 'click' }, params.kind, params.id, params.label);
                console.log('[diag] window.SetParamID appelé avec succès', params);
            } else {
                console.warn('[diag] window.SetParamID indisponible ou params manquants', { hasSetParamID: typeof window.SetParamID, params });
            }
        } catch (e) {
            console.warn('[diag] Échec appel SetParamID', e);
        }
        await sleep(3000);

        console.log('\n%c[diag] Terminé. Indique-moi après quelle étape (1, 2, 3 ou 4) tu as vu l\'antécédent réellement "accroché" (curseur ou état visuel).', 'font-weight:bold;color:#06c;');
    }

    test();
})();
